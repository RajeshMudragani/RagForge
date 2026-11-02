import { Chunk } from "./interfaces/chunk.interface.js";
import { CHUNK_SIZE, CHUNK_OVERLAP, CHILD_CHUNK_SIZE, CHILD_CHUNK_OVERLAP, TOKEN_ESTIMATE_DIVISOR } from "./ingestion.constants.js";

export class ChunkingService {
    chunk(text: string): Chunk[] {
        const normalized = this.normalize(text);
        const parents = this.splitSemantic(normalized, CHUNK_SIZE, CHUNK_OVERLAP);
        const children: Chunk[] = [];

        parents.forEach((parent, parentIndex) => {
            const childSlices = this.splitSemantic(parent, CHILD_CHUNK_SIZE, CHILD_CHUNK_OVERLAP);
            childSlices.forEach(childContent => {
                children.push({
                    content: childContent,
                    chunkIndex: children.length,
                    tokenCount: this.estimateTokens(childContent),
                    parentChunkIndex: parentIndex,
                });
            });
        });

        return children;
    }

    getParentChunks(text: string): string[] {
        return this.splitSemantic(this.normalize(text), CHUNK_SIZE, CHUNK_OVERLAP);
    }

    private normalize(text: string): string {
        return text
            .replace(/\r/g, "")
            .replace(/\t/g, " ")
            .replace(/\n{3,}/g, "\n\n")
            // Strip "Interview Line:" metadata noise before chunking
            .replace(/^Interview Line:.*$/gm, "")
            .replace(/\n{3,}/g, "\n\n")
            .trim();
    }

    // Splits at sentence boundaries to avoid cutting mid-sentence
    private splitSemantic(text: string, size: number, overlap: number): string[] {
        // First try to split on Q&A boundaries if document appears to be Q&A format
        const qaPattern = /(?=^Q[:：]\s)/m;
        if (qaPattern.test(text)) {
            return this.splitOnQABoundaries(text, size, overlap);
        }

        const sentences = this.splitIntoSentences(text);
        const chunks: string[] = [];
        let current = "";

        for (const sentence of sentences) {
            if (current.length + sentence.length > size && current.length > 0) {
                chunks.push(current.trim());
                const words = current.split(" ");
                let overlapText = "";
                for (let i = words.length - 1; i >= 0; i--) {
                    const candidate = words.slice(i).join(" ");
                    if (candidate.length >= overlap) break;
                    overlapText = candidate;
                }
                current = overlapText ? overlapText + " " + sentence : sentence;
            } else {
                current = current ? current + " " + sentence : sentence;
            }
        }

        if (current.trim()) chunks.push(current.trim());
        return chunks;
    }

    private splitOnQABoundaries(text: string, size: number, overlap: number): string[] {
        // Split into individual Q&A blocks
        const blocks = text.split(/(?=^Q[:：]\s)/m).map(b => b.trim()).filter(b => b.length > 0);
        const chunks: string[] = [];
        let current = "";

        for (const block of blocks) {
            // If a single Q&A block exceeds size, split it semantically
            if (block.length > size) {
                if (current.trim()) { chunks.push(current.trim()); current = ""; }
                const subChunks = this.splitBySentences(block, size, overlap);
                chunks.push(...subChunks);
                continue;
            }
            // Pack Q&A blocks together up to size limit
            if (current.length + block.length > size && current.length > 0) {
                chunks.push(current.trim());
                current = block;
            } else {
                current = current ? current + "\n\n" + block : block;
            }
        }

        if (current.trim()) chunks.push(current.trim());
        return chunks;
    }

    private splitBySentences(text: string, size: number, overlap: number): string[] {
        const sentences = this.splitIntoSentences(text);
        const chunks: string[] = [];
        let current = "";
        for (const sentence of sentences) {
            if (current.length + sentence.length > size && current.length > 0) {
                chunks.push(current.trim());
                current = sentence;
            } else {
                current = current ? current + " " + sentence : sentence;
            }
        }
        if (current.trim()) chunks.push(current.trim());
        return chunks;
    }

    private splitIntoSentences(text: string): string[] {
        // Split on sentence-ending punctuation followed by whitespace + capital letter
        // Avoids splitting on abbreviations like V8, libuv, e.g., i.e.
        return text
            .split(/(?<=[.!?])\s+(?=[A-Z])|\n\n/)
            .map(s => s.trim())
            .filter(s => s.length > 0);
    }

    private estimateTokens(text: string): number {
        return Math.ceil(text.length / TOKEN_ESTIMATE_DIVISOR);
    }
}
