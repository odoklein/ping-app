import { cn } from "@/lib/utils";

interface CadenceBarsProps {
    className?: string;
    count?: number;
    highlightFrom?: number;
    dark?: boolean;
}

export function CadenceBars({
    className,
    count = 36,
    highlightFrom = 0.72,
    dark = false,
}: CadenceBarsProps) {
    return (
        <div className={cn("elan-cadence", dark && "elan-cadence-dark", className)} aria-hidden="true">
            {Array.from({ length: count }).map((_, index) => {
                const progress = count === 1 ? 1 : index / (count - 1);
                const height = 10 + Math.pow(progress, 1.7) * 90;
                return (
                    <span
                        key={index}
                        className={progress >= highlightFrom ? "is-lit" : undefined}
                        style={{ height: `${height}%` }}
                    />
                );
            })}
        </div>
    );
}

export default CadenceBars;
