export interface Chunk {
    content: string;
    chunkIndex: number;
    tokenCount: number;
    parentChunkIndex?: number | null;
}