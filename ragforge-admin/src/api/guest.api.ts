import axios from "axios";
import type { ApiResponse, ChatResponse, ChatSource, ConversationWithMessages, Document } from "../types";

const BASE_URL = import.meta.env.VITE_API_URL ?? "/api/v1";
const guestApi = axios.create({
    baseURL: BASE_URL,
    timeout: 120_000,
});

export interface GuestSession {
    token: string;
    expiresAt: string;
}

export interface GuestStreamResult {
    answer: string;
    conversationId: string;
    sources: ChatSource[];
}

function getErrorMessage(payload: unknown): string | undefined {
    if (typeof payload !== "object" || payload === null) return undefined;
    if ("message" in payload && typeof payload.message === "string") return payload.message;
    if (!("error" in payload)) return undefined;
    const error = payload.error;
    if (typeof error !== "object" || error === null || !("message" in error)) return undefined;
    return typeof error.message === "string" ? error.message : undefined;
}

export const guestApiClient = {
    createSession: () =>
        guestApi.post<ApiResponse<GuestSession>>("/guest/session"),

    listDocuments: (token: string) =>
        guestApi.get<ApiResponse<Document[]>>("/guest/documents", {
            headers: { Authorization: `Bearer ${token}` },
        }),

    deleteDocument: (token: string, id: string) =>
        guestApi.delete<ApiResponse<{ deleted: boolean }>>(`/guest/documents/${id}`, {
            headers: { Authorization: `Bearer ${token}` },
        }),

    deleteAllData: (token: string) =>
        guestApi.delete<ApiResponse<{ deleted: boolean }>>("/guest/session/data", {
            headers: { Authorization: `Bearer ${token}` },
        }),

    upload: (token: string, file: File) => {
        const form = new FormData();
        form.append("file", file);
        return guestApi.post<ApiResponse<Document>>("/guest/documents/upload", form, {
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "multipart/form-data",
            },
            timeout: 5 * 60 * 1000,
        });
    },

    chat: (token: string, question: string, conversationId?: string) =>
        guestApi.post<ApiResponse<ChatResponse>>("/guest/chat", {
            question,
            conversationId,
            promptType: "strict",
            topK: 5,
        }, {
            headers: { Authorization: `Bearer ${token}` },
        }),

    streamChat: async (
        token: string,
        question: string,
        onToken: (token: string) => void,
        conversationId?: string,
        signal?: AbortSignal,
    ): Promise<GuestStreamResult> => {
        const response = await fetch(`${BASE_URL}/guest/chat/stream`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
                question,
                conversationId,
                promptType: "strict",
                topK: 5,
            }),
            signal,
        });

        if (!response.ok) {
            let message: string | undefined;
            try {
                message = getErrorMessage(await response.json());
            } catch {
                message = undefined;
            }
            throw new Error(message ?? "The request failed. Please try again.");
        }
        if (!response.headers.get("content-type")?.includes("text/event-stream")) {
            throw new Error("The guest chat endpoint did not return a stream. Restart the API and try again.");
        }
        if (!response.body) {
            throw new Error("The server did not provide a chat stream.");
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let result: GuestStreamResult | undefined;
        let streamedAnswer = "";

        const processEvent = (frame: string) => {
            let event = "message";
            const data: string[] = [];

            for (const line of frame.split(/\r?\n/)) {
                if (line.startsWith("event:")) {
                    event = line.slice("event:".length).trim();
                } else if (line.startsWith("data:")) {
                    data.push(line.slice("data:".length).trimStart());
                }
            }

            if (data.length === 0) return;
            const payload: unknown = JSON.parse(data.join("\n"));

            if (event === "token" && typeof payload === "string") {
                streamedAnswer += payload;
                onToken(payload);
            } else if (event === "done" && typeof payload === "object" && payload !== null) {
                const done = payload as Partial<GuestStreamResult>;
                if (
                    typeof done.answer !== "string" ||
                    typeof done.conversationId !== "string" ||
                    !Array.isArray(done.sources)
                ) {
                    throw new Error("The server returned incomplete chat stream metadata.");
                }
                result = {
                    answer: done.answer || streamedAnswer,
                    conversationId: done.conversationId,
                    sources: done.sources,
                };
            } else if (event === "error") {
                const message = getErrorMessage(payload) ?? "Unable to complete the chat response.";
                const requestId =
                    typeof payload === "object" &&
                    payload !== null &&
                    "requestId" in payload &&
                    typeof payload.requestId === "string"
                        ? payload.requestId
                        : undefined;
                throw new Error(requestId ? `${message} (Reference: ${requestId})` : message);
            }
        };

        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                let boundary = buffer.search(/\r?\n\r?\n/);
                while (boundary !== -1) {
                    const frame = buffer.slice(0, boundary);
                    const delimiter = buffer.slice(boundary).match(/^\r?\n\r?\n/)?.[0] ?? "\n\n";
                    buffer = buffer.slice(boundary + delimiter.length);
                    processEvent(frame);
                    boundary = buffer.search(/\r?\n\r?\n/);
                }
            }

            buffer += decoder.decode();
            if (buffer.trim()) processEvent(buffer);
            if (!result) throw new Error("The chat stream ended before completion.");
            return result;
        } finally {
            reader.releaseLock();
        }
    },

    getConversation: (token: string, id: string) =>
        guestApi.get<ApiResponse<ConversationWithMessages>>(`/guest/conversations/${id}`, {
            headers: { Authorization: `Bearer ${token}` },
        }),
};
