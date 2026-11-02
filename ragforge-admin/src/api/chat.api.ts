import api from "./client";
import type {
    Conversation,
    ConversationWithMessages,
    ChatResponse,
    ApiResponse,
    PaginatedResponse,
    PromptType,
    FeedbackPayload,
} from "../types";

export const chatApi = {
    // ── Blocking chat ──────────────────────────────────────────────────────────
    send: (
        question: string,
        options?: {
            topK?: number;
            promptType?: PromptType;
            conversationId?: string;
            collectionName?: string;
        },
    ) =>
        api.post<ApiResponse<ChatResponse>>("/chat", {
            question,
            topK: options?.topK ?? 5,
            promptType: options?.promptType ?? "default",
            conversationId: options?.conversationId,
            collectionName: options?.collectionName,
        }),

    // ── Stream URL (for EventSource / fetch SSE) ───────────────────────────────
    getStreamUrl: () => (import.meta.env.VITE_API_URL ?? "/api/v1") + "/chat/stream",

    // ── Conversations ─────────────────────────────────────────────────────────
    listConversations: (page = 1, pageSize = 30, search?: string) => {
        const params: Record<string, string | number> = { page, pageSize };
        if (search) params.search = search;
        return api.get<ApiResponse<PaginatedResponse<Conversation>>>("/conversations", { params });
    },

    getConversation: (id: string) =>
        api.get<ApiResponse<ConversationWithMessages>>(`/conversations/${id}`),

    renameConversation: (id: string, title: string) =>
        api.patch<ApiResponse<Conversation>>(`/conversations/${id}`, { title }),

    deleteConversation: (id: string) =>
        api.delete(`/conversations/${id}`),

    // ── Feedback ──────────────────────────────────────────────────────────────
    submitFeedback: (payload: FeedbackPayload) =>
        api.post("/feedback", payload),
};
