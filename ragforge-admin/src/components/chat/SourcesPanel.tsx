import { useState } from "react";
import { FileText, ChevronDown, ChevronUp } from "lucide-react";
import type { ChatSource } from "../../types";

interface SourcesPanelProps { sources: ChatSource[]; }

export function SourcesPanel({ sources }: SourcesPanelProps) {
    const [open, setOpen] = useState(false);
    if (!sources || sources.length === 0) return null;

    return (
        <div className="mt-2.5">
            <button
                onClick={() => setOpen(v => !v)}
                className="inline-flex items-center gap-1.5 text-sm text-surface-400 hover:text-brand-600 transition-colors"
                aria-expanded={open}
            >
                <FileText className="h-4 w-4" />
                <span>{sources.length} source{sources.length !== 1 ? "s" : ""}</span>
                {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>

            {open && (
                <div className="mt-2 grid gap-2 animate-fade-in">
                    {sources.map((src, i) => (
                        <div
                            key={`${src.documentId}-${src.chunkIndex}-${i}`}
                            className="flex items-start gap-2.5 px-3.5 py-2.5 bg-surface-50 border border-surface-200 rounded-xl text-sm"
                        >
                            <FileText className="h-4 w-4 text-brand-500 mt-0.5 shrink-0" />
                            <div className="min-w-0 flex-1">
                                <p className="font-medium text-[#2c2825] truncate">{src.filename}</p>
                                <p className="text-surface-400 mt-0.5 text-xs">
                                    {src.chunkIndex < 0
                                        ? "Document summary"
                                        : <>Chunk #{src.chunkIndex + 1}{src.similarity != null && <> · {(src.similarity * 100).toFixed(0)}% match</>}</>}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
