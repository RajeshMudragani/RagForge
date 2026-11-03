import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";
import { clsx } from "clsx";

interface ModalProps {
    open: boolean;
    onClose: () => void;
    title?: string;
    children: ReactNode;
    size?: "sm" | "md" | "lg";
}

export function Modal({ open, onClose, title, children, size = "md" }: ModalProps) {
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        if (open) document.addEventListener("keydown", handler);
        return () => document.removeEventListener("keydown", handler);
    }, [open, onClose]);

    if (!open) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4"
            role="dialog"
            aria-modal="true"
        >
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in"
                onClick={onClose}
                aria-hidden="true"
            />

            {/* Panel */}
            <div
                className={clsx(
                    "relative flex max-h-[calc(100dvh-1rem)] flex-col overflow-hidden bg-white rounded-2xl shadow-2xl w-full animate-slide-up sm:max-h-[calc(100dvh-2rem)]",
                    {
                        "max-w-sm": size === "sm",
                        "max-w-md": size === "md",
                        "max-w-2xl": size === "lg",
                    },
                )}
            >
                <div className="flex items-center justify-between gap-3 px-4 pt-4 pb-3 border-b border-gray-100 sm:px-6 sm:pt-5 sm:pb-4">
                    {title && <h2 className="min-w-0 break-words text-base font-semibold text-gray-900">{title}</h2>}
                    <button
                        onClick={onClose}
                        className="ml-auto text-gray-400 hover:text-gray-600 rounded-lg p-1 transition-colors"
                        aria-label="Close"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>
                <div className="min-h-0 overflow-y-auto p-4 sm:p-6">{children}</div>
            </div>
        </div>
    );
}
