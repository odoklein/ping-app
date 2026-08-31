"use client";

import { CheckCircle2, Clock3, ListTodo, UserRoundSearch } from "lucide-react";
import { cn } from "@/lib/utils";

interface QueueSummaryProps {
    completed: number;
    remaining: number;
    urgentCallbacks: number;
    untouched: number;
    className?: string;
}

const ITEMS = [
    {
        key: "completed",
        label: "Actions réalisées",
        note: "Depuis le début de la session",
        icon: CheckCircle2,
        tone: "bg-emerald-50 text-emerald-700 border-emerald-100",
    },
    {
        key: "remaining",
        label: "Actions restantes",
        note: "Dans la file affichée",
        icon: ListTodo,
        tone: "bg-[#e8f1ee] text-[#1f4d47] border-[#d8e5e0]",
    },
    {
        key: "urgentCallbacks",
        label: "Rappels urgents",
        note: "À traiter sous 24 heures",
        icon: Clock3,
        tone: "bg-amber-50 text-amber-700 border-amber-100",
    },
    {
        key: "untouched",
        label: "Jamais contactés",
        note: "Contacts encore vierges",
        icon: UserRoundSearch,
        tone: "bg-slate-50 text-slate-600 border-slate-200",
    },
] as const;

export function QueueSummary({
    completed,
    remaining,
    urgentCallbacks,
    untouched,
    className,
}: QueueSummaryProps) {
    const values = { completed, remaining, urgentCallbacks, untouched };

    return (
        <section
            aria-label="Résumé de la file d'actions"
            className={cn("grid grid-cols-2 gap-2.5 lg:grid-cols-4", className)}
        >
            {ITEMS.map((item) => {
                const Icon = item.icon;
                return (
                    <div
                        key={item.key}
                        className="rounded-[14px] border border-[#dfe7e3] bg-white px-3.5 py-3 shadow-[0_8px_24px_-22px_rgba(12,59,56,0.55)]"
                    >
                        <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                                <p className="text-[10px] font-semibold uppercase tracking-[0.07em] text-slate-500">
                                    {item.label}
                                </p>
                                <p className="mt-1 text-[26px] font-semibold leading-none tracking-[-0.03em] text-[#15201e] tabular-nums">
                                    {values[item.key]}
                                </p>
                            </div>
                            <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] border", item.tone)}>
                                <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                            </span>
                        </div>
                        <p className="mt-2 truncate text-[10px] text-slate-400">{item.note}</p>
                    </div>
                );
            })}
        </section>
    );
}

