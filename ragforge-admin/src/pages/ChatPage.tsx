import { useEffect, useRef, useCallback, useState } from "react";
import { useParams, useNavigate, useOutletContext } from "react-router-dom";
import {
    Bot,
    Sparkles,
    BookOpen,
    Lightbulb,
    FileQuestion,
    ChevronDown,
    FolderPlus,
} from "lucide-react";
import { clsx } from "clsx";
import { useChat } from "../hooks/useChat";
import { ChatInput } from "../components/chat/ChatInput";
import { MessageBubble } from "../components/chat/MessageBubble";
import type { PromptType } from "../types";
import { collectionsApi } from "../api/collections.api";
import { chatApi } from "../api/chat.api";
import type { Collection } from "../types";
import { CreateCollectionModal } from "../components/collections/CreateCollectionModal";
import type { ConversationsContext } from "../components/layout/AppLayout";

const SUGGESTIONS = [
    { icon: BookOpen, text: "Summarise the key points of my documents" },
    { icon: Lightbulb, text: "What topics are covered in my knowledge base?" },
    { icon: FileQuestion, text: "What are the main policies mentioned in the documents?" },
    { icon: Sparkles, text: "Give me an overview of the uploaded content" },
];

export function ChatPage() {
    const { conversationId: urlConvId } = useParams<{ conversationId?: string }>();
    const navigate = useNavigate();

    const [promptType, setPromptType] = useState<PromptType>("strict");
    const [selectedCollection, setSelectedCollection] = useState<string | null>(null);
    const [collections, setCollections] = useState<Collection[]>([]);
    const [showCollPicker, setShowCollPicker] = useState(false);
    const [atBottom, setAtBottom] = useState(true);
    // New-collection inline form inside the dropdown
    const [showCreateCollection, setShowCreateCollection] = useState(false);

    const collPickerRef = useRef<HTMLDivElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const scrollAreaRef = useRef<HTMLDivElement>(null);

    const { prepend, updateTitle, bumpToTop } = useOutletContext<ConversationsContext>();

    const {
        messages,
        isStreaming,
        error,
        currentConversationId,
        loadConversation,
        send,
        abort,
        clear,
        setCurrentConversationId,
    } = useChat({
        conversationId: urlConvId,
        collectionName: selectedCollection ?? undefined,
        promptType,
        onConversationCreated: (id, firstMessage) => {
            navigate(`/chat/${id}`, { replace: true });
            // Prepend immediately with the question as placeholder title so it shows in sidebar right away
            prepend({ id, title: firstMessage, tenantId: "", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
            // Re-fetch after a short delay to pick up the AI-generated title
            setTimeout(() => {
                chatApi.getConversation(id).then((res) => {
                    const { title, updatedAt } = res.data.data.conversation;
                    if (title) updateTitle(id, title);
                }).catch(() => {});
            }, 3000);
        },
        onTitleReady: (id, title) => {
            updateTitle(id, title);
        },
    });

    // Load conversation from URL
    useEffect(() => {
        if (urlConvId && urlConvId !== currentConversationId) {
            loadConversation(urlConvId);
        } else if (!urlConvId) {
            clear();
            setCurrentConversationId(undefined);
        }
    }, [urlConvId]); // eslint-disable-line react-hooks/exhaustive-deps

    // Fetch collections for the filter
    useEffect(() => {
        collectionsApi.list().then((res) => {
            setCollections(res.data.data.items ?? []);
        }).catch(() => {});
    }, []);

    // Close collection picker on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (
                collPickerRef.current &&
                !collPickerRef.current.contains(e.target as Node)
            ) {
                setShowCollPicker(false);
            }
        };

        document.addEventListener("mousedown", handler);

        return () => {
            document.removeEventListener("mousedown", handler);
        };
    }, []);

    

    // Auto-scroll
    useEffect(() => {
        if (atBottom) {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }
    }, [messages, atBottom]);

    const handleScroll = () => {
        const el = scrollAreaRef.current;
        if (!el) return;
        const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
        setAtBottom(distFromBottom < 60);
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        setAtBottom(true);
    };

    // Wrap send so existing conversations bubble to the top on every message
    const handleSend = useCallback(
        (message: string) => {
            if (currentConversationId) {
                bumpToTop(currentConversationId);
            }
            send(message);
        },
        [currentConversationId, bumpToTop, send],
    );

    // Get previous user message for feedback context
    const getUserQuestion = useCallback(
        (assistantIndex: number) => {
            for (let i = assistantIndex - 1; i >= 0; i--) {
                if (messages[i].role === "user") return messages[i].content;
            }
            return undefined;
        },
        [messages],
    );

    const isEmpty = messages.length === 0;

    return (
        <div className="flex flex-col h-full bg-surface-50 relative">
            {/* Top bar */}
            <header className="flex items-center justify-between gap-2 px-3 py-3 bg-white border-b border-surface-200 shrink-0 sm:gap-4 sm:px-5 sm:py-3.5">
                <div className="flex min-w-0 items-center gap-2 sm:gap-3">
                    <div className="w-8 h-8 rounded-xl bg-brand-500 flex items-center justify-center shadow-sm">
                        <Bot className="h-[18px] w-[18px] text-white" />
                    </div>
                    <div>
                        <h1 className="text-sm font-semibold text-[#1e1c1a] sm:text-base">RAG Assistant</h1>
                        <p className="text-xs text-surface-400">Powered by Ollama</p>
                    </div>
                </div>

                {/* Collection filter */}
                <div className="relative" ref={collPickerRef}>
                    <button
                        onClick={() => {
                            setShowCollPicker(v => !v);
                        }}
                        className={clsx(
                            "flex max-w-[48vw] items-center gap-1.5 px-2.5 py-2 rounded-xl border text-xs transition-colors bg-white sm:max-w-none sm:gap-2 sm:px-3.5 sm:text-sm",
                            showCollPicker
                                ? "border-brand-400 text-brand-600"
                                : "border-surface-200 text-surface-600 hover:border-brand-400 hover:text-brand-600",
                        )}
                    >
                        <span className="truncate">
                            {selectedCollection
                                ? <span className="text-brand-600 font-medium">{selectedCollection}</span>
                                : "All collections"
                            }
                        </span>
                        <ChevronDown className={clsx("h-4 w-4 transition-transform", showCollPicker && "rotate-180")} />
                    </button>

                    {showCollPicker && (
                        <div className="absolute right-0 top-full mt-1.5 bg-white border border-surface-200 rounded-2xl shadow-panel z-20 animate-fade-in w-64 overflow-hidden">

                            {/* Scrollable list */}
                            <div className="py-1.5 max-h-56 overflow-y-auto scrollbar-thin">
                                {/* All collections option */}
                                <button
                                    onClick={() => { setSelectedCollection(null); setShowCollPicker(false); }}
                                    className={clsx(
                                        "w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center gap-2",
                                        !selectedCollection ? "text-brand-600 bg-brand-50 font-medium" : "text-[#3d3530] hover:bg-surface-50",
                                    )}
                                >
                                    <span className="w-2 h-2 rounded-full bg-surface-300 shrink-0" />
                                    All collections
                                </button>

                                {collections.length > 0 && <div className="mx-3 my-1 h-px bg-surface-100" />}

                                {collections.map((c) => (
                                    <button
                                        key={c.id}
                                        onClick={() => { setSelectedCollection(c.name); setShowCollPicker(false); }}
                                        className={clsx(
                                            "w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center gap-2",
                                            selectedCollection === c.name
                                                ? "text-brand-600 bg-brand-50 font-medium"
                                                : "text-[#3d3530] hover:bg-surface-50",
                                        )}
                                    >
                                        <span className={clsx(
                                            "w-2 h-2 rounded-full shrink-0",
                                            selectedCollection === c.name ? "bg-brand-500" : "bg-surface-300",
                                        )} />
                                        <span className="truncate">{c.name}</span>
                                    </button>
                                ))}

                                {collections.length === 0 && (
                                    <p className="px-4 py-2 text-sm text-surface-400 italic">
                                        No collections yet
                                    </p>
                                )}
                            </div>

                            {/* Divider + create section */}
                            <div className="border-t border-surface-100">
                                <button
                                    onClick={() => {
                                        setShowCollPicker(false);
                                        setShowCreateCollection(true);
                                    }}
                                    className="flex items-center gap-2 w-full px-4 py-3 text-sm text-brand-600 hover:bg-brand-50 transition-colors font-medium"
                                >
                                    <FolderPlus className="h-4 w-4 shrink-0" />
                                    New collection
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </header>

            {/* Messages */}
            <div
                ref={scrollAreaRef}
                onScroll={handleScroll}
                className="flex-1 overflow-y-auto scrollbar-thin"
            >
                {isEmpty ? (
                    <div className="flex flex-col items-center justify-center h-full px-6 py-12 animate-fade-in">
                        {/* Bot avatar */}
                        <div className="w-16 h-16 rounded-2xl bg-brand-500 flex items-center justify-center mb-6 shadow-panel shrink-0">
                            <Bot className="h-8 w-8 text-white" />
                        </div>

                        {/* Heading */}
                        <h2 className="text-2xl font-semibold text-[#1e1c1a] mb-2 text-center">
                            What would you like to know?
                        </h2>
                        <p className="text-base text-surface-500 mb-10 text-center max-w-md leading-relaxed">
                            Ask anything about your documents. I'll search your knowledge base and give you accurate, sourced answers.
                        </p>

                        {/* Suggestion chips */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-2xl">
                            {SUGGESTIONS.map(({ icon: Icon, text }) => (
                                <button
                                    key={text}
                                    onClick={() => handleSend(text)}
                                    className="flex items-start gap-3 p-4 bg-white border border-surface-200 rounded-2xl text-left hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 transition-all group shadow-card"
                                >
                                    <span className="shrink-0 mt-0.5 w-8 h-8 rounded-xl bg-brand-50 group-hover:bg-brand-100 flex items-center justify-center transition-colors">
                                        <Icon className="h-4 w-4 text-brand-500 group-hover:text-brand-600" />
                                    </span>
                                    <span className="text-sm text-surface-700 group-hover:text-brand-700 leading-snug pt-1.5">{text}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="max-w-3xl mx-auto px-3 py-4 space-y-5 sm:px-5 sm:py-7 sm:space-y-6">
                        {messages.map((msg, i) => (
                            <MessageBubble
                                key={msg.id}
                                message={msg}
                                question={msg.role === "assistant" ? getUserQuestion(i) : undefined}
                                conversationId={currentConversationId}
                            />
                        ))}
                        <div ref={messagesEndRef} />
                    </div>
                )}
            </div>

            {/* Scroll-to-bottom */}
            {!atBottom && (
                <button
                    onClick={scrollToBottom}
                    className="absolute bottom-32 right-6 p-2.5 bg-white border border-surface-200 rounded-full shadow-panel text-surface-500 hover:text-brand-600 hover:border-brand-300 transition-all animate-fade-in z-10"
                    aria-label="Scroll to bottom"
                >
                    <ChevronDown className="h-5 w-5" />
                </button>
            )}

            {/* Error */}
            {error && (
                <div className="mx-5 mb-3 px-4 py-3.5 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 animate-fade-in shrink-0">
                    {error}
                </div>
            )}

            {/* Input — full-width strip, content centred to max-w-3xl */}
            <div className="shrink-0 w-full bg-surface-50 border-t border-surface-200 px-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 sm:px-4 sm:pb-5 sm:pt-3">
                <div className="max-w-3xl mx-auto w-full">
                    <ChatInput
                        onSend={handleSend}
                        isStreaming={isStreaming}
                        onAbort={abort}
                        promptType={promptType}
                        onPromptTypeChange={setPromptType}
                        collectionName={selectedCollection}
                    />
                </div>
            </div>

            <CreateCollectionModal
                open={showCreateCollection}
                onClose={() => setShowCreateCollection(false)}
                onCreated={(collection) => {
                    setCollections((prev) => [collection, ...prev]);
                    setSelectedCollection(collection.name);
                    setShowCreateCollection(false);
                }}
            />
        </div>
    );
}
