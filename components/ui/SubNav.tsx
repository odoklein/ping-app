"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SubNavItem {
    href: string;
    label: string;
    icon: LucideIcon;
    exact?: boolean;
    permission?: string;
}

interface SubNavProps {
    items: SubNavItem[];
    eyebrow?: string;
    className?: string;
    tone?: "default" | "email";
    "aria-label"?: string;
}

function isItemActive(pathname: string, item: SubNavItem): boolean {
    if (item.exact) return pathname === item.href;
    return pathname === item.href || pathname.startsWith(item.href + "/");
}

export function SubNav({
    items,
    eyebrow,
    className,
    tone = "default",
    "aria-label": ariaLabel,
}: SubNavProps) {
    const pathname = usePathname();

    return (
        <div className="flex flex-col gap-4">
            {eyebrow && (
                <p className="text-xs font-semibold text-muted uppercase tracking-wider">
                    {eyebrow}
                </p>
            )}
            <nav
                className={cn(
                    "flex items-center gap-1 p-1 rounded-xl border border-border bg-subtle overflow-x-auto",
                    className
                )}
                aria-label={ariaLabel ?? eyebrow ?? "Sub-navigation"}
            >
                {items.map((item) => {
                    const Icon = item.icon;
                    const isActive = isItemActive(pathname, item);
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            aria-current={isActive ? "page" : undefined}
                            className={cn(
                                "flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors",
                                isActive
                                    ? "bg-surface text-primary shadow-sm border border-border font-semibold"
                                    : "text-muted hover:text-ink hover:bg-surface/60"
                            )}
                        >
                            <Icon className="w-4 h-4 flex-shrink-0" />
                            {item.label}
                        </Link>
                    );
                })}
            </nav>
        </div>
    );
}

export default SubNav;
