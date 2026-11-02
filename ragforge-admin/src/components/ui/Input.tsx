import { clsx } from "clsx";
import type { InputHTMLAttributes, ReactNode } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    hint?: string;
    leftIcon?: ReactNode;
    rightIcon?: ReactNode;
}

export function Input({ label, error, hint, leftIcon, rightIcon, className, id, ...props }: InputProps) {
    return (
        <div className="flex flex-col gap-1.5">
            {label && (
                <label htmlFor={id} className="text-sm font-medium text-[#3d3530]">
                    {label}
                </label>
            )}
            <div className="relative flex items-center">
                {leftIcon && (
                    <span className="absolute left-3.5 text-surface-400 pointer-events-none">{leftIcon}</span>
                )}
                <input
                    id={id}
                    {...props}
                    className={clsx(
                        "w-full rounded-xl border px-3.5 py-2.5 text-base text-[#2c2825] placeholder-surface-400",
                        "focus:outline-none focus:ring-2 focus:ring-brand-400/40 focus:border-brand-400",
                        "transition duration-150 disabled:bg-surface-50 disabled:cursor-not-allowed",
                        error ? "border-red-300 bg-red-50" : "border-surface-200 bg-white hover:border-surface-300",
                        leftIcon && "pl-10",
                        rightIcon && "pr-10",
                        className,
                    )}
                />
                {rightIcon && (
                    <span className="absolute right-3.5 text-surface-400">{rightIcon}</span>
                )}
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            {hint && !error && <p className="text-sm text-surface-400">{hint}</p>}
        </div>
    );
}
