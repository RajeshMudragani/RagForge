import { RetrievedChunk } from "../retrieval/interfaces/retrieved-chunk.interface.js";
import { ContextCleanerService } from "./context-cleaner.service.js";
import { BuiltContext } from "./interfaces/built-context.interface.js";
import {
    MAX_CONTEXT_CHUNKS,
    MAX_CONTEXT_LENGTH,
    CONTEXT_SEPARATOR,
} from "./context-builder.constants.js";

export class ContextBuilderService {
    private readonly cleaner = new ContextCleanerService();

    build(chunks: RetrievedChunk[]): BuiltContext {
        const contextChunks = chunks.slice(0, MAX_CONTEXT_CHUNKS);
        const context = contextChunks
            .map((chunk, i) => {
                const cleaned = this.cleaner.clean(chunk.content);
                const header = `[Source ${i + 1}: ${chunk.filename}, Chunk #${chunk.chunkIndex + 1}${chunk.pageNumber ? `, Page ${chunk.pageNumber}` : ""}]`;
                return `${header}\n${cleaned}`;
            })
            .join(CONTEXT_SEPARATOR)
            .slice(0, MAX_CONTEXT_LENGTH);

        const sources = contextChunks.map(chunk => ({
            documentId: chunk.documentId,
            filename: chunk.filename,
            chunkIndex: chunk.chunkIndex,
            similarity: chunk.similarity,
            keywordScore: chunk.keywordScore,
            hybridScore: chunk.hybridScore,
        }));

        return { context, sources };
    }
}
