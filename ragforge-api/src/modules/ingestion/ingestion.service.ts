import { createHash } from "crypto";
import { DocumentsRepository } from "../documents/documents.repository.js";
import { DOCUMENT_STATUS, getSupportedDocumentExtension } from "../documents/documents.constants.js";
import { MinioService } from "../../storage/minio/minio.service.js";
import { ExtractionService } from "./extraction.service.js";
import { ChunkingService } from "./chunking.service.js";
import { EmbeddingsService } from "../embeddings/embeddings.service.js";
import { RetrievalRepository } from "../retrieval/retrieval.repository.js";
import { sanitizeText } from "../../common/utils/index.js";
import { NotFoundError } from "../../common/errors/index.js";
import { ContextualEnrichmentService } from "./contextual/contextual-enrichment.service.js";
import { PiiRedactionService } from "./pii/pii-redaction.service.js";
import { logger } from "../../logger/logger.js";
import { publishDocumentStatus } from "../documents/document-events.service.js";
import { env } from "../../config/env.config.js";
import { redis } from "../../config/redis.config.js";

export class IngestionService {
    private readonly documentsRepository = new DocumentsRepository();
    private readonly minioService = new MinioService();
    private readonly extractionService = new ExtractionService();
    private readonly chunkingService = new ChunkingService();
    private readonly embeddingsService = new EmbeddingsService();
    private readonly retrievalRepository = new RetrievalRepository();
    private readonly contextualEnrichment = new ContextualEnrichmentService();
    private readonly piiRedaction = new PiiRedactionService();

    async process(documentId: string) {
        const document = await this.documentsRepository.findByIdInternal(documentId);
        if (!document) throw new NotFoundError("Document");

        if (document.status === DOCUMENT_STATUS.COMPLETED) {
            return { documentId, chunksCreated: 0, status: DOCUMENT_STATUS.COMPLETED };
        }

        await this.documentsRepository.updateStatus(documentId, DOCUMENT_STATUS.PROCESSING);
        publishDocumentStatus({ documentId, tenantId: document.tenantId, status: "PROCESSING" })
            .catch(err => logger.error({ err }, "Failed to publish PROCESSING event"));

        try {
            const buffer = await this.minioService.downloadObjectAsBuffer(document.storageKey);
            const extension = getSupportedDocumentExtension(document.filename);
            if (!extension) {
                throw new Error(`Unsupported document type: ${document.filename}`);
            }
            const rawText = (await this.extractionService.extract(buffer, extension)).text;

            const redactedText = this.piiRedaction.redact(rawText);
            const childChunks = this.chunkingService.chunk(redactedText);

            let enrichedContents: string[];
            if (env.CONTEXTUAL_ENRICHMENT_ENABLED) {
                // Enrich chunks concurrently — limited to avoid overwhelming Ollama
                const CONCURRENCY = env.CONTEXTUAL_ENRICHMENT_CONCURRENCY;
                enrichedContents = new Array(childChunks.length);
                for (let i = 0; i < childChunks.length; i += CONCURRENCY) {
                    const batch = childChunks.slice(i, i + CONCURRENCY);
                    const results = await Promise.all(
                        batch.map(chunk => this.contextualEnrichment.enrich(redactedText, chunk.content))
                    );
                    results.forEach((r, j) => { enrichedContents[i + j] = r; });
                }
            } else {
                enrichedContents = childChunks.map(c => c.content);
            }

            // Batch all embeddings in a single Ollama call
            const embeddings = await this.embeddingsService.generateBatch(enrichedContents);

            const chunkInputs = childChunks.map((chunk, i) => ({
                documentId,
                content: sanitizeText(chunk.content),
                chunkIndex: chunk.chunkIndex,
                pageNumber: null,
                tokenCount: chunk.tokenCount,
                embedding: embeddings[i],
                contentHash: createHash("sha256").update(chunk.content).digest("hex"),
                parentChunkIndex: chunk.parentChunkIndex ?? null,
            }));

            await this.documentsRepository.updateStatus(documentId, DOCUMENT_STATUS.EMBEDDING);
            publishDocumentStatus({ documentId, tenantId: document.tenantId, status: "EMBEDDING" })
                .catch(err => logger.error({ err }, "Failed to publish EMBEDDING event"));

            // Delete stale chunks before inserting new version
            await this.retrievalRepository.deleteChunksByDocumentId(documentId);
            await this.retrievalRepository.addEmbeddings(chunkInputs);

            // Bust retrieval cache for this tenant so new document is immediately searchable
            const pattern = `retrieval:${document.tenantId}:*`;
            const keys = await redis.keys(pattern);
            if (keys.length > 0) await redis.del(keys);

            await this.documentsRepository.updateStatus(documentId, DOCUMENT_STATUS.COMPLETED);
            publishDocumentStatus({
                documentId,
                tenantId: document.tenantId,
                status: "COMPLETED",
                chunksCreated: chunkInputs.length,
            }).catch(err => logger.error({ err }, "Failed to publish document completed event"));

            return { documentId, chunksCreated: chunkInputs.length, status: DOCUMENT_STATUS.COMPLETED };
        } catch (error) {
            await this.documentsRepository.updateStatus(documentId, DOCUMENT_STATUS.FAILED);
            publishDocumentStatus({ documentId, tenantId: document.tenantId, status: "FAILED" })
                .catch(err => logger.error({ err }, "Failed to publish document failed event"));
            throw error;
        }
    }
}
