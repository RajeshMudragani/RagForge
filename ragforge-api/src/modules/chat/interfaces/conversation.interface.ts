import { ChatMessage } from "./chat-message.interface.js";

export interface ConversationHistory {
    conversationId: string;
    messages: ChatMessage[];
}