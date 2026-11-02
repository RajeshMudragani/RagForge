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
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
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
                    "relative bg-white rounded-2xl shadow-2xl w-full animate-slide-up",
                    {
                        "max-w-sm": size === "sm",
                        "max-w-md": size === "md",
                        "max-w-2xl": size === "lg",
                    },
                )}
            >
                <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100">
                    {title && <h2 className="text-base font-semibold text-gray-900">{title}</h2>}
                    <button
                        onClick={onClose}
                        className="ml-auto text-gray-400 hover:text-gray-600 rounded-lg p-1 transition-colors"
                        aria-label="Close"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>
                <div className="p-6">{children}</div>
            </div>
        </div>
    );
}
