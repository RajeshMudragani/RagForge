import { LlmFactory } from "../llm/llm.factory.js";
import { ChatMessage } from "../chat/interfaces/chat-message.interface.js";
import { QUERY_REWRITE_PROMPT } from "./prompts/rewrite.prompt.js";
import {
    QUERY_REWRITE_HISTORY_LIMIT,
    QUERY_REWRITE_SHORT_QUERY_THRESHOLD,
    QUERY_REWRITE_MIN_LENGTH,
    QUERY_REWRITE_MAX_LENGTH,
} from "./query-rewriter.constants.js";
import { queryRewriterFired } from "../metrics/metrics.registry.js";

export class QueryRewriterService {
    private readonly llm = LlmFactory.createWithFallback();

    async rewrite(question: string, history: ChatMessage[]): Promise<string> {
        if (history.length === 0 || question.length > QUERY_REWRITE_SHORT_QUERY_THRESHOLD) {
            return question;
        }

        const historyText = history
            .slice(-QUERY_REWRITE_HISTORY_LIMIT)
            .map(message => `${message.role.toUpperCase()}: ${message.content}`)
            .join("\n");

        const prompt = QUERY_REWRITE_PROMPT
            .replace("{{HISTORY}}", historyText)
            .replace("{{QUESTION}}", question);

        const rewrittenQuery = await this.llm.generate(prompt);

        const cleaned = rewrittenQuery
            .replace(/"/g, "")
            .replace(/^Output:/i, "")
            .replace(/^Rewritten Query:/i, "")
            .trim();

        if (cleaned.length < QUERY_REWRITE_MIN_LENGTH || cleaned.length > QUERY_REWRITE_MAX_LENGTH) {
            return question;
        }

        queryRewriterFired.inc();
        return cleaned;
    }
}
