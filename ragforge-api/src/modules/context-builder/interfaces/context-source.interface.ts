export interface ContextSource {
    documentId: string;
    filename: string;
    chunkIndex: number;
    similarity: number;
    keywordScore?: number;
    hybridScore?: number;
}