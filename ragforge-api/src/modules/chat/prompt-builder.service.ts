import { PromptType, PROMPT_HISTORY_LIMIT } from "./chat.constants.js";
import { ChatMessage } from "./interfaces/chat-message.interface.js";
import { DEFAULT_RAG_PROMPT, STRICT_RAG_PROMPT, CONCISE_RAG_PROMPT } from "./prompts/index.js";

export class PromptBuilderService {
    build(
        question: string,
        context: string,
        history: ChatMessage[],
        type: PromptType,
    ): string {
        const template = this.getTemplate(type);
        const conversationHistory = this.buildHistory(history);

        return template
            .replace("{{HISTORY}}", conversationHistory)
            .replace("{{CONTEXT}}", context)
            .replace("{{QUESTION}}", question);
    }

    private getTemplate(type: PromptType): string {
        switch (type) {
            case PromptType.STRICT:
                return STRICT_RAG_PROMPT;
            case PromptType.CONCISE:
                return CONCISE_RAG_PROMPT;
            default:
                return DEFAULT_RAG_PROMPT;
        }
    }

    private buildHistory(history: ChatMessage[]): string {
        if (history.length === 0) {
            return "No previous conversation.";
        }

        return history
            .slice(-PROMPT_HISTORY_LIMIT)
            .map(message => `${message.role.toUpperCase()}: ${message.content}`)
            .join("\n");
    }
}
