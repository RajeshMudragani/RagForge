import { LlmFactory } from "../llm/llm.factory.js";

export class RerankerProvider {
    private readonly llm = LlmFactory.create();

    async rerank(
        prompt: string,
    ): Promise<string> {

        return this.llm.generate(
            prompt,
        );
    }
}