import { useState, useRef, useCallback, type KeyboardEvent } from "react";
import { Send, Square, ChevronDown, Zap, Target, AlignLeft } from "lucide-react";
import { clsx } from "clsx";
import type { PromptType } from "../../types";

interface ChatInputProps {
    onSend: (message: string) => void;
    isStreaming: boolean;
    onAbort: () => void;
    disabled?: boolean;
    promptType: PromptType;
    onPromptTypeChange: (type: PromptType) => void;
    collectionName?: string | null;
}

const PROMPT_TYPES: { value: PromptType; label: string; icon: typeof Zap; description: string }[] = [
    { value: "default", label: "Balanced", icon: AlignLeft, description: "Detailed, comprehensive answers" },
    { value: "concise", label: "Concise",  icon: Zap,       description: "Short, direct answers"         },
    { value: "strict",  label: "Strict",   icon: Target,    description: "Only from document context"    },
];

export function ChatInput({ onSend, isStreaming, onAbort, disabled, promptType, onPromptTypeChange, collectionName }: ChatInputProps) {
    const [value,     setValue]     = useState("");
    const [showModes, setShowModes] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const handleSubmit = useCallback(() => {
        const t = value.trim();
        if (!t || isStreaming || disabled) return;
        onSend(t);
        setValue("");
        if (textareaRef.current) textareaRef.current.style.height = "auto";
    }, [value, isStreaming, disabled, onSend]);

    const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit(); }
    };

    const handleInput = () => {
        const el = textareaRef.current;
        if (!el) return;
        el.style.height = "auto";
        el.style.height = `${Math.min(el.scrollHeight, 220)}px`;
    };

    const activeMode = PROMPT_TYPES.find(m => m.value === promptType)!;

    return (
        <div className="relative">
            {/* Mode picker dropdown */}
            {showModes && (
                <div className="absolute bottom-full mb-2 left-0 bg-white border border-surface-200 rounded-2xl shadow-panel p-1.5 w-60 z-10 animate-slide-up">
                    {PROMPT_TYPES.map(mode => {
                        const Icon = mode.icon;
                        return (
                            <button
                                key={mode.value}
                                onClick={() => { onPromptTypeChange(mode.value); setShowModes(false); }}
                                className={clsx(
                                    "flex items-start gap-3 w-full px-3.5 py-3 rounded-xl text-left transition-colors",
                                    promptType === mode.value
                                        ? "bg-brand-50 text-brand-700"
                                        : "text-[#3d3530] hover:bg-surface-50",
                                )}
                            >
                                <Icon className="h-[18px] w-[18px] mt-0.5 shrink-0" />
                                <div>
                                    <p className="text-sm font-medium">{mode.label}</p>
                                    <p className="text-xs text-surface-500 mt-0.5">{mode.description}</p>
                                </div>
                            </button>
                        );
                    })}
                </div>
            )}

            {/* Input box */}
            <div className={clsx(
                "flex items-center gap-2 px-3 py-2.5 bg-white border rounded-2xl shadow-card transition-all",
                "border-surface-200 focus-within:border-brand-400 focus-within:shadow-input",
            )}>
                {/* Mode toggle */}
                <button
                    type="button"
                    onClick={() => setShowModes(v => !v)}
                    className="shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-sm font-medium text-surface-500 hover:bg-surface-100 hover:text-surface-700 transition-colors"
                    title="Response mode"
                >
                    <activeMode.icon className="h-4 w-4" />
                    <span className="hidden sm:inline">{activeMode.label}</span>
                    <ChevronDown className="h-3.5 w-3.5" />
                </button>

                <div className="w-px h-5 bg-surface-200 shrink-0" />

                {/* Textarea */}
                <textarea
                    ref={textareaRef}
                    value={value}
                    onChange={e => setValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onInput={handleInput}
                    placeholder={collectionName ? `Ask about "${collectionName}"…` : "Ask anything about your documents…"}
                    rows={1}
                    disabled={disabled}
                    className="flex-1 resize-none bg-transparent border-none outline-none text-base text-[#2c2825] placeholder-surface-400 leading-6 max-h-[220px] overflow-y-auto scrollbar-thin py-1"
                    aria-label="Chat message"
                    style={{ minHeight: "1.5rem" }}
                />

                {/* Send / stop */}
                {isStreaming ? (
                    <button
                        onClick={onAbort}
                        className="shrink-0 p-2 rounded-xl bg-surface-100 text-surface-600 hover:bg-surface-200 transition-colors"
                        title="Stop generating"
                    >
                        <Square className="h-[18px] w-[18px]" fill="currentColor" />
                    </button>
                ) : (
                    <button
                        onClick={handleSubmit}
                        disabled={!value.trim() || disabled}
                        className="shrink-0 p-2 rounded-xl bg-brand-500 text-white hover:bg-brand-600 disabled:opacity-35 disabled:cursor-not-allowed transition-colors shadow-sm"
                        title="Send (Enter)"
                    >
                        <Send className="h-[18px] w-[18px]" />
                    </button>
                )}
            </div>

            <p className="text-center text-xs text-surface-400 mt-2">
                <kbd className="px-1.5 py-0.5 font-mono bg-surface-100 rounded border border-surface-200 text-surface-500">Enter</kbd>
                {" "}to send · {" "}
                <kbd className="px-1.5 py-0.5 font-mono bg-surface-100 rounded border border-surface-200 text-surface-500">Shift+Enter</kbd>
                {" "}for new line
            </p>
        </div>
    );
}
