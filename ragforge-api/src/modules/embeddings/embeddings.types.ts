export interface EmbedResponse {
    model: string;
    embeddings: number[][];
}

export interface GenerateEmbeddingResult {
    embedding: number[];
    dimensions: number;
}
