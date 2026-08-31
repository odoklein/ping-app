import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface CommsPageHeaderProps {
    title: string;
    subtitle?: string;
    icon?: ReactNode;
    actions?: ReactNode;
    className?: string;
}

export function CommsPageHeader({
    title,
    subtitle,
    icon,
    actions,
    className,
}: CommsPageHeaderProps) {
    return (
        <header
            className={cn(
                "flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between",
                className
            )}
        >
            <div className="flex min-w-0 items-center gap-3">
                {icon && (
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#0C3B38] text-white shadow-sm">
                        {icon}
                    </div>
                )}
                <div className="min-w-0">
                        <h1 className="truncate text-[17px] font-semibold tracking-[-0.02em] text-[#0C3B38] dark:text-white sm:text-lg">
                        {title}
                    </h1>
                    {subtitle && (
                        <p className="mt-0.5 truncate text-[11px] text-slate-500 dark:text-slate-400 sm:text-xs">
                            {subtitle}
                        </p>
                    )}
                </div>
            </div>
            <div className="flex w-full shrink-0 items-center justify-end gap-2 sm:w-auto">{actions}</div>
        </header>
    );
}
