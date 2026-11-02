import { clsx } from "clsx";
import type { ButtonHTMLAttributes, ReactNode } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: "primary" | "secondary" | "ghost" | "danger" | "outline";
    size?: "xs" | "sm" | "md" | "lg" | "icon";
    loading?: boolean;
    children?: ReactNode;
}

export function Button({
    variant = "primary",
    size = "md",
    loading,
    className,
    children,
    disabled,
    ...props
}: ButtonProps) {
    return (
        <button
            {...props}
            disabled={disabled || loading}
            className={clsx(
                "inline-flex items-center justify-center gap-2 font-medium transition-all duration-150",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-brand-500",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                "select-none",
                {
                    // Variants
                    "bg-brand-500 text-white hover:bg-brand-600 active:bg-brand-700 shadow-sm rounded-xl":
                        variant === "primary",
                    "bg-white text-[#3d3530] border border-surface-200 hover:bg-surface-50 active:bg-surface-100 shadow-sm rounded-xl":
                        variant === "secondary",
                    "text-surface-600 hover:bg-surface-100 active:bg-surface-200 rounded-lg":
                        variant === "ghost",
                    "bg-red-500 text-white hover:bg-red-600 active:bg-red-700 shadow-sm rounded-xl":
                        variant === "danger",
                    "border border-surface-200 text-surface-700 hover:border-brand-400 hover:text-brand-600 rounded-xl":
                        variant === "outline",

                    // Sizes
                    "px-2 py-1 text-xs rounded-md": size === "xs",
                    "px-3 py-1.5 text-sm": size === "sm",
                    "px-4 py-2 text-sm": size === "md",
                    "px-5 py-2.5 text-base": size === "lg",
                    "p-2 rounded-lg": size === "icon",
                },
                className,
            )}
        >
            {loading && (
                <svg
                    className="animate-spin h-4 w-4 shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                >
                    <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                    />
                    <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8v8z"
                    />
                </svg>
            )}
            {children}
        </button>
    );
}
