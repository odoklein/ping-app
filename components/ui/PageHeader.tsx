"use client";

import { cn } from "@/lib/utils";
import { RefreshCw } from "lucide-react";
import { ReactNode } from "react";

interface PageHeaderProps {
    title: string;
    subtitle?: string;
    icon?: ReactNode;
    actions?: ReactNode;
    onRefresh?: () => void;
    isRefreshing?: boolean;
    className?: string;
    variant?: "default" | "hero";
}

export function PageHeader({
    title,
    subtitle,
    icon,
    actions,
    onRefresh,
    isRefreshing = false,
    className,
    variant = "default",
}: PageHeaderProps) {
    if (variant === "hero") {
        return (
            <div
                className={cn(
                    "relative overflow-hidden rounded-[14px] bg-[#0C3B38] p-5 text-[#F4F0E8] sm:p-7",
                    "after:absolute after:inset-x-0 after:bottom-0 after:h-1 after:bg-[#FF9E1B]",
                    className
                )}
            >
                <div className="relative z-10">
                    {icon && (
                        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-[#FF9E1B]">
                            {icon}
                        </div>
                    )}
                    <h1 className="font-display mb-2 text-3xl font-bold tracking-[-0.025em]">
                        {title}
                    </h1>
                    {subtitle && <p className="max-w-xl text-[#C0CCC7]">{subtitle}</p>}
                    {actions && <div className="mt-6 flex flex-wrap items-center gap-3">{actions}</div>}
                </div>
            </div>
        );
    }

    return (
        <div className={cn("flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-5", className)}>
            <div className="flex min-w-0 items-start gap-3">
                {icon && (
                    <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] border border-[#CBD8D4] bg-[#EEF3F1] text-[#1F4D47]">
                        {icon}
                    </div>
                )}
                <div className="min-w-0">
                    <h1 className="font-display text-[24px] font-bold leading-tight tracking-[-0.025em] text-[#15201E] sm:text-[28px]">
                        {title}
                    </h1>
                    {subtitle && <p className="mt-1 text-sm text-[#5C6E69]">{subtitle}</p>}
                </div>
            </div>
            <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end sm:gap-3">
                {onRefresh && (
                    <button
                        onClick={onRefresh}
                        className="rounded-[9px] border border-[rgba(21,32,30,.16)] bg-[#F4F0E8] p-2.5 transition-colors hover:bg-[#ECE5D8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF9E1B]/35"
                        aria-label="Rafraîchir"
                    >
                        <RefreshCw
                            className={cn("h-4 w-4 text-[#5C6E69]", isRefreshing && "animate-spin")}
                        />
                    </button>
                )}
                {actions}
            </div>
        </div>
    );
}

export default PageHeader;
