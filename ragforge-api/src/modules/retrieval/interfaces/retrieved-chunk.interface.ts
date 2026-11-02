export interface RetrievedChunk {
    id: string;
    documentId: string;
    filename: string;
    content: string;
    chunkIndex: number;
    pageNumber: number | null;
    tokenCount: number | null;
    similarity: number;
    keywordScore?: number;
    hybridScore?: number;
}