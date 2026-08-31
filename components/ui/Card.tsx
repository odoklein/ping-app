import { cn } from "@/lib/utils";
import { HTMLAttributes, forwardRef } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
    variant?: "default" | "glass" | "elevated";
}

const CARD_VARIANTS: Record<string, string> = {
    default: "bg-[#F4F0E8] border border-[rgba(21,32,30,.13)]",
    glass: "bg-[#F4F0E8]/92 backdrop-blur-xl border border-[rgba(21,32,30,.13)]",
    elevated:
        "bg-[#F4F0E8] border border-[rgba(21,32,30,.13)] shadow-[0_18px_50px_rgba(12,59,56,.09)]",
};

const Card = forwardRef<HTMLDivElement, CardProps>(
    ({ className, variant = "default", children, ...props }, ref) => {
        return (
            <div
                ref={ref}
                className={cn(
                    "rounded-[14px] p-6 transition-all duration-200",
                    CARD_VARIANTS[variant],
                    className
                )}
                {...props}
            >
                {children}
            </div>
        );
    }
);

Card.displayName = "Card";

interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> { }

const CardHeader = forwardRef<HTMLDivElement, CardHeaderProps>(
    ({ className, ...props }, ref) => (
        <div ref={ref} className={cn("mb-4", className)} {...props} />
    )
);

CardHeader.displayName = "CardHeader";

interface CardTitleProps extends HTMLAttributes<HTMLHeadingElement> { }

const CardTitle = forwardRef<HTMLHeadingElement, CardTitleProps>(
    ({ className, ...props }, ref) => (
        <h3
            ref={ref}
            className={cn("font-display text-lg font-bold tracking-[-0.015em] text-[#15201E]", className)}
            {...props}
        />
    )
);

CardTitle.displayName = "CardTitle";

interface CardContentProps extends HTMLAttributes<HTMLDivElement> { }

const CardContent = forwardRef<HTMLDivElement, CardContentProps>(
    ({ className, ...props }, ref) => (
        <div ref={ref} className={cn("", className)} {...props} />
    )
);

CardContent.displayName = "CardContent";

export { Card, CardHeader, CardTitle, CardContent };
