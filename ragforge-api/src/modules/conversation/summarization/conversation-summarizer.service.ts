import { LlmFactory } from "../../llm/llm.factory.js";
import { ChatMessage } from "../../chat/interfaces/chat-message.interface.js";

const SUMMARY_THRESHOLD = 10; // summarize when history exceeds this
const KEEP_RECENT = 4;        // always keep last N messages verbatim

const SUMMARIZE_PROMPT = (history: string) =>
    `Summarize the following conversation in 2-3 sentences, capturing the key topics discussed and any important context needed to continue the conversation.

CONVERSATION:
${history}

Return ONLY the summary, no labels or headings.`;

export class ConversationSummarizerService {
    private readonly llm = LlmFactory.createWithFallback();

    async summarizeIfNeeded(messages: ChatMessage[]): Promise<ChatMessage[]> {
        if (messages.length <= SUMMARY_THRESHOLD) return messages;

        const toSummarize = messages.slice(0, messages.length - KEEP_RECENT);
        const recent = messages.slice(messages.length - KEEP_RECENT);

        const historyText = toSummarize
            .map(m => `${m.role.toUpperCase()}: ${m.content}`)
            .join("\n");

        try {
            const summary = await this.llm.generate(SUMMARIZE_PROMPT(historyText));
            const summaryMessage: ChatMessage = {
                role: "assistant",
                content: `[Conversation summary: ${summary.trim()}]`,
                timestamp: toSummarize[0].timestamp,
            };
            return [summaryMessage, ...recent];
        } catch {
            // fallback: just keep recent messages
            return recent;
        }
    }
}
