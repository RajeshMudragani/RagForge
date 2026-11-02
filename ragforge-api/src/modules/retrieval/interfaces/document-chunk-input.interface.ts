export interface DocumentChunkInput {
    documentId: string;
    content: string;
    chunkIndex: number;
    pageNumber: number | null;
    tokenCount: number | null;
    embedding: number[];
    contentHash: string;
    parentChunkIndex?: number | null;
}