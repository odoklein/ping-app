"use client";

import { cn } from "@/lib/utils";
import { ButtonHTMLAttributes, forwardRef } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: "primary" | "secondary" | "outline" | "success" | "danger" | "ghost";
    size?: "sm" | "md" | "lg";
    isLoading?: boolean;
}

const BUTTON_BASE_STYLES =
    "inline-flex items-center justify-center gap-2 whitespace-nowrap font-semibold rounded-[10px] transition-all duration-150 cursor-pointer border disabled:opacity-45 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 focus-visible:ring-offset-2 active:translate-y-px";

const BUTTON_VARIANTS: Record<string, string> = {
    primary:
        "bg-primary text-white border-primary-hover hover:bg-primary-hover hover:shadow-sm",
    secondary:
        "bg-surface text-ink border-border hover:bg-subtle hover:border-border-strong",
    outline:
        "bg-transparent text-ink border-border-strong hover:bg-subtle",
    success:
        "bg-success text-white border-success hover:opacity-90",
    danger:
        "bg-danger text-white border-danger hover:opacity-90",
    ghost: 
        "bg-transparent text-muted border-transparent hover:text-ink hover:bg-subtle",
};

const BUTTON_SIZES: Record<string, string> = {
    sm: "px-3 py-2 text-sm",
    md: "px-4 py-2.5 text-sm",
    lg: "px-6 py-3 text-base",
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
    (
        {
            className,
            variant = "primary",
            size = "md",
            isLoading = false,
            disabled,
            children,
            ...props
        },
        ref
    ) => {
        return (
            <button
                ref={ref}
                className={cn(BUTTON_BASE_STYLES, BUTTON_VARIANTS[variant], BUTTON_SIZES[size], className)}
                disabled={disabled || isLoading}
                {...props}
            >
                {isLoading && (
                    <svg
                        className="animate-spin h-4 w-4"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
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
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                        />
                    </svg>
                )}
                {children}
            </button>
        );
    }
);

Button.displayName = "Button";

export default Button;
export { Button };
