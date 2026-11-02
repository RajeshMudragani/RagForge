import { PromptType } from "../chat.constants.js";

export interface ChatResponse {
    answer: string;
    conversationId: string;
    promptType: PromptType;
    rewrittenQuery?: string;
    sources: {
        documentId: string;
        filename: string;
        chunkIndex: number;
        similarity: number;
        hybridScore?: number;
        keywordScore?: number;
    }[];
}