import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneLight } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Check, Copy, ThumbsUp, ThumbsDown, Bot, User } from "lucide-react";
import { clsx } from "clsx";
import type { Message } from "../../types";
import { TypingIndicator } from "./TypingIndicator";
import { SourcesPanel } from "./SourcesPanel";
import { chatApi } from "../../api/chat.api";

interface MessageBubbleProps {
    message: Message;
    question?: string;
    conversationId?: string;
}

export function MessageBubble({ message, question, conversationId }: MessageBubbleProps) {
    const [copied,   setCopied]   = useState(false);
    const [feedback, setFeedback] = useState<"UP" | "DOWN" | null>(null);

    const isUser = message.role === "user";
    const isEmpty = !message.content && message.isStreaming;

    const copy = async () => {
        await navigator.clipboard.writeText(message.content);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
    };

    const submitFeedback = async (rating: "UP" | "DOWN") => {
        if (feedback || !question) return;
        setFeedback(rating);
        try {
            await chatApi.submitFeedback({ question, answer: message.content, rating, conversationId });
        } catch { /* non-critical */ }
    };

    /* ── User bubble ───────────────────────────────────────────────────────── */
    if (isUser) {
        return (
            <div className="flex justify-end items-end gap-3 animate-fade-in">
                <div className="max-w-[78%] xl:max-w-[68%]">
                    <div className="bg-brand-500 text-white px-5 py-3.5 rounded-2xl rounded-br-sm text-base leading-relaxed shadow-sm">
                        {message.content}
                    </div>
                </div>
                <div className="shrink-0 w-8 h-8 rounded-full bg-surface-200 flex items-center justify-center mb-1 shadow-sm">
                    <User className="h-[18px] w-[18px] text-surface-600" />
                </div>
            </div>
        );
    }

    /* ── Assistant bubble ──────────────────────────────────────────────────── */
    return (
        <div className="flex items-start gap-3 animate-fade-in group">
            {/* Avatar */}
            <div className="shrink-0 w-8 h-8 rounded-full bg-brand-500 flex items-center justify-center mt-1 shadow-sm">
                <Bot className="h-[18px] w-[18px] text-white" />
            </div>

            <div className="flex-1 min-w-0">
                {isEmpty ? (
                    <div className="bg-white border border-surface-200 rounded-2xl rounded-tl-sm px-5 py-4 shadow-card">
                        <TypingIndicator />
                    </div>
                ) : (
                    <>
                        <div className={clsx(
                            "bg-white border border-surface-200 rounded-2xl rounded-tl-sm px-5 py-4 shadow-card",
                            "text-base leading-relaxed text-[#2c2825]",
                            message.isStreaming && "typing-cursor",
                        )}>
                            <ReactMarkdown
                                remarkPlugins={[remarkGfm]}
                                components={{
                                    code({ className, children, ...rest }) {
                                        const match = /language-(\w+)/.exec(className || "");
                                        if (!match) {
                                            return (
                                                <code
                                                    className="bg-surface-100 text-[#2c2825] rounded-md px-1.5 py-0.5 text-sm font-mono border border-surface-200"
                                                    {...rest}
                                                >{children}</code>
                                            );
                                        }
                                        return (
                                            <div className="relative my-3 rounded-xl overflow-hidden border border-surface-200">
                                                <div className="flex items-center justify-between px-4 py-2 bg-[#1e1c1a] text-sm text-[#c5b9ad]">
                                                    <span className="font-mono text-xs uppercase tracking-wider text-[#706860]">{match[1]}</span>
                                                    <button onClick={copy} className="hover:text-white transition-colors">
                                                        {copied
                                                            ? <Check className="h-4 w-4 text-brand-400" />
                                                            : <Copy className="h-4 w-4" />}
                                                    </button>
                                                </div>
                                                <SyntaxHighlighter
                                                    style={oneLight}
                                                    language={match[1]}
                                                    PreTag="div"
                                                    customStyle={{ margin: 0, borderRadius: 0, fontSize: "0.875rem", padding: "14px 18px", background: "#fdfcfa" }}
                                                >
                                                    {String(children).replace(/\n$/, "")}
                                                </SyntaxHighlighter>
                                            </div>
                                        );
                                    },
                                    p({ children })  { return <p className="mb-2.5 last:mb-0">{children}</p>; },
                                    ul({ children }) { return <ul className="list-disc list-outside ml-5 mb-2.5 space-y-1">{children}</ul>; },
                                    ol({ children }) { return <ol className="list-decimal list-outside ml-5 mb-2.5 space-y-1">{children}</ol>; },
                                    li({ children }) { return <li className="text-[#3d3530]">{children}</li>; },
                                    blockquote({ children }) {
                                        return (
                                            <blockquote className="border-l-4 border-brand-300 pl-4 italic text-[#706860] my-3 bg-brand-50/50 py-2 pr-2 rounded-r-lg">
                                                {children}
                                            </blockquote>
                                        );
                                    },
                                    h1({ children }) { return <h1 className="text-xl font-semibold text-[#1e1c1a] mb-2 mt-1">{children}</h1>; },
                                    h2({ children }) { return <h2 className="text-lg font-semibold text-[#1e1c1a] mb-1.5 mt-1">{children}</h2>; },
                                    h3({ children }) { return <h3 className="text-base font-semibold text-[#1e1c1a] mb-1 mt-1">{children}</h3>; },
                                    table({ children }) {
                                        return (
                                            <div className="overflow-x-auto my-3">
                                                <table className="min-w-full border-collapse text-sm">{children}</table>
                                            </div>
                                        );
                                    },
                                    th({ children }) {
                                        return <th className="border border-surface-200 px-3.5 py-2 bg-surface-50 font-semibold text-[#2c2825] text-left">{children}</th>;
                                    },
                                    td({ children }) {
                                        return <td className="border border-surface-200 px-3.5 py-2 text-[#3d3530]">{children}</td>;
                                    },
                                    hr() { return <hr className="my-3 border-surface-200" />; },
                                    strong({ children }) { return <strong className="font-semibold text-[#1e1c1a]">{children}</strong>; },
                                }}
                            >
                                {message.content}
                            </ReactMarkdown>
                        </div>

                        {message.sources && message.sources.length > 0 && (
                            <SourcesPanel sources={message.sources} />
                        )}

                        {/* Action row */}
                        {!message.isStreaming && (
                            <div className="flex items-center gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                    onClick={copy}
                                    className="p-2 text-surface-400 hover:text-surface-700 hover:bg-surface-100 rounded-lg transition-colors"
                                    title="Copy"
                                >
                                    {copied
                                        ? <Check className="h-4 w-4 text-brand-500" />
                                        : <Copy className="h-4 w-4" />}
                                </button>
                                {question && (
                                    <>
                                        <button
                                            onClick={() => submitFeedback("UP")}
                                            disabled={!!feedback}
                                            className={clsx(
                                                "p-2 rounded-lg transition-colors",
                                                feedback === "UP"
                                                    ? "text-brand-600 bg-brand-50"
                                                    : "text-surface-400 hover:text-brand-600 hover:bg-brand-50",
                                            )}
                                            title="Helpful"
                                        >
                                            <ThumbsUp className="h-4 w-4" />
                                        </button>
                                        <button
                                            onClick={() => submitFeedback("DOWN")}
                                            disabled={!!feedback}
                                            className={clsx(
                                                "p-2 rounded-lg transition-colors",
                                                feedback === "DOWN"
                                                    ? "text-red-500 bg-red-50"
                                                    : "text-surface-400 hover:text-red-500 hover:bg-red-50",
                                            )}
                                            title="Not helpful"
                                        >
                                            <ThumbsDown className="h-4 w-4" />
                                        </button>
                                    </>
                                )}
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
