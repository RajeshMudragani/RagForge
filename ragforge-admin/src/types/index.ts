export interface User {
    sub: string;
    email: string;
    role: "USER" | "ADMIN";
    tenantId: string;
    firstName?: string;
    lastName?: string;
}

export interface AuthTokens {
    accessToken: string;
    refreshToken: string;
    user: User;
}

export type DocumentStatus = "PENDING" | "PROCESSING" | "EMBEDDING" | "READY" | "FAILED";

export interface Document {
    id: string;
    filename: string;
    mimeType: string;
    storageKey?: string;
    status: DocumentStatus;
    progress?: number;
    collectionId?: string | null;
    collectionName?: string | null;
    summary?: string | null;
    shortSummary?: string | null;
    keyTopics?: string[] | null;
    keywords?: string[] | null;
    summaryStatus?: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED" | null;
    metadata?: Record<string, string>;
    createdAt: string;
    updatedAt: string;
}

export interface DocumentSummaryItem {
    documentId: string;
    filename: string;
    summary: string | null;
    shortSummary: string | null;
    keyTopics: string[] | null;
    keywords: string[] | null;
    summaryStatus: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED" | null;
}

export interface Collection {
    id: string;
    name: string;
    description: string | null;
    tenantId: string;
    createdAt: string;
    updatedAt?: string;
}

export interface CollectionStats {
    documentCount: number;
    chunkCount: number;
}

export interface Message {
    id: string;
    role: "user" | "assistant";
    content: string;
    createdAt: string;
    sources?: ChatSource[];
    isStreaming?: boolean;
}

export interface Conversation {
    id: string;
    title: string | null;
    tenantId: string;
    createdAt: string;
    updatedAt: string;
}

export interface ConversationWithMessages {
    conversation: Conversation;
    messages: Message[];
}

export interface ChatSource {
    documentId: string;
    filename: string;
    chunkIndex: number;
    similarity: number;
    hybridScore?: number;
    keywordScore?: number;
}

export interface ChatResponse {
    answer: string;
    conversationId: string;
    promptType: string;
    rewrittenQuery?: string;
    sources: ChatSource[];
}

export interface PaginatedResponse<T> {
    items: T[];
    page: number;
    pageSize: number;
    total: number;
}

export interface ApiResponse<T> {
    success: boolean;
    data: T;
    message?: string;
    error?: {
        code: string;
        message: string;
        details?: { path: string[]; message: string }[];
    };
}

export type PromptType = "default" | "strict" | "concise";

export interface FeedbackPayload {
    question: string;
    answer: string;
    rating: "UP" | "DOWN";
    conversationId?: string;
    comment?: string;
}
