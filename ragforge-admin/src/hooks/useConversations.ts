import { useState, useCallback } from "react";
import { chatApi } from "../api/chat.api";
import type { Conversation } from "../types";

export function useConversations() {
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [loading, setLoading] = useState(false);

    const fetch = useCallback(async (search?: string) => {
        setLoading(true);
        try {
            const res = await chatApi.listConversations(1, 50, search);
            setConversations(res.data.data.items);
        } catch {
            // silently fail — sidebar is non-critical
        } finally {
            setLoading(false);
        }
    }, []);

    const remove = useCallback(async (id: string) => {
        await chatApi.deleteConversation(id);
        setConversations((prev) => prev.filter((c) => c.id !== id));
    }, []);

    const rename = useCallback(async (id: string, title: string) => {
        await chatApi.renameConversation(id, title);
        setConversations((prev) =>
            prev.map((c) => (c.id === id ? { ...c, title } : c)),
        );
    }, []);

    /** Add a brand-new conversation at the top. No-op if it already exists. */
    const prepend = useCallback((conv: Conversation) => {
        setConversations((prev) => {
            if (prev.some((c) => c.id === conv.id)) return prev;
            return [conv, ...prev];
        });
    }, []);

    /** Move an existing conversation to the top and refresh its updatedAt. */
    const bumpToTop = useCallback((id: string) => {
        setConversations((prev) => {
            const idx = prev.findIndex((c) => c.id === id);
            if (idx <= 0) return prev; // already at top or not found
            const updated = { ...prev[idx], updatedAt: new Date().toISOString() };
            const rest = prev.filter((_, i) => i !== idx);
            return [updated, ...rest];
        });
    }, []);

    /** Update the title of a conversation (and bump it to the top). */
    const updateTitle = useCallback((id: string, title: string) => {
        setConversations((prev) => {
            const idx = prev.findIndex((c) => c.id === id);
            if (idx === -1) return prev;
            const updated = { ...prev[idx], title, updatedAt: new Date().toISOString() };
            const rest = prev.filter((_, i) => i !== idx);
            return [updated, ...rest];
        });
    }, []);

    return { conversations, loading, fetch, remove, rename, prepend, bumpToTop, updateTitle };
}

export type UseConversationsReturn = ReturnType<typeof useConversations>;
