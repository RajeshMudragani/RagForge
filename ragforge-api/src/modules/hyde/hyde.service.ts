import { LlmFactory } from "../llm/llm.factory.js";
import { EmbeddingsService } from "../embeddings/embeddings.service.js";

const HYDE_PROMPT = (question: string) =>
    `Write a short, factual passage (2-4 sentences) that directly answers this question. Output only the passage, no preamble.\n\nQuestion: ${question}`;

export class HyDEService {
    private readonly llm = LlmFactory.createWithFallback();
    private readonly embeddings = new EmbeddingsService();

    async generateQueryEmbedding(question: string): Promise<number[]> {
        const hypothesis = await this.llm.generate(HYDE_PROMPT(question));
        const result = await this.embeddings.generate(hypothesis.trim());
        return result.embedding;
    }
}
