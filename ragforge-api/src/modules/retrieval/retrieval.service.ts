import { createHash } from "crypto";
import { EmbeddingsService } from "../embeddings/embeddings.service.js";
import { RetrievalRepository } from "./retrieval.repository.js";
import { RetrievedChunk } from "./interfaces/retrieved-chunk.interface.js";
import { RerankerService } from "../reranker/reranker.service.js";
import { ContextBuilderService } from "../context-builder/context-builder.service.js";
import {
    MIN_SIMILARITY,
    MIN_HYBRID_SCORE,
    RRF_K,
} from "./retrieval.constants.js";
import { CollectionsService } from "../collections/collections.service.js";
import {
    DEFAULT_RERANK_CANDIDATES,
    RERANK_CANDIDATE_MULTIPLIER,
} from "../reranker/reranker.constants.js";
import { retrievalLatencyMs, hybridScoreHistogram } from "../metrics/metrics.registry.js";
import { HyDEService } from "../hyde/hyde.service.js";
import { CacheService } from "../cache/cache.service.js";
import { BuiltContext } from "../context-builder/interfaces/built-context.interface.js";
import { logger } from "../../logger/logger.js";

const RETRIEVAL_CACHE_TTL = 300;
// Cache version — bump when retrieval logic changes to auto-invalidate stale entries
const CACHE_VERSION = "v2";

export class RetrievalService {
    private readonly embeddingsService = new EmbeddingsService();
    private readonly repository = new RetrievalRepository();
    private readonly contextBuilder = new ContextBuilderService();
    private readonly collectionsService = new CollectionsService();
    private readonly rerankerService = new RerankerService();
    private readonly hydeService = new HyDEService();
    private readonly cache = new CacheService();

    async search(
        query: string,
        limit: number,
        tenantId: string,
        collectionName?: string,
        metadata?: Record<string, string>,
    ): Promise<RetrievedChunk[]> {
        return this.hybridSearch(query, limit, tenantId, collectionName, metadata, true, false);
    }

    async searchWithoutRerank(
        query: string,
        limit: number,
        tenantId: string,
        collectionName?: string,
        metadata?: Record<string, string>,
    ): Promise<RetrievedChunk[]> {
        return this.hybridSearch(query, limit, tenantId, collectionName, metadata, false, false);
    }

    async retrieveContext(
        query: string,
        limit: number,
        tenantId: string,
        collectionName?: string,
        metadata?: Record<string, string>,
        useHyDE = false,
    ) {
        const cacheKey = `retrieval:${CACHE_VERSION}:${tenantId}:${createHash("sha256").update(`${query}:${limit}:${collectionName ?? ""}:${JSON.stringify(metadata ?? {})}`).digest("hex")}`;
        const cached = await this.cache.get<BuiltContext>(cacheKey);
        if (cached) return cached;

        const chunks = await this.hybridSearch(query, limit, tenantId, collectionName, metadata, false, useHyDE);

        // Only expand to parent chunks when the document has a real parent-child structure
        // (child's parentChunkIndex differs from its own chunkIndex)
        const hasRealParents = chunks.some(
            c => (c as RetrievedChunk & { parentChunkIndex?: number | null }).parentChunkIndex != null &&
                 (c as RetrievedChunk & { parentChunkIndex?: number | null }).parentChunkIndex !== c.chunkIndex,
        );
        const finalChunks = hasRealParents ? await this.expandToParentChunks(chunks) : chunks;

        const result = this.contextBuilder.build(finalChunks);

        await this.cache.set(cacheKey, result, RETRIEVAL_CACHE_TTL);
        return result;
    }

