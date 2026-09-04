"use client";

import { cn } from "@/lib/utils";
import { InputHTMLAttributes, forwardRef } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    icon?: React.ReactNode;
    endIcon?: React.ReactNode;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
    ({ className, label, error, icon, endIcon, id, ...props }, ref) => {
        return (
            <div className="w-full">
                {label && (
                    <label
                        htmlFor={id}
                        className="block font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-[#5C6E69] mb-2"
                    >
                        {label}
                    </label>
                )}
                <div className="relative">
                    {icon && (
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted">
                            {icon}
                        </div>
                    )}
                    <input
                        ref={ref}
                        id={id}
                        className={cn(
                            "w-full px-4 py-2.5 bg-white border border-border-strong rounded-[10px] text-sm transition-all duration-150",
                            "!text-ink placeholder:!text-muted",
                            "focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20",
                            error && "border-red-500 focus:border-red-500 focus:ring-red-500/20",
                            icon && "pl-10",
                            endIcon && "pr-11",
                            className
                        )}
                        {...props}
                    />
                    {endIcon && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                            {endIcon}
                        </div>
                    )}
                </div>
                {error && <p className="mt-1.5 text-sm text-red-500">{error}</p>}
            </div>
        );
    }
);

Input.displayName = "Input";

export default Input;
export { Input };
