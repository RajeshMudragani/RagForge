import { createHash } from "node:crypto";
import { CacheService } from "../cache/cache.service.js";
import {
    embeddingCacheHits,
    embeddingCacheMisses,
    embeddingLatencyMs,
} from "../metrics/metrics.registry.js";
import {
    EMBEDDING_MODEL,
    EXPECTED_EMBEDDING_DIMENSION,
} from "./embeddings.constants.js";
import { EmbeddingsClient } from "./embeddings.client.js";
import { GenerateEmbeddingResult } from "./embeddings.types.js";

const EMBEDDING_CACHE_TTL_SECONDS = 86_400;
const EMBEDDING_BATCH_SIZE = 32;

export class EmbeddingsService {
    private readonly client = new EmbeddingsClient();
    private readonly cache = new CacheService();

    async generate(text: string): Promise<GenerateEmbeddingResult> {
        const [embedding] = await this.generateBatch([text]);
        return { embedding, dimensions: embedding.length };
    }

    async generateBatch(texts: string[]): Promise<number[][]> {
        if (texts.length === 0) return [];

        const results: (number[] | undefined)[] = new Array(texts.length);
        const missing: number[] = [];

        await Promise.all(texts.map(async (text, index) => {
            const cached = await this.cache.get<GenerateEmbeddingResult>(this.cacheKey(text));
            if (
                cached &&
                cached.dimensions === EXPECTED_EMBEDDING_DIMENSION &&
                cached.embedding.length === EXPECTED_EMBEDDING_DIMENSION
            ) {
                results[index] = cached.embedding;
                embeddingCacheHits.inc();
            } else {
                missing.push(index);
            }
        }));

        embeddingCacheMisses.inc(missing.length);

        for (let offset = 0; offset < missing.length; offset += EMBEDDING_BATCH_SIZE) {
            const batchIndices = missing.slice(offset, offset + EMBEDDING_BATCH_SIZE);
            const endTimer = embeddingLatencyMs.startTimer();
            let embeddings: number[][];
            try {
                embeddings = (await this.client.embed(batchIndices.map(index => texts[index]))).embeddings;
            } finally {
                endTimer();
            }

            await Promise.all(batchIndices.map(async (originalIndex, batchIndex) => {
                const embedding = embeddings[batchIndex];
                results[originalIndex] = embedding;
                await this.cache.set(
                    this.cacheKey(texts[originalIndex]),
                    { embedding, dimensions: embedding.length },
                    EMBEDDING_CACHE_TTL_SECONDS,
                );
            }));
        }

        return results.map((embedding, index) => {
            if (!embedding) {
                throw new Error(`Embedding generation did not return a result for input ${index}`);
            }
            return embedding;
        });
    }

    private cacheKey(text: string): string {
        const hash = createHash("sha256").update(text).digest("hex");
        return `emb:${EMBEDDING_MODEL}:${EXPECTED_EMBEDDING_DIMENSION}:${hash}`;
    }
}