    private async expandToParentChunks(chunks: RetrievedChunk[]): Promise<RetrievedChunk[]> {
        const byDoc = new Map<string, { chunk: RetrievedChunk; parentIdx: number }[]>();
        const noParent: RetrievedChunk[] = [];

        chunks.forEach(chunk => {
            const parentIdx = (chunk as RetrievedChunk & { parentChunkIndex?: number | null }).parentChunkIndex;
            if (parentIdx != null && parentIdx !== chunk.chunkIndex) {
                const list = byDoc.get(chunk.documentId) ?? [];
                list.push({ chunk, parentIdx });
                byDoc.set(chunk.documentId, list);
            } else {
                noParent.push(chunk);
            }
        });

        const expanded: RetrievedChunk[] = [...noParent];

        await Promise.all(
            Array.from(byDoc.entries()).map(async ([documentId, items]) => {
                const parentIndices = [...new Set(items.map(i => i.parentIdx))];
                const parentMap = await this.repository.fetchParentChunks(documentId, parentIndices);
                const seen = new Set<number>();
                items.forEach(({ chunk, parentIdx }) => {
                    if (seen.has(parentIdx)) return;
                    seen.add(parentIdx);
                    const parentContent = parentMap.get(parentIdx);
                    expanded.push(parentContent ? { ...chunk, content: parentContent } : chunk);
                });
            }),
        );

        return expanded.sort((a, b) => (b.hybridScore ?? 0) - (a.hybridScore ?? 0));
    }

    private async hybridSearch(
        query: string,
        limit: number,
        tenantId: string,
        collectionName?: string,
        metadata?: Record<string, string>,
        shouldRerank = true,
        useHyDE = false,
    ) {
        const endTimer = retrievalLatencyMs.startTimer();

        let collectionId: string | undefined;
        if (collectionName) {
            const collection = await this.collectionsService.findByName(tenantId, collectionName);
            collectionId = collection?.id;
        }

        const documentIds = await this.repository.findMatchingDocumentIds(tenantId, collectionId, metadata);

        const [embeddingResult, hydeEmbedding] = await Promise.all([
            this.embeddingsService.generate(query),
            useHyDE ? this.hydeService.generateQueryEmbedding(query).catch(() => null) : Promise.resolve(null),
        ]);

        const queryEmbedding = hydeEmbedding
            ? embeddingResult.embedding.map((v, i) => (v + hydeEmbedding[i]) / 2)
            : embeddingResult.embedding;

        const rerankCandidateCount = Math.max(
            limit * RERANK_CANDIDATE_MULTIPLIER,
            DEFAULT_RERANK_CANDIDATES,
        );

        const [vectorResults, keywordResults] = await Promise.all([
            this.repository.similaritySearch(tenantId, queryEmbedding, rerankCandidateCount, documentIds)
                .then(results => results),
            this.repository.keywordSearch(tenantId, query, rerankCandidateCount, documentIds),
        ]);

        const merged = this.rrfMerge(vectorResults, keywordResults).filter(() => true)

        if (merged.length > 0) {
            hybridScoreHistogram.observe(merged[0].hybridScore ?? 0);
        }

        endTimer();

        // Reranker disabled — Ollama-based reranking adds too much latency
        return merged.slice(0, limit);
    }

    // Reciprocal Rank Fusion — rank-based merging avoids scale mismatch between
    // cosine similarity scores and BM25 keyword scores
    private rrfMerge(
        vectorResults: RetrievedChunk[],
        keywordResults: RetrievedChunk[],
    ): RetrievedChunk[] {
        const scores = new Map<string, { chunk: RetrievedChunk; score: number }>();

        vectorResults.forEach((chunk, rank) => {
            const key = `${chunk.documentId}-${chunk.chunkIndex}`;
            const rrf = 1 / (RRF_K + rank + 1);
            scores.set(key, { chunk, score: rrf });
        });

        keywordResults.forEach((chunk, rank) => {
            const key = `${chunk.documentId}-${chunk.chunkIndex}`;
            const rrf = 1 / (RRF_K + rank + 1);
            const existing = scores.get(key);
            if (existing) {
                existing.score += rrf;
            } else {
                scores.set(key, { chunk, score: rrf });
            }
        });

        return Array.from(scores.values())
            .sort((a, b) => b.score - a.score)
            .map(({ chunk, score }) => ({ ...chunk, hybridScore: score }));
    }
}