import { useState, useMemo } from "react";
import { Outlet, Navigate } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { useAuth } from "../../store/auth.store";
import { useConversations } from "../../hooks/useConversations";
import type { Conversation } from "../../types";
import { Menu } from "lucide-react";

export interface ConversationsContext {
    prepend: (conv: Conversation) => void;
    updateTitle: (id: string, title: string) => void;
    bumpToTop: (id: string) => void;
}

export function AppLayout() {
    const { isAuthenticated } = useAuth();
    const [collapsed, setCollapsed] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const conversations = useConversations();

    const ctx = useMemo<ConversationsContext>(() => ({
        prepend: conversations.prepend,
        updateTitle: conversations.updateTitle,
        bumpToTop: conversations.bumpToTop,
    }), [conversations.prepend, conversations.updateTitle, conversations.bumpToTop]);

    if (!isAuthenticated) return <Navigate to="/login" replace />;

    return (
        <div className="flex h-[100dvh] bg-surface-50 overflow-hidden">
            <Sidebar
                collapsed={collapsed}
                onToggle={() => setCollapsed((v) => !v)}
                conversations={conversations}
                mobileOpen={mobileMenuOpen}
                onMobileClose={() => setMobileMenuOpen(false)}
            />
            <main className="flex-1 overflow-hidden flex flex-col min-w-0">
                <header className="md:hidden h-12 shrink-0 flex items-center gap-3 px-3 bg-[#1e1c1a] text-white">
                    <button
                        type="button"
                        onClick={() => setMobileMenuOpen(true)}
                        className="p-2 -ml-2 rounded-lg text-[#c5b9ad] hover:bg-[#2a2724]"
                        aria-label="Open navigation menu"
                        aria-expanded={mobileMenuOpen}
                    >
                        <Menu className="h-5 w-5" />
                    </button>
                    <span className="text-sm font-semibold">RAG Studio</span>
                </header>
                <div className="flex-1 min-h-0">
                    <Outlet context={ctx} />
                </div>
            </main>
        </div>
    );
}
