"use client";

import React from "react";
import { cn } from "@/lib/utils";
import {
    Inbox,
    Flame,
    Send,
    Eye,
    Zap,
    AlertTriangle,
    ArrowUpRight,
    CheckCircle2,
    ShieldAlert,
} from "lucide-react";
import { Skeleton } from "@/components/ui/Skeleton";

// ============================================
// ZONE A — Health Pulse Strip
// Single row of clickable, executive metric pills
// ============================================

interface HealthData {
    activeMailboxes: number;
    warmingMailboxes: number;
    sentToday: number;
    openRate: number;
    activeSequences: number;
    errorMailboxes: number;
}

interface HealthPulseProps {
    data: HealthData | null;
    isLoading: boolean;
    onNavigate: (tab: string) => void;
}

interface PillProps {
    icon: React.ReactNode;
    label: string;
    value: string | number;
    sublabel?: string;
    color: "slate" | "amber" | "blue" | "emerald" | "purple" | "red";
    onClick: () => void;
    pulse?: boolean;
    badge?: string;
}

const colorMap = {
    slate: {
        bg: "bg-white hover:bg-slate-50 border-slate-200/80 hover:border-slate-300",
        iconBg: "bg-slate-100 text-slate-600",
        value: "text-slate-900",
        label: "text-slate-500",
        sublabel: "text-slate-400",
        badge: "bg-slate-100 text-slate-600",
        glow: "hover:shadow-slate-200/50",
    },
    amber: {
        bg: "bg-white hover:bg-amber-50/40 border-amber-200/80 hover:border-amber-300",
        iconBg: "bg-amber-100 text-amber-600",
        value: "text-amber-900",
        label: "text-slate-600",
        sublabel: "text-amber-600",
        badge: "bg-amber-100/80 text-amber-700",
        glow: "hover:shadow-amber-500/10",
    },
    blue: {
        bg: "bg-white hover:bg-blue-50/40 border-blue-200/80 hover:border-blue-300",
        iconBg: "bg-blue-100 text-primary",
        value: "text-slate-900",
        label: "text-slate-600",
        sublabel: "text-blue-600",
        badge: "bg-blue-100/80 text-[#1a75ce]",
        glow: "hover:shadow-blue-500/10",
    },
    emerald: {
        bg: "bg-white hover:bg-emerald-50/40 border-emerald-200/80 hover:border-emerald-300",
        iconBg: "bg-emerald-100 text-emerald-600",
        value: "text-emerald-950",
        label: "text-slate-600",
        sublabel: "text-emerald-600",
        badge: "bg-emerald-100/80 text-emerald-700",
        glow: "hover:shadow-emerald-500/10",
    },
    purple: {
        bg: "bg-white hover:bg-purple-50/40 border-purple-200/80 hover:border-purple-300",
        iconBg: "bg-purple-100 text-purple-600",
        value: "text-purple-950",
        label: "text-slate-600",
        sublabel: "text-purple-600",
        badge: "bg-purple-100/80 text-purple-700",
        glow: "hover:shadow-purple-500/10",
    },
    red: {
        bg: "bg-red-50/80 hover:bg-red-100/60 border-red-200 hover:border-red-300",
        iconBg: "bg-red-100 text-red-600",
        value: "text-red-950",
        label: "text-red-700",
        sublabel: "text-red-600 font-bold",
        badge: "bg-red-200 text-red-800",
        glow: "hover:shadow-red-500/15 shadow-sm shadow-red-500/10",
    },
};

function Pill({ icon, label, value, sublabel, color, onClick, pulse, badge }: PillProps) {
    const c = colorMap[color];
    return (
        <button
            onClick={onClick}
            className={cn(
                "relative flex items-center gap-3 px-4 py-3 rounded-2xl border transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 group text-left flex-shrink-0 min-w-[200px]",
                c.bg,
                c.glow
            )}
        >
            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-105", c.iconBg)}>
                {icon}
            </div>

            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 justify-between">
                    <span className={cn("text-[11px] font-semibold tracking-tight truncate", c.label)}>
                        {label}
                    </span>
                    {badge && (
                        <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded-full", c.badge)}>
                            {badge}
                        </span>
                    )}
                </div>

                <div className="flex items-baseline gap-2 mt-0.5">
                    <span className={cn("text-xl font-black tabular-nums tracking-tight", c.value)}>
                        {value}
                    </span>
                    {sublabel && (
                        <span className={cn("text-[11px] font-medium truncate", c.sublabel)}>
                            {sublabel}
                        </span>
                    )}
                </div>
            </div>

            {pulse && (
                <span className="absolute top-2.5 right-2.5 flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
                </span>
            )}
        </button>
    );
}

export function HealthPulse({ data, isLoading, onNavigate }: HealthPulseProps) {
    if (isLoading || !data) {
        return (
            <div className="flex gap-3.5 overflow-x-auto pb-2 email-scrollbar">
                {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-16 w-52 rounded-2xl flex-shrink-0" />
                ))}
            </div>
        );
    }

    return (
        <div className="flex gap-3.5 overflow-x-auto pb-2 email-scrollbar">
            <Pill
                icon={<Inbox className="w-5 h-5" />}
                label="Boîtes actives"
                value={data.activeMailboxes}
                sublabel="connectées"
                color="blue"
                onClick={() => onNavigate("mailboxes")}
            />
            <Pill
                icon={<Flame className="w-5 h-5" />}
                label="Chauffe / Warmup"
                value={data.warmingMailboxes}
                sublabel={data.warmingMailboxes > 0 ? "en montée" : "aucune"}
                color={data.warmingMailboxes > 0 ? "amber" : "slate"}
                onClick={() => onNavigate("mailboxes")}
                badge={data.warmingMailboxes > 0 ? "Actif" : undefined}
            />
            <Pill
                icon={<Send className="w-5 h-5" />}
                label="Envoyés ce jour"
                value={data.sentToday}
                sublabel="messages"
                color="emerald"
                onClick={() => onNavigate("sent")}
            />
            <Pill
                icon={<Eye className="w-5 h-5" />}
                label="Taux d'ouverture"
                value={`${data.openRate}%`}
                sublabel="global"
                color="purple"
                onClick={() => onNavigate("analytics")}
                badge={data.openRate >= 40 ? "Excellent" : data.openRate >= 20 ? "Correct" : undefined}
            />
            <Pill
                icon={<Zap className="w-5 h-5" />}
                label="Séquences actives"
                value={data.activeSequences}
                sublabel="en cours"
                color="blue"
                onClick={() => onNavigate("sequences")}
            />
            {data.errorMailboxes > 0 ? (
                <Pill
                    icon={<AlertTriangle className="w-5 h-5" />}
                    label="Boîtes en alerte"
                    value={data.errorMailboxes}
                    sublabel="action requise"
                    color="red"
                    onClick={() => onNavigate("mailboxes")}
                    pulse
                    badge="Attention"
                />
            ) : (
                <Pill
                    icon={<CheckCircle2 className="w-5 h-5" />}
                    label="Santé système"
                    value="100%"
                    sublabel="SPF & DKIM ok"
                    color="emerald"
                    onClick={() => onNavigate("mailboxes")}
                />
            )}
        </div>
    );
}

export default HealthPulse;
