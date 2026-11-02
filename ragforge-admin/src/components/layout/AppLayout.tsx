import { useState, useMemo } from "react";
import { Outlet, Navigate } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { useAuth } from "../../store/auth.store";
import { useConversations } from "../../hooks/useConversations";
import type { Conversation } from "../../types";

export interface ConversationsContext {
    prepend: (conv: Conversation) => void;
    updateTitle: (id: string, title: string) => void;
    bumpToTop: (id: string) => void;
}

export function AppLayout() {
    const { isAuthenticated } = useAuth();
    const [collapsed, setCollapsed] = useState(false);
    const conversations = useConversations();

    if (!isAuthenticated) return <Navigate to="/login" replace />;

    const ctx = useMemo<ConversationsContext>(() => ({
        prepend: conversations.prepend,
        updateTitle: conversations.updateTitle,
        bumpToTop: conversations.bumpToTop,
    }), [conversations.prepend, conversations.updateTitle, conversations.bumpToTop]);

    return (
        <div className="flex h-screen bg-surface-50 overflow-hidden">
            <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((v) => !v)} conversations={conversations} />
            <main className="flex-1 overflow-hidden flex flex-col min-w-0">
                <Outlet context={ctx} />
            </main>
        </div>
    );
}
