"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";

// ============================================
// SHARED WIZARD SHELL
// ============================================
// One chrome for every role wizard: progress rail, step transitions, footer.
// Rendered through a portal at z-1000 to sit above the app shell but below
// dropdowns (see the app's z-index convention).

export interface WizardStep {
    /** Short label shown in the progress rail. */
    label: string;
    title: string;
    subtitle?: string;
    icon: React.ElementType;
    /** Accent classes for the step medallion, e.g. "bg-blue-100 text-blue-600". */
    accent?: string;
    content: React.ReactNode;
    /** Block "Suivant" until the step is satisfied. */
    canAdvance?: boolean;
    /** Reason surfaced under the footer when canAdvance is false. */
    blockedHint?: string;
}

interface OnboardingWizardProps {
    isOpen: boolean;
    badge: string;
    heading: string;
    steps: WizardStep[];
    /** Runs on the final step's primary action. */
    onComplete: () => Promise<void> | void;
    completeLabel?: string;
    /** When set, a discreet "plus tard" escape is offered. */
    onSkip?: () => Promise<void> | void;
    skipLabel?: string;
}

export function OnboardingWizard({
    isOpen,
    badge,
    heading,
    steps,
    onComplete,
    completeLabel = "Terminer",
    onSkip,
    skipLabel = "Plus tard",
}: OnboardingWizardProps) {
    const [index, setIndex] = useState(0);
    const [busy, setBusy] = useState(false);

    if (!isOpen || steps.length === 0) return null;
    if (typeof document === "undefined") return null;

    const step = steps[Math.min(index, steps.length - 1)];
    const Icon = step.icon;
    const isFirst = index === 0;
    const isLast = index === steps.length - 1;
    const blocked = step.canAdvance === false;

    const handleNext = async () => {
        if (blocked) return;
        if (!isLast) {
            setIndex((i) => i + 1);
            return;
        }
        setBusy(true);
        try {
            await onComplete();
        } finally {
            setBusy(false);
        }
    };

    const handleSkip = async () => {
        if (!onSkip) return;
        setBusy(true);
        try {
            await onSkip();
        } finally {
            setBusy(false);
        }
    };

    return createPortal(
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 sm:p-6">
            <div className="absolute inset-0 bg-slate-900/55 backdrop-blur-[2px]" />

            <div className="relative w-full max-w-2xl max-h-[92dvh] overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/20 flex flex-col">
                {/* Header */}
                <div className="px-7 pt-7 pb-5 border-b border-slate-100">
                    <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                            <span className="inline-block text-[10px] font-black uppercase tracking-wider text-primary bg-blue-50 px-2.5 py-1 rounded-md">
                                {badge}
                            </span>
                            <h2 className="mt-2.5 text-xl font-black tracking-tight text-slate-900">
                                {heading}
                            </h2>
                        </div>
                        {onSkip && (
                            <button
                                type="button"
                                onClick={handleSkip}
                                disabled={busy}
                                className="flex-shrink-0 p-2 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors disabled:opacity-50"
                                aria-label={skipLabel}
                                title={skipLabel}
                            >
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>

                    {/* Progress rail */}
                    <div className="mt-5 flex items-center gap-2">
                        {steps.map((s, i) => (
                            <button
                                key={s.label}
                                type="button"
                                onClick={() => i < index && setIndex(i)}
                                disabled={i > index}
                                className={cn(
                                    "group flex-1 text-left",
                                    i < index ? "cursor-pointer" : "cursor-default",
                                )}
                            >
                                <div
                                    className={cn(
                                        "h-1.5 rounded-full transition-colors",
                                        i < index
                                            ? "bg-primary"
                                            : i === index
                                              ? "bg-primary"
                                              : "bg-slate-200",
                                    )}
                                />
                                <span
                                    className={cn(
                                        "mt-1.5 block text-[10px] font-bold uppercase tracking-wide truncate",
                                        i <= index ? "text-slate-600" : "text-slate-300",
                                    )}
                                >
                                    {s.label}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto px-7 py-6">
                    <div className="flex items-start gap-4 mb-5">
                        <div
                            className={cn(
                                "w-11 h-11 flex-shrink-0 rounded-2xl flex items-center justify-center",
                                step.accent ?? "bg-blue-100 text-blue-600",
                            )}
                        >
                            <Icon className="w-5 h-5" />
                        </div>
                        <div className="min-w-0 pt-0.5">
                            <h3 className="text-base font-bold text-slate-900 tracking-tight">
                                {step.title}
                            </h3>
                            {step.subtitle && (
                                <p className="mt-1 text-sm text-slate-500 leading-relaxed">
                                    {step.subtitle}
                                </p>
                            )}
                        </div>
                    </div>

                    <div key={index} className="onboarding-step-body">
                        {step.content}
                    </div>
                </div>

                {/* Footer */}
                <div className="px-7 py-5 border-t border-slate-100 bg-slate-50/60">
                    <div className="flex items-center justify-between gap-3">
                        <button
                            type="button"
                            onClick={() => setIndex((i) => Math.max(0, i - 1))}
                            disabled={isFirst || busy}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-200/70 disabled:opacity-0 disabled:pointer-events-none"
                        >
                            <ChevronLeft className="w-4 h-4" />
                            Retour
                        </button>

                        <div className="flex items-center gap-2">
                            <span className="text-[11px] font-bold text-slate-400 tabular-nums">
                                {index + 1} / {steps.length}
                            </span>
                            <button
                                type="button"
                                onClick={handleNext}
                                disabled={blocked || busy}
                                className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#1B7BE0] disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {busy ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : isLast ? null : (
                                    <ChevronRight className="w-4 h-4 order-2" />
                                )}
                                {isLast ? completeLabel : "Suivant"}
                            </button>
                        </div>
                    </div>

                    {blocked && step.blockedHint && (
                        <p className="mt-2.5 text-right text-[11px] font-semibold text-amber-600">
                            {step.blockedHint}
                        </p>
                    )}
                </div>
            </div>
        </div>,
        document.body,
    );
}

// ============================================
// Small presentational helpers reused by the wizards
// ============================================

export function InfoTile({
    label,
    value,
    tone = "neutral",
    hint,
}: {
    label: string;
    value: string;
    tone?: "neutral" | "success" | "warning";
    hint?: string;
}) {
    const tones = {
        neutral: "border-slate-200 bg-white",
        success: "border-emerald-200 bg-emerald-50",
        warning: "border-amber-200 bg-amber-50",
    } as const;

    return (
        <div className={cn("rounded-2xl border px-4 py-3", tones[tone])}>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
            <p className="mt-1 text-sm font-bold text-slate-900 break-words">{value}</p>
            {hint && <p className="mt-0.5 text-[11px] text-slate-500">{hint}</p>}
        </div>
    );
}

export function BulletList({ items }: { items: string[] }) {
    return (
        <ul className="space-y-2.5">
            {items.map((item) => (
                <li key={item} className="flex items-start gap-2.5">
                    <span className="mt-1.5 w-1.5 h-1.5 flex-shrink-0 rounded-full bg-primary" />
                    <span className="text-sm text-slate-600 leading-relaxed">{item}</span>
                </li>
            ))}
        </ul>
    );
}
