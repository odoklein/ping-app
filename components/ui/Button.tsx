"use client";

import { cn } from "@/lib/utils";
import { ButtonHTMLAttributes, forwardRef } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: "primary" | "secondary" | "outline" | "success" | "danger" | "ghost";
    size?: "sm" | "md" | "lg";
    isLoading?: boolean;
}

const BUTTON_BASE_STYLES =
    "inline-flex items-center justify-center gap-2 whitespace-nowrap font-semibold rounded-[10px] transition-all duration-150 cursor-pointer border disabled:opacity-45 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2890F8]/35 focus-visible:ring-offset-2 active:translate-y-px";

const BUTTON_VARIANTS: Record<string, string> = {
    primary:
        "bg-[#2890F8] text-white border-[#1a75ce] hover:bg-[#1a75ce] hover:shadow-[0_7px_20px_rgba(40,144,248,.25)]",
    secondary:
        "bg-[#f8f8f8] text-[#080808] border-[#e0e0e0] hover:bg-[#eeeeee] hover:border-[#cccccc]",
    outline:
        "bg-transparent text-[#080808] border-[#cccccc] hover:bg-[#f0f0f0] hover:border-[#080808]",
    success:
        "bg-[#25745F] text-white border-[#1E604F] hover:bg-[#1E604F]",
    danger:
        "bg-[#B9433E] text-white border-[#963632] hover:bg-[#963632]",
    ghost: "bg-transparent text-[#666666] border-transparent hover:text-[#080808] hover:bg-[#f0f0f0]",
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
