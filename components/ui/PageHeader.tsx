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
                    "relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#060911] via-[#0B0F19] to-[#04060B] p-6 text-white sm:p-8 border border-slate-800/80 shadow-md",
                    className
                )}
            >
                <div className="relative z-10">
                    {icon && (
                        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-primary">
                            {icon}
                        </div>
                    )}
                    <h1 className="font-display mb-2 text-3xl font-bold tracking-tight text-white">
                        {title}
                    </h1>
                    {subtitle && <p className="max-w-xl text-slate-300 text-sm leading-relaxed">{subtitle}</p>}
                    {actions && <div className="mt-6 flex flex-wrap items-center gap-3">{actions}</div>}
                </div>
            </div>
        );
    }

    return (
        <div className={cn("flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-5", className)}>
            <div className="flex min-w-0 items-start gap-3">
                {icon && (
                    <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary-light text-primary">
                        {icon}
                    </div>
                )}
                <div className="min-w-0">
                    <h1 className="font-display text-[24px] font-bold leading-tight tracking-tight text-ink sm:text-[28px]">
                        {title}
                    </h1>
                    {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
                </div>
            </div>
            <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end sm:gap-3">
                {onRefresh && (
                    <button
                        onClick={onRefresh}
                        className="rounded-xl border border-border bg-surface p-2.5 transition-colors hover:bg-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35"
                        aria-label="Rafraîchir"
                    >
                        <RefreshCw
                            className={cn("h-4 w-4 text-muted", isRefreshing && "animate-spin")}
                        />
                    </button>
                )}
                {actions}
            </div>
        </div>
    );
}

export default PageHeader;
