import { useState, useCallback, useRef } from "react";
import type { Message, ChatSource, PromptType } from "../types";
import { chatApi } from "../api/chat.api";

interface UseChatOptions {
    conversationId?: string;
    collectionName?: string;
    promptType?: PromptType;
    topK?: number;
    onConversationCreated?: (id: string, firstMessage: string) => void;
    onTitleReady?: (id: string, title: string) => void;
}

const PLACEHOLDER_ID = "__streaming__";

export function useChat(options: UseChatOptions = {}) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [isStreaming, setIsStreaming] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [currentConversationId, setCurrentConversationId] = useState<string | undefined>(
        options.conversationId,
    );

    const abortRef = useRef<AbortController | null>(null);
    const conversationIdRef = useRef<string | undefined>(options.conversationId);
    const accessToken = localStorage.getItem("accessToken");

    const optionsRef = useRef(options);
    optionsRef.current = options;

    const setConversationId = useCallback((id: string | undefined) => {
        conversationIdRef.current = id;
        setCurrentConversationId(id);
    }, []);

    const loadConversation = useCallback(async (id: string) => {
        try {
            const res = await chatApi.getConversation(id);
            const { messages: msgs } = res.data.data;
            setMessages(
                msgs.map((m) => ({
                    id: m.id,
                    role: m.role as "user" | "assistant",
                    content: m.content,
                    createdAt: m.createdAt,
                })),
            );
            setConversationId(id);
        } catch {
            setError("Failed to load conversation.");
        }
    }, [setConversationId]);

    const send = useCallback(
        async (question: string) => {
            if (!question.trim() || isStreaming) return;

            setError(null);

            const userMsg: Message = {
                id: `user_${Date.now()}`,
                role: "user",
                content: question.trim(),
                createdAt: new Date().toISOString(),
            };

            const streamingMsg: Message = {
                id: PLACEHOLDER_ID,
                role: "assistant",
                content: "",
                createdAt: new Date().toISOString(),
                isStreaming: true,
            };

            setMessages((prev) => [...prev, userMsg, streamingMsg]);
            setIsStreaming(true);

            abortRef.current = new AbortController();
            let accumulatedContent = "";
            let resolvedConvId = conversationIdRef.current;
            let sources: ChatSource[] = [];

            try {
                const streamUrl = chatApi.getStreamUrl();
                const response = await fetch(streamUrl, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${accessToken}`,
                    },
                    body: JSON.stringify({
                        question: question.trim(),
                        topK: optionsRef.current.topK ?? 5,
                        promptType: optionsRef.current.promptType ?? "default",
                        conversationId: conversationIdRef.current,
                        collectionName: optionsRef.current.collectionName,
                    }),
                    signal: abortRef.current.signal,
                });

                if (!response.ok || !response.body) {
                    // Fallback to blocking endpoint
                    const fallback = await chatApi.send(question.trim(), {
                        topK: optionsRef.current.topK ?? 5,
                        promptType: optionsRef.current.promptType ?? "default",
                        conversationId: conversationIdRef.current,
                        collectionName: optionsRef.current.collectionName,
                    });
                    const result = fallback.data.data;
                    accumulatedContent = result.answer;
                    sources = result.sources ?? [];
                    resolvedConvId = result.conversationId;
                } else {
                    const reader = response.body.getReader();
                    const decoder = new TextDecoder();
                    let buffer = "";

                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) break;

                        buffer += decoder.decode(value, { stream: true });
                        const lines = buffer.split("\n");
                        buffer = lines.pop() ?? "";

                        for (const line of lines) {
                            if (line.startsWith("event: token")) continue;
                            if (line.startsWith("event: done")) continue;
                            if (line.startsWith("data: ")) {
                                const raw = line.slice(6).trim();
                                if (raw === "{}") continue;
                                try {
                                    const parsed = JSON.parse(raw);
                                    if (typeof parsed === "string") {
                                        accumulatedContent += parsed;
                                        setMessages((prev) =>
                                            prev.map((m) =>
                                                m.id === PLACEHOLDER_ID
                                                    ? { ...m, content: accumulatedContent }
                                                    : m,
                                            ),
                                        );
                                    } else if (parsed?.conversationId) {
                                        resolvedConvId = parsed.conversationId;
                                        if (parsed.sources) sources = parsed.sources;
                                    }
                                } catch {
                                    // skip malformed tokens
                                }
                            }
                        }
                    }
                }

                // Resolve conversation ID from header if the backend emits it
                // conversationId is now parsed from the done event above

                if (resolvedConvId && resolvedConvId !== conversationIdRef.current) {
                    setConversationId(resolvedConvId);
                    optionsRef.current.onConversationCreated?.(resolvedConvId, question.trim());
                }

                // Finalise the streaming message
                setMessages((prev) =>
                    prev.map((m) =>
                        m.id === PLACEHOLDER_ID
                            ? {
                                  ...m,
                                  id: `assistant_${Date.now()}`,
                                  content: accumulatedContent,
                                  isStreaming: false,
                                  sources,
                              }
                            : m,
                    ),
                );
            } catch (err: unknown) {
                if ((err as Error).name === "AbortError") return;

                const message =
                    (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data
                        ?.error?.message ?? "Something went wrong. Please try again.";
                setError(message);

                // Remove the empty streaming placeholder
                setMessages((prev) => prev.filter((m) => m.id !== PLACEHOLDER_ID));
            } finally {
                setIsStreaming(false);
                abortRef.current = null;
            }
        },
        [
            isStreaming,
            accessToken,
            setConversationId,
        ],
    );

    const abort = useCallback(() => {
        abortRef.current?.abort();
    }, []);

    const clear = useCallback(() => {
        setMessages([]);
        setConversationId(undefined);
        setError(null);
    }, [setConversationId]);

    return {
        messages,
        setMessages,
        isStreaming,
        error,
        currentConversationId,
        setCurrentConversationId: setConversationId,
        loadConversation,
        send,
        abort,
        clear,
    };
}
