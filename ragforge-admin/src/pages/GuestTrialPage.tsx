import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, FileUp, Loader2, Send, ShieldCheck, Trash2 } from "lucide-react";
import { guestApiClient } from "../api/guest.api";
import type { Document, Message } from "../types";
import { Button } from "../components/ui/Button";
import { SourcesPanel } from "../components/chat/SourcesPanel";

const GUEST_TOKEN_KEY = "ragforge.guest.token";
const GUEST_CONVERSATION_KEY = "ragforge.guest.conversation";
const MAX_FILES = 3;
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const PROCESSING_STATUSES = new Set(["PENDING", "PROCESSING", "EMBEDDING"]);

function apiErrorMessage(error: unknown): string {
    return (error as { response?: { data?: { error?: { message?: string } } } })
        ?.response?.data?.error?.message ?? "The request failed. Please try again.";
}

export function GuestTrialPage() {
    const [token, setToken] = useState("");
    const [documents, setDocuments] = useState<Document[]>([]);
    const [messages, setMessages] = useState<Message[]>([]);
    const [question, setQuestion] = useState("");
    const [loadingSession, setLoadingSession] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [deletingDocumentId, setDeletingDocumentId] = useState<string | null>(null);
    const [deletingAllData, setDeletingAllData] = useState(false);
    const [sending, setSending] = useState(false);
    const [error, setError] = useState("");
    const fileInputRef = useRef<HTMLInputElement>(null);
    const messagesContainerRef = useRef<HTMLDivElement>(null);
    const chatAbortRef = useRef<AbortController | null>(null);

    useEffect(() => {
        const container = messagesContainerRef.current;
        if (container) {
            container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
        }
    }, [messages, sending]);

    useEffect(() => () => chatAbortRef.current?.abort(), []);

    const refreshDocuments = useCallback(async (sessionToken: string) => {
        const response = await guestApiClient.listDocuments(sessionToken);
        setDocuments(response.data.data);
    }, []);

    useEffect(() => {
        let active = true;
        const initialize = async () => {
            try {
                let sessionToken = localStorage.getItem(GUEST_TOKEN_KEY) ?? "";
                if (sessionToken) {
                    try {
                        const response = await guestApiClient.listDocuments(sessionToken);
                        if (!active) return;
                        setDocuments(response.data.data);
                    } catch (requestError) {
                        const status = (requestError as { response?: { status?: number } }).response?.status;
                        if (status !== 401) throw requestError;
                        localStorage.removeItem(GUEST_TOKEN_KEY);
                        localStorage.removeItem(GUEST_CONVERSATION_KEY);
                        sessionToken = "";
                    }
                }

                if (!sessionToken) {
                    const response = await guestApiClient.createSession();
                    sessionToken = response.data.data.token;
                    localStorage.setItem(GUEST_TOKEN_KEY, sessionToken);
                }
                if (!active) return;
                setToken(sessionToken);

                const conversationId = localStorage.getItem(GUEST_CONVERSATION_KEY);
                if (conversationId) {
                    try {
                        const response = await guestApiClient.getConversation(sessionToken, conversationId);
                        if (!active) return;
                        setMessages(response.data.data.messages.map(message => ({
                            id: message.id,
                            role: message.role as "user" | "assistant",
                            content: message.content.trim(),
                            createdAt: message.createdAt,
                        })));
                    } catch {
                        localStorage.removeItem(GUEST_CONVERSATION_KEY);
                    }
                }
            } catch (requestError) {
                if (active) setError(apiErrorMessage(requestError));
            } finally {
                if (active) setLoadingSession(false);
            }
        };
        void initialize();
        return () => { active = false; };
    }, []);

    useEffect(() => {
        if (!token || !documents.some(document => PROCESSING_STATUSES.has(document.status))) return;
        const timer = window.setInterval(() => {
            void refreshDocuments(token).catch(requestError => setError(apiErrorMessage(requestError)));
        }, 2500);
        return () => window.clearInterval(timer);
    }, [token, documents, refreshDocuments]);

    const handleFile = async (file?: File) => {
        if (!file || !token) return;
        setError("");
        if (documents.length >= MAX_FILES) {
            setError(`Guest sessions can upload up to ${MAX_FILES} files.`);
            return;
        }
        if (file.size > MAX_FILE_BYTES) {
            setError("Each guest upload must be 10 MB or smaller.");
            return;
        }

        setUploading(true);
        try {
            await guestApiClient.upload(token, file);
            await refreshDocuments(token);
        } catch (uploadError) {
            setError(apiErrorMessage(uploadError));
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    const deleteDocument = async (document: Document) => {
        if (!token || deletingDocumentId) return;
        if (!window.confirm(`Delete "${document.filename}" from this trial?`)) return;

        setError("");
        setDeletingDocumentId(document.id);
        try {
            await guestApiClient.deleteDocument(token, document.id);
            setDocuments(previous => previous.filter(item => item.id !== document.id));
            await refreshDocuments(token);
        } catch (deleteError) {
            setError(apiErrorMessage(deleteError));
        } finally {
            setDeletingDocumentId(null);
        }
    };

    const deleteAllTrialData = async () => {
        if (!token || deletingAllData) return;
        const confirmed = window.confirm(
            "Permanently delete all trial documents and chat history? You can start again in this trial session.",
        );
        if (!confirmed) return;

        setError("");
        setDeletingAllData(true);
        try {
            await guestApiClient.deleteAllData(token);
            localStorage.removeItem(GUEST_CONVERSATION_KEY);
            setDocuments([]);
            setMessages([]);
            setQuestion("");
        } catch (deleteError) {
            setError(apiErrorMessage(deleteError));
        } finally {
            setDeletingAllData(false);
        }
    };

    const sendQuestion = async (event: React.FormEvent) => {
        event.preventDefault();
        const text = question.trim();
        if (!text || !token || sending || deletingAllData || !documents.some(document => document.status === "READY")) return;

        setError("");
        setQuestion("");
        const assistantMessageId = `guest-assistant-${Date.now()}`;
        const abortController = new AbortController();
        setMessages(previous => [...previous, {
            id: `guest-user-${Date.now()}`,
            role: "user",
            content: text,
            createdAt: new Date().toISOString(),
        }, {
            id: assistantMessageId,
            role: "assistant",
            content: "",
            createdAt: new Date().toISOString(),
            isStreaming: true,
        }]);
        setSending(true);
        chatAbortRef.current = abortController;
        let answer = "";

        try {
            const conversationId = localStorage.getItem(GUEST_CONVERSATION_KEY) ?? undefined;
            const result = await guestApiClient.streamChat(
                token,
                text,
                chunk => {
                    answer += chunk;
                    setMessages(previous => previous.map(message =>
                        message.id === assistantMessageId
                            ? { ...message, content: answer }
                            : message,
                    ));
                },
                conversationId,
                abortController.signal,
            );
            localStorage.setItem(GUEST_CONVERSATION_KEY, result.conversationId);
            setMessages(previous => previous.map(message =>
                message.id === assistantMessageId
                    ? {
                        ...message,
                        content: result.answer.trim(),
                        isStreaming: false,
                        sources: result.sources,
                    }
                    : message,
            ));
        } catch (chatError) {
            if (!(chatError instanceof Error && chatError.name === "AbortError")) {
                setError(chatError instanceof Error ? chatError.message : apiErrorMessage(chatError));
            }
            setMessages(previous => previous.filter(message => message.id !== assistantMessageId));
        } finally {
            if (chatAbortRef.current === abortController) chatAbortRef.current = null;
            setSending(false);
        }
    };

    const readyDocuments = documents.filter(document => document.status === "READY").length;
    const canAsk = readyDocuments > 0;
    const hasProcessingDocuments = documents.some(document => PROCESSING_STATUSES.has(document.status));

    return (
        <main className="flex h-[100dvh] flex-col overflow-hidden bg-surface-50">
            <header className="flex shrink-0 items-center justify-between border-b border-surface-200 bg-white px-4 py-3 sm:px-8">
                <Link to="/login" className="flex items-center gap-2 text-sm text-surface-600 hover:text-brand-600">
                    <ArrowLeft className="h-4 w-4" /> Sign in
                </Link>
                <span className="font-semibold text-[#1e1c1a]">RAG Studio Trial</span>
                <span className="w-16" />
            </header>

            <div className="mx-auto grid min-h-0 w-full max-w-6xl flex-1 grid-cols-1 items-start gap-5 overflow-y-auto px-4 py-5 sm:gap-6 lg:grid-cols-[320px_minmax(0,1fr)] lg:grid-rows-1 lg:items-stretch lg:overflow-hidden lg:py-8">
                <section className="flex h-[min(70dvh,720px)] min-h-[360px] min-w-0 flex-col overflow-hidden rounded-2xl border border-surface-200 bg-white shadow-sm sm:min-h-[400px] lg:h-full lg:min-h-0">
                    <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
                    <h1 className="text-lg font-semibold text-[#1e1c1a]">Try it with your document</h1>
                    <p className="mt-2 text-sm leading-6 text-surface-500">
                        Upload a document, wait for processing, then ask questions about its contents.
                    </p>
                    <div className="mt-4 rounded-xl bg-brand-50 p-3 text-xs leading-5 text-brand-800">
                        Up to 3 files, 10 MB each. Trial files and chats are automatically deleted after 24 hours.
                    </div>
                    <input
                        ref={fileInputRef}
                        type="file"
                        className="hidden"
                        onChange={event => void handleFile(event.target.files?.[0])}
                    />
                    <Button
                        type="button"
                        variant="outline"
                        className="mt-5 w-full"
                        loading={uploading}
                        disabled={loadingSession || !token || uploading || deletingAllData || documents.length >= MAX_FILES}
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <FileUp className="h-4 w-4" />
                        Upload document ({documents.length}/{MAX_FILES})
                    </Button>

                    <div className="mt-6 space-y-3">
                        <h2 className="text-sm font-semibold text-surface-700">Your trial documents</h2>
                        {loadingSession ? (
                            <p className="text-sm text-surface-400">Starting a secure trial session...</p>
                        ) : documents.length === 0 ? (
                            <p className="text-sm text-surface-400">No documents uploaded yet.</p>
                        ) : documents.map(document => (
                            <div key={document.id} className="flex min-w-0 items-center gap-2 rounded-xl border border-surface-200 px-3 py-2.5">
                                <div className="min-w-0 flex-1">
                                    <div className="truncate text-sm font-medium text-surface-700" title={document.filename}>
                                        {document.filename}
                                    </div>
                                    <div className="mt-1 text-xs text-surface-500">{document.status}</div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => void deleteDocument(document)}
                                    disabled={Boolean(deletingDocumentId) || deletingAllData || PROCESSING_STATUSES.has(document.status)}
                                    aria-label={`Delete ${document.filename}`}
                                    title={PROCESSING_STATUSES.has(document.status)
                                        ? "Wait for processing to finish before deleting"
                                        : "Delete document"}
                                    className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-surface-500 transition-colors hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                    {deletingDocumentId === document.id
                                        ? <Loader2 className="h-4 w-4 animate-spin" />
                                        : <Trash2 className="h-4 w-4" />}
                                </button>
                            </div>
                        ))}
                    </div>

                    <div className="mt-6 flex items-start gap-2 text-xs leading-5 text-surface-500">
                        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                        Your session is isolated from other visitors. Do not upload highly sensitive documents.
                    </div>
                    </div>
                    <div className="shrink-0 border-t border-surface-200 bg-white p-4 sm:p-5">
                        <button
                            type="button"
                            onClick={() => void deleteAllTrialData()}
                            disabled={
                                loadingSession ||
                                !token ||
                                deletingAllData ||
                                uploading ||
                                sending ||
                                Boolean(deletingDocumentId) ||
                                hasProcessingDocuments ||
                                (documents.length === 0 && messages.length === 0)
                            }
                            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 px-3 py-2.5 text-sm font-medium text-red-700 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {deletingAllData
                                ? <Loader2 className="h-4 w-4 animate-spin" />
                                : <Trash2 className="h-4 w-4" />}
                            {hasProcessingDocuments ? "Wait for processing to finish" : "Delete all trial data"}
                        </button>
                    </div>
                </section>

                <section className="flex h-[min(70dvh,720px)] min-h-[360px] min-w-0 flex-col overflow-hidden rounded-2xl border border-surface-200 bg-white shadow-sm sm:min-h-[400px] lg:h-full lg:min-h-0">
                    <div
                        ref={messagesContainerRef}
                        role="log"
                        aria-label="Guest chat messages"
                        aria-live="polite"
                        className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain p-5 scrollbar-thin"
                    >
                        {messages.length === 0 ? (
                            <div className="flex h-full min-h-64 flex-col items-center justify-center text-center">
                                <p className="text-base font-medium text-surface-700">
                                    {canAsk ? "Your document is ready. Ask a question." : "Upload a document to get started."}
                                </p>
                                <p className="mt-2 max-w-md text-sm text-surface-500">
                                    Guest mode lets you try document Q&amp;A without creating an account.
                                </p>
                            </div>
                        ) : messages.map(message => (
                            message.role === "assistant" && message.isStreaming && !message.content ? (
                                <div key={message.id} className="flex items-center gap-2 text-sm text-surface-500">
                                    <Loader2 className="h-4 w-4 animate-spin" /> Thinking...
                                </div>
                            ) : (
                                <div
                                    key={message.id}
                                    className={`max-w-[90%] ${
                                        message.role === "user" ? "ml-auto" : ""
                                    }`}
                                >
                                    <article
                                        className={`whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-6 ${
                                            message.role === "user"
                                                ? "bg-brand-500 text-white"
                                                : "bg-surface-100 text-surface-800"
                                        }`}
                                    >
                                        {message.content}
                                    </article>
                                    {message.role === "assistant" && !message.isStreaming && message.sources && (
                                        <SourcesPanel sources={message.sources} />
                                    )}
                                </div>
                            )
                        ))}
                    </div>
                    {error && <div role="alert" className="mx-4 mb-3 max-h-24 shrink-0 overflow-y-auto rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
                    <form onSubmit={sendQuestion} className="flex shrink-0 gap-2 border-t border-surface-200 p-3">
                        <input
                            value={question}
                            onChange={event => setQuestion(event.target.value)}
                            disabled={!canAsk || sending || deletingAllData}
                            placeholder={canAsk ? "Ask about your document..." : "Waiting for a document to finish processing..."}
                            className="min-w-0 flex-1 rounded-xl border border-surface-200 px-4 py-2.5 text-sm outline-none focus:border-brand-400 disabled:bg-surface-50"
                        />
                        <Button type="submit" disabled={!canAsk || sending || deletingAllData || !question.trim()} aria-label="Send question">
                            <Send className="h-4 w-4" />
                        </Button>
                    </form>
                </section>
            </div>
        </main>
    );
}
