import { LlmFactory } from "../llm/llm.factory.js";
import { CONVERSATION_TITLE_PROMPT } from "./prompts/title-generator.prompt.js";

export class ConversationTitleGeneratorService {

    private readonly llm = LlmFactory.createWithFallback();

    async generate(question: string): Promise<string> {
        try {
            const prompt = CONVERSATION_TITLE_PROMPT.replace("{{QUESTION}}", question);
            const response = await this.llm.generate(prompt);
            const title = response
                .trim()
                .replace(/^["']/, "")
                .replace(/["']$/, "")
                .replace(/\n/g, "")
                .slice(0, 60);
            return title || this.fallbackTitle(question);
        } catch {
            return this.fallbackTitle(question);
        }
    }

    private fallbackTitle(question: string): string {
        return question.trim().replace(/\?$/, "").replace(/\s+/g, " ").slice(0, 60);
    }
}
