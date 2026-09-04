import { cn } from "@/lib/utils";
import { HTMLAttributes, forwardRef } from "react";
import type { CompletenessStatus } from "@/lib/types";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
    variant?: "default" | "primary" | "success" | "warning" | "danger" | "outline";
    status?: CompletenessStatus;
}

const BADGE_STATUS_VARIANTS: Record<CompletenessStatus, string> = {
    INCOMPLETE: "bg-red-50 text-red-700 border-red-200",
    PARTIAL: "bg-amber-50 text-amber-700 border-amber-200",
    ACTIONABLE: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

const BADGE_VARIANTS: Record<string, string> = {
    default: "bg-subtle text-ink border-border",
    primary: "bg-primary-light text-primary border-primary/20",
    success: "bg-emerald-50 text-emerald-700 border-emerald-200",
    warning: "bg-amber-50 text-amber-700 border-amber-200",
    danger: "bg-red-50 text-red-700 border-red-200",
    outline: "bg-transparent text-muted border-border-strong",
};

const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
    ({ className, variant = "default", status, children, ...props }, ref) => {
        const variantStyle = status ? BADGE_STATUS_VARIANTS[status] : BADGE_VARIANTS[variant];

        return (
            <span
                ref={ref}
                className={cn(
                    "inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full border",
                    variantStyle,
                    className
                )}
                {...props}
            >
                {status && (
                    <span
                        className={cn("w-1.5 h-1.5 rounded-full", {
                            "bg-red-400": status === "INCOMPLETE",
                            "bg-amber-400": status === "PARTIAL",
                            "bg-emerald-400": status === "ACTIONABLE",
                        })}
                    />
                )}
                {children}
            </span>
        );
    }
);

Badge.displayName = "Badge";

export default Badge;
export { Badge };
