import { LlmFactory } from "../llm/llm.factory.js";
import { OllamaService } from "../llm/ollama.provider.js";

export class RerankerProvider {

    private readonly ollama = new OllamaService();
    private readonly llm = LlmFactory.create();

    async rerank(
        prompt: string,
    ): Promise<string> {

        return this.ollama.generate(
            prompt,
        );
    }
}