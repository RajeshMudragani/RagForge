import { clsx } from "clsx";
import type { ReactNode } from "react";

type BadgeVariant = "default" | "success" | "warning" | "error" | "info" | "purple";

interface BadgeProps {
    children: ReactNode;
    variant?: BadgeVariant;
    className?: string;
}

export function Badge({ children, variant = "default", className }: BadgeProps) {
    return (
        <span
            className={clsx(
                "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium",
                {
                    "bg-surface-100 text-surface-700":  variant === "default",
                    "bg-green-100  text-green-700":     variant === "success",
                    "bg-amber-100  text-amber-700":     variant === "warning",
                    "bg-red-100    text-red-700":       variant === "error",
                    "bg-blue-100   text-blue-700":      variant === "info",
                    "bg-brand-100  text-brand-700":     variant === "purple",
                },
                className,
            )}
        >
            {children}
        </span>
    );
}
