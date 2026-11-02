export interface ConversationMessage {
    id: string;
    conversationId: string;
    role: | "user" | "assistant" | "system";
    content: string;
    sequenceNumber: number;
    createdAt: Date;
}