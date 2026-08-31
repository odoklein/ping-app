"use client";

import { useState, useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import {
    Phone, RefreshCw, TrendingUp, ArrowUpRight, Flame, Trophy,
    Clock, ArrowRight, AlertTriangle, Calendar, ChevronDown, Target,
    Zap, Activity, Users, Star, CheckCircle2,
} from "lucide-react";
import Link from "next/link";
import {
    DateRangeFilter, getPresetRange, toISO,
    type DateRangeValue, type DateRangePreset,
} from "@/components/dashboard/DateRangeFilter";
import {
    AreaChart, Area, PieChart, Pie, Cell,
    LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from "recharts";
import { cn } from "@/lib/utils";

/* ─── Types ─── */
interface DashboardStats {
    period: string;
    totalActions: number;
    meetingsBooked: number;
    opportunities: number;
    activeMissions: number;
    conversionRate: number;
    resultBreakdown: {
        NO_RESPONSE: number; BAD_CONTACT: number; INTERESTED: number;
        CALLBACK_REQUESTED: number; MEETING_BOOKED: number; DISQUALIFIED: number;
    };
    leaderboard: { id: string; name: string; calls: number; connectedCalls: number; actions: number }[];
    rdvLeaderboard: { id: string; name: string; rdv: number; actions: number }[];
}
interface MissionSummaryItem {
    id: string; name: string; isActive: boolean;
    client: { id: string; name: string };
    sdrCount: number; actionsThisPeriod: number;
    meetingsThisPeriod: number; lastActionAt: string | null;
}
interface RecentActivityItem {
    id: string; user: string; userId: string; action: string; time: string;
    type: "call" | "meeting" | "schedule"; createdAt: string;
    result?: string; contactOrCompanyName?: string; campaignName?: string;
}

/* ─── Constants ─── */
const PRESET_LABELS: Record<DateRangePreset, string> = {
    last7: "7 derniers jours", last4weeks: "4 dernières semaines",
    lastMonth: "Mois dernier", last6months: "6 derniers mois",
    last12months: "12 derniers mois", monthToDate: "Mois en cours",
    quarterToDate: "Trimestre en cours", yearToDate: "Année en cours",
    allTime: "Tout",
};
const RDV_WEEKLY_GOAL = 30;
const PIE_LABELS: Record<string, string> = {
    MEETING_BOOKED: "RDV obtenu", CALLBACK_REQUESTED: "Rappel prévu",
    INTERESTED: "Intéressé", NO_RESPONSE: "Pas répondu",
    BAD_CONTACT: "Mauvais N.", DISQUALIFIED: "Hors cible",
};
const PIE_COLORS: Record<string, string> = {
    MEETING_BOOKED: "#2890F8", INTERESTED: "#5baefc",
    CALLBACK_REQUESTED: "#1a75ce", NO_RESPONSE: "#e4e4e4",
    BAD_CONTACT: "#d4d4d4", DISQUALIFIED: "#8d9b96",
};
const DAYS = ["L", "M", "Me", "J", "V", "S", "D"];
const EMPTY_MISSIONS: MissionSummaryItem[] = [];
const EMPTY_RECENT_ACTIVITY: RecentActivityItem[] = [];

/* ─── Helpers ─── */
function getInitials(name: string) {
    return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}
function buildSparklineData(n: number) {
    return DAYS.map((day, i) => {
        const cumul = Math.round(n * ((i + 1) / 7));
        const prev = i === 0 ? 0 : Math.round(n * (i / 7));
        return { day, rdv: Math.max(0, cumul - prev) };
    });
}
function buildWeeklyGoalData(n: number) {
    return DAYS.map((jour, i) => ({
        jour,
        objectif: Math.round((RDV_WEEKLY_GOAL / 7) * (i + 1) * 10) / 10,
        cumul: Math.round(n * ((i + 1) / 7)),
    }));
}

/* ─── Animated Counter ─── */
function useCountUp(target: number) {
    return target;
}

/* ─── Progress Ring ─── */
function ProgressRing({ pct, size = 56, stroke = 5, color = "#2890F8" }: {
    pct: number; size?: number; stroke?: number; color?: string;
}) {
    const r = (size - stroke) / 2;
    const circ = 2 * Math.PI * r;
    const offset = circ - (pct / 100) * circ;
    return (
        <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }} aria-hidden="true">
            <circle cx={size / 2} cy={size / 2} r={r} fill="none"
                stroke="rgba(255,255,255,0.12)" strokeWidth={stroke} />
            <circle cx={size / 2} cy={size / 2} r={r} fill="none"
                stroke={color} strokeWidth={stroke}
                strokeDasharray={circ} strokeDashoffset={offset}
                strokeLinecap="round"
                style={{ transition: "stroke-dashoffset 1s ease-out" }} />
        </svg>
    );
}

/* ─── Stat Card (dark hero) ─── */
function HeroKpiCard({ label, value, sub, pct, icon: Icon, sparkData }: {
    label: string; value: number; sub: string; pct: number;
    icon: typeof Trophy; sparkData: { day: string; rdv: number }[];
}) {
    const count = useCountUp(value);
    return (
        <div className="flex-[2] relative overflow-hidden rounded-2xl p-6 flex flex-col gap-3"
            style={{ background: "#080808" }}>
            {/* Glow blobs */}
            <div className="absolute -top-10 -right-10 w-44 h-44 rounded-full blur-3xl opacity-30"
                style={{ background: "radial-gradient(circle, #2890F8, transparent)" }} />
            <div className="absolute -bottom-10 -left-10 w-36 h-36 rounded-full blur-3xl opacity-15"
                style={{ background: "radial-gradient(circle, #1a75ce, transparent)" }} />

            <div className="relative z-10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center">
                        <Icon className="w-4 h-4 text-[#2890F8]" />
                    </div>
                    <span className="text-[13px] font-medium text-white/50">{label}</span>
                </div>
                <div className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/15 text-emerald-400">
                    <ArrowUpRight className="w-3 h-3" />
                    {pct.toFixed(1)}% conv.
                </div>
            </div>

            <div className="relative z-10 flex items-end gap-4">
                <div>
                    <div className="text-[56px] font-black text-white leading-none tracking-tighter">
                        {count}
                    </div>
                    <div className="text-[13px] text-white/30 mt-1">{sub}</div>
                </div>
                <div className="mb-2 flex flex-col items-center gap-0.5">
                    <ProgressRing pct={Math.min(100, (value / RDV_WEEKLY_GOAL) * 100)} size={52} stroke={5} color="#2890F8" />
                    <span className="text-[10px] text-white/40">{Math.round((value / RDV_WEEKLY_GOAL) * 100)}%</span>
                </div>
            </div>

            {/* Sparkline */}
            <div className="relative z-10 h-[42px] -mx-1 mt-1">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={sparkData}>
                        <defs>
                            <linearGradient id="spark-hero" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#2890F8" stopOpacity={0.35} />
                                <stop offset="100%" stopColor="#2890F8" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <Area type="monotone" dataKey="rdv" stroke="#2890F8" strokeWidth={2}
                            fill="url(#spark-hero)" />
                    </AreaChart>
                </ResponsiveContainer>
            </div>

            {/* Progress bar */}
            <div className="relative z-10">
                <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] text-white/30">Objectif hebdomadaire</span>
                    <span className="text-[11px] font-bold text-[#2890F8]">{Math.round((value / RDV_WEEKLY_GOAL) * 100)}%</span>
                </div>
                <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-1000"
                        style={{
                            width: `${Math.min(100, (value / RDV_WEEKLY_GOAL) * 100)}%`,
                            background: "linear-gradient(90deg, #2890F8, #1a75ce)",
                        }} />
                </div>
            </div>
        </div>
    );
}

/* ─── Mini KPI card ─── */
function MiniKpi({ label, value, suffix, icon: Icon, bgColor, iconColor, trend }: {
    label: string; value: number; suffix?: string;
    icon: typeof Phone; bgColor: string; iconColor: string; trend?: "up" | "down";
}) {
    const count = useCountUp(value);
    return (
        <div className="flex-1 bg-white rounded-2xl border border-slate-100 p-4 flex items-center justify-between group hover:shadow-md hover:border-[#D7E3DF] transition-all duration-200">
            <div>
                <div className="text-[11px] text-slate-400 font-medium mb-1 uppercase tracking-wider">{label}</div>
                <div className="flex items-end gap-1">
                    <span className="text-[28px] font-black text-slate-800 leading-none">{count}</span>
                    {suffix && <span className="text-[16px] text-slate-400 mb-0.5">{suffix}</span>}
                </div>
                {trend && (
                    <div className={cn("flex items-center gap-0.5 text-[10px] font-semibold mt-1",
                        trend === "up" ? "text-emerald-500" : "text-red-400"
                    )}>
                        {trend === "up" ? <ArrowUpRight className="w-3 h-3" /> : <TrendingUp className="w-3 h-3 rotate-180" />}
                        vs période précédente
                    </div>
                )}
            </div>
            <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center transition-transform duration-200 group-hover:scale-110", bgColor)}>
                <Icon className={cn("w-5 h-5", iconColor)} />
            </div>
        </div>
    );
}

/* ─── Custom Tooltip ─── */
function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-white border border-slate-100 rounded-xl p-3 shadow-xl text-[12px] min-w-[120px]">
            <p className="text-slate-500 mb-2 font-medium">{label}</p>
            {payload.map((p, i) => (
                <div key={i} className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
                    <span className="text-slate-600">{p.name}:</span>
                    <span className="font-bold text-slate-800">{p.value}</span>
                </div>
            ))}
        </div>
    );
}

/* ════════════════════════════════════════════════════════
   DASHBOARD DATA FETCH
════════════════════════════════════════════════════════ */
interface DashboardData {
    stats: DashboardStats | null;
    missions: MissionSummaryItem[];
    recentActivity: RecentActivityItem[];
}
async function fetchDashboardData(
    start: string,
    end: string,
    missionId: string
): Promise<DashboardData> {
    const statsUrl = `/api/stats?startDate=${start}&endDate=${end}${missionId ? `&missionId=${missionId}` : ""}`;
    const [statsRes, missionsRes, recentRes] = await Promise.all([
        fetch(statsUrl),
        fetch(`/api/stats/missions-summary?startDate=${start}&endDate=${end}&limit=10`),
        fetch("/api/actions/recent?limit=20"),
    ]);
    const [statsJson, missionsJson, recentJson] = await Promise.all([
        statsRes.json(), missionsRes.json(), recentRes.json(),
    ]);
    if (!statsRes.ok || !statsJson.success) {
        throw new Error(statsJson.error || "Impossible de charger le tableau de bord");
    }
    return {
        stats: statsJson.data,
        missions: missionsJson.success ? missionsJson.data?.missions ?? [] : [],
        recentActivity: recentJson.success ? recentJson.data ?? [] : [],
    };
}

/* ════════════════════════════════════════════════════════
   MAIN COMPONENT
════════════════════════════════════════════════════════ */
export default function ManagerDashboard() {
    const [dateRange, setDateRange] = useState<DateRangeValue>(() => {
        const { start, end } = getPresetRange("lastMonth");
        return { preset: "lastMonth", startDate: toISO(start), endDate: toISO(end) };
    });
    const [dateFilterOpen, setDateFilterOpen] = useState(false);
    const dateFilterRef = useRef<HTMLDivElement>(null);
    const [missionFilter, setMissionFilter] = useState("");

    const start = dateRange.startDate && dateRange.endDate
        ? dateRange.startDate
        : toISO(getPresetRange((dateRange.preset as DateRangePreset) || "lastMonth").start);
    const end = dateRange.startDate && dateRange.endDate
        ? dateRange.endDate
        : toISO(getPresetRange((dateRange.preset as DateRangePreset) || "lastMonth").end);

    const { data, error, isError, isLoading, isFetching, refetch } = useQuery({
        queryKey: ["manager", "dashboard", start, end, missionFilter],
        queryFn: () => fetchDashboardData(start, end, missionFilter),
        refetchInterval: 60_000,
    });
    const stats = data?.stats ?? null;
    const missions = data?.missions ?? EMPTY_MISSIONS;
    const recentActivity = data?.recentActivity ?? EMPTY_RECENT_ACTIVITY;

    const rdvGoalPct = stats ? Math.min((stats.meetingsBooked / RDV_WEEKLY_GOAL) * 100, 100) : 0;
    const hotLeads = stats ? (stats.resultBreakdown.INTERESTED + stats.resultBreakdown.CALLBACK_REQUESTED) : 0;
    const callbackCount = stats?.resultBreakdown?.CALLBACK_REQUESTED ?? 0;

    const rdvActivity = useMemo(() => recentActivity.filter((a) => a.type === "meeting" || a.result === "MEETING_BOOKED"), [recentActivity]);
    const missionsNearGoal = useMemo(() => missions.filter((m) => m.isActive && m.meetingsThisPeriod > 0).sort((a, b) => b.meetingsThisPeriod - a.meetingsThisPeriod).slice(0, 5), [missions]);
    const totalResults = useMemo(() => stats?.resultBreakdown ? Object.values(stats.resultBreakdown).reduce((a, b) => a + b, 0) : 0, [stats]);
    const callResultsPieData = useMemo(() => stats?.resultBreakdown ? Object.entries(stats.resultBreakdown).filter(([, v]) => v > 0).map(([key, value]) => ({ name: PIE_LABELS[key] ?? key, value, color: PIE_COLORS[key] ?? "#94A3B8", pct: totalResults > 0 ? Math.round((value / totalResults) * 100) : 0 })) : [], [stats, totalResults]);
    const sparklineData = useMemo(() => buildSparklineData(stats?.meetingsBooked ?? 0), [stats?.meetingsBooked]);
    const weeklyGoalData = useMemo(() => buildWeeklyGoalData(stats?.meetingsBooked ?? 0), [stats?.meetingsBooked]);

    if (isLoading && !stats) {
        return (
            <div className="elan-page min-h-[60dvh]" aria-busy="true" aria-label="Chargement du tableau de bord">
                <div className="space-y-4">
                    <div className="h-10 w-72 max-w-full skeleton-shimmer rounded-xl" />
                    <div className="grid grid-cols-1 lg:grid-cols-[2fr_1.2fr] gap-4">
                        <div className="h-64 skeleton-shimmer rounded-xl" />
                        <div className="grid gap-3"><div className="h-20 skeleton-shimmer rounded-xl" /><div className="h-20 skeleton-shimmer rounded-xl" /><div className="h-20 skeleton-shimmer rounded-xl" /></div>
                    </div>
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4"><div className="h-72 skeleton-shimmer rounded-xl" /><div className="h-72 skeleton-shimmer rounded-xl" /></div>
                </div>
            </div>
        );
    }

    if (isError && !data) {
        return (
            <div className="elan-page min-h-[60dvh] items-center justify-center">
                <div className="w-full max-w-md rounded-xl border border-red-200 bg-white p-6 text-center shadow-sm" role="alert">
                    <AlertTriangle className="mx-auto mb-3 h-8 w-8 text-red-500" />
                    <h1 className="text-lg font-bold text-slate-900">Tableau de bord indisponible</h1>
                    <p className="mt-2 text-sm text-slate-600">{error instanceof Error ? error.message : "Une erreur inattendue est survenue."}</p>
                    <button onClick={() => refetch()} className="mt-5 inline-flex h-10 items-center gap-2 rounded-lg border border-[#CBD8D4] bg-white px-4 text-sm font-bold text-[#1F4D47] hover:bg-[#EEF3F1] active:translate-y-px">
                        <RefreshCw className="h-4 w-4" /> Réessayer
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="elan-page manager-command-center">

            {/* ── Page Header ── */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <div className="w-8 h-8 rounded-xl bg-[#1F4D47] flex items-center justify-center shadow-lg shadow-[#1F4D47]/20">
                            <Activity className="w-4 h-4 text-white" />
                        </div>
                        <h1 className="text-[22px] font-black text-slate-900 tracking-tight">Tableau de bord</h1>
                    </div>
                    <p className="text-[12px] text-slate-400 ml-10">
                        <span className="font-medium text-slate-500">
                            {dateRange.preset ? PRESET_LABELS[dateRange.preset] : dateRange.startDate && dateRange.endDate
                                ? `Du ${new Date(dateRange.startDate).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })} au ${new Date(dateRange.endDate).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}`
                                : "Période"}
                        </span>
                        {" / "}{missionFilter ? "Mission sélectionnée" : "Toutes les missions"}
                    </p>
                </div>

                <div className="flex items-center gap-2.5 flex-wrap">
                    {/* Date filter */}
                    <div className="relative" ref={dateFilterRef}>
                        <button onClick={() => setDateFilterOpen((o) => !o)}
                            aria-expanded={dateFilterOpen}
                            aria-label="Choisir la période"
                            className="flex items-center gap-2 px-3.5 py-2 text-[12px] font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:border-[#AFC5BF] hover:shadow-sm transition-all duration-150 shadow-sm">
                            <Calendar className="w-3.5 h-3.5 text-[#2F6B62]" />
                            <span>{dateRange.preset ? PRESET_LABELS[dateRange.preset] : "Plage"}</span>
                            <ChevronDown className={cn("w-3.5 h-3.5 text-slate-400 transition-transform", dateFilterOpen && "rotate-180")} />
                        </button>
                        {dateFilterOpen && (
                            <>
                                <div className="fixed inset-0 z-40" aria-hidden onClick={() => setDateFilterOpen(false)} />
                                <div className="absolute right-0 top-full mt-2 z-50 max-w-[calc(100vw-2rem)]">
                                    <DateRangeFilter value={dateRange} onChange={(v) => setDateRange(v)} onClose={() => setDateFilterOpen(false)} isOpen />
                                </div>
                            </>
                        )}
                    </div>

                    {/* Mission filter */}
                    <select value={missionFilter} onChange={(e) => setMissionFilter(e.target.value)} aria-label="Filtrer par mission"
                        className="px-3.5 py-2 text-[12px] font-medium text-slate-700 bg-white border border-slate-200 rounded-xl min-w-[160px] focus:outline-none focus:ring-2 focus:ring-[#FF9E1B]/25 focus:border-[#E07C00] shadow-sm">
                        <option value="">Toutes les missions</option>
                        {missions.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                    </select>

                    {/* Refresh */}
                    <button onClick={() => refetch()} disabled={isFetching}
                        aria-label="Actualiser le tableau de bord"
                        className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-[#1F4D47] hover:border-[#AFC5BF] hover:shadow-sm transition-all duration-150 shadow-sm disabled:opacity-50">
                        <RefreshCw className={cn("w-3.5 h-3.5", isFetching && "animate-spin")} />
                    </button>

                    {/* New mission CTA */}
                    <Link href="/manager/missions/new"
                        className="flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-bold text-[#15201E] border border-[#E07C00] shadow-lg hover:scale-[1.02] transition-all duration-150"
                        style={{ background: "#FF9E1B" }}>
                        <span className="text-lg leading-none">+</span>
                        <span>Nouvelle mission</span>
                    </Link>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                {[
                    { href: "/manager/prospection", label: "Appels réalisés", value: stats?.totalActions ?? 0, note: "Actions sur la période", icon: Phone, tone: "eucalyptus" },
                    { href: "/manager/rdv", label: "RDV obtenus", value: stats?.meetingsBooked ?? 0, note: `${Math.round(rdvGoalPct)}% de l'objectif`, icon: Trophy, tone: "petrol" },
                    { href: "/manager/prospection", label: "Leads chauds", value: hotLeads, note: `${callbackCount} rappels à traiter`, icon: Flame, tone: "amber" },
                    { href: "/manager/analytics", label: "Taux de conversion", value: `${Math.round((stats?.conversionRate ?? 0) * 10) / 10}%`, note: "Performance commerciale", icon: TrendingUp, tone: "success" },
                ].map((item) => {
                    const Icon = item.icon;
                    const dark = item.tone === "petrol";
                    return (
                        <Link
                            key={item.label}
                            href={item.href}
                            className={cn(
                                "group relative min-h-[176px] overflow-hidden rounded-2xl border p-5 shadow-[0_12px_34px_-24px_rgba(12,59,56,0.45)] transition-all duration-150 hover:-translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0c3b38]/35",
                                dark ? "border-[#173f3b] bg-[#0c3b38] text-white" : "border-[#dfe7e3] bg-white text-[#15201e]"
                            )}
                        >
                            <div className="flex items-start justify-between">
                                <span className={cn(
                                    "flex h-10 w-10 items-center justify-center rounded-xl",
                                    item.tone === "amber" && "bg-amber-50 text-amber-700",
                                    item.tone === "success" && "bg-emerald-50 text-emerald-700",
                                    item.tone === "eucalyptus" && "bg-[#e8f1ee] text-[#1f4d47]",
                                    dark && "bg-white/10 text-[#ffb64f]"
                                )}><Icon className="h-4.5 w-4.5" /></span>
                                <ArrowUpRight className={cn("h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5", dark ? "text-white/45" : "text-slate-300")} />
                            </div>
                            <p className={cn("mt-5 text-[11px] font-semibold uppercase tracking-[0.08em]", dark ? "text-white/55" : "text-slate-500")}>{item.label}</p>
                            <p className="mt-1 text-[38px] font-bold leading-none tracking-[-0.04em] tabular-nums">{item.value}</p>
                            <p className={cn("mt-3 text-xs", dark ? "text-white/50" : "text-slate-500")}>{item.note}</p>
                        </Link>
                    );
                })}
            </div>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
                <section className="rounded-2xl border border-[#dfe7e3] bg-white p-5 shadow-[0_14px_38px_-28px_rgba(12,59,56,0.5)] xl:col-span-7">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <h2 className="text-[15px] font-semibold text-[#15201e]">Performance de l&apos;équipe</h2>
                            <p className="mt-1 text-xs text-slate-500">Progression cumulée des rendez-vous</p>
                        </div>
                        <div className="flex items-center gap-4 text-[11px] font-medium text-slate-500">
                            <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[#080808]" />Réalisé</span>
                            <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[#2890F8]" />Objectif</span>
                        </div>
                    </div>
                    <div className="mt-5 h-[245px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={weeklyGoalData}>
                                <defs>
                                    <linearGradient id="manager-performance-fill" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#2890F8" stopOpacity={0.25} />
                                        <stop offset="100%" stopColor="#2890F8" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <XAxis dataKey="jour" tick={{ fontSize: 11, fill: "#71817c" }} axisLine={false} tickLine={false} />
                                <YAxis hide />
                                <Tooltip content={<CustomTooltip />} />
                                <Line type="monotone" dataKey="objectif" stroke="#2890F8" strokeWidth={1.5} strokeDasharray="4 4" dot={false} name="Objectif" />
                                <Area type="monotone" dataKey="cumul" stroke="#080808" strokeWidth={2.5} fill="url(#manager-performance-fill)" name="Réalisé" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="grid grid-cols-3 divide-x divide-[#e5ebe8] border-t border-[#e5ebe8] pt-4">
                        <div><p className="text-[10px] uppercase tracking-wide text-slate-400">Actions</p><p className="mt-1 text-lg font-semibold tabular-nums">{stats?.totalActions ?? 0}</p></div>
                        <div className="pl-4"><p className="text-[10px] uppercase tracking-wide text-slate-400">RDV</p><p className="mt-1 text-lg font-semibold tabular-nums">{stats?.meetingsBooked ?? 0}</p></div>
                        <div className="pl-4"><p className="text-[10px] uppercase tracking-wide text-slate-400">Conversion</p><p className="mt-1 text-lg font-semibold tabular-nums">{Math.round((stats?.conversionRate ?? 0) * 10) / 10}%</p></div>
                    </div>
                </section>

                <section className="rounded-2xl border border-[#dfe7e3] bg-white p-5 shadow-[0_14px_38px_-28px_rgba(12,59,56,0.5)] xl:col-span-5">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-[15px] font-semibold text-[#15201e]">À traiter maintenant</h2>
                            <p className="mt-1 text-xs text-slate-500">Les priorités commerciales de l&apos;équipe</p>
                        </div>
                        <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700">{callbackCount + (stats?.resultBreakdown?.INTERESTED ?? 0)} signaux</span>
                    </div>
                    <div className="mt-5 divide-y divide-[#edf1ef]">
                        {[
                            { href: "/manager/prospection", icon: Clock, label: "Rappels planifiés", help: "À recontacter en priorité", value: callbackCount, cls: "bg-amber-50 text-amber-700" },
                            { href: "/manager/prospection", icon: Star, label: "Contacts intéressés", help: "Signal de conversion élevé", value: stats?.resultBreakdown?.INTERESTED ?? 0, cls: "bg-emerald-50 text-emerald-700" },
                            { href: "/manager/rdv", icon: CheckCircle2, label: "Rendez-vous obtenus", help: "À préparer avec les SDR", value: stats?.meetingsBooked ?? 0, cls: "bg-[#e8f1ee] text-[#1f4d47]" },
                        ].map((row) => {
                            const Icon = row.icon;
                            return (
                                <Link key={row.label} href={row.href} className="group flex items-center gap-3 rounded-xl px-1 py-3.5 hover:bg-[#fbfaf7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0c3b38]/25">
                                    <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl", row.cls)}><Icon className="h-4 w-4" /></span>
                                    <span className="min-w-0 flex-1"><span className="block text-[13px] font-semibold text-[#263735]">{row.label}</span><span className="block text-[11px] text-slate-500">{row.help}</span></span>
                                    <span className="text-xl font-semibold tabular-nums text-[#15201e]">{row.value}</span>
                                    <ArrowRight className="h-4 w-4 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-[#1f4d47]" />
                                </Link>
                            );
                        })}
                    </div>
                </section>

                <section className="rounded-2xl border border-[#dfe7e3] bg-white p-5 shadow-[0_14px_38px_-28px_rgba(12,59,56,0.5)] xl:col-span-7">
                    <div className="flex items-center justify-between gap-3">
                        <div><h2 className="text-[15px] font-semibold text-[#15201e]">Progression des missions</h2><p className="mt-1 text-xs text-slate-500">Classement par rendez-vous obtenus</p></div>
                        <Link href="/manager/missions" className="text-xs font-semibold text-[#1f4d47] hover:text-[#c96600]">Voir toutes</Link>
                    </div>
                    {missionsNearGoal.length === 0 ? (
                        <div className="py-10 text-center"><Target className="mx-auto h-7 w-7 text-slate-300" /><p className="mt-2 text-sm text-slate-500">Aucune mission active sur cette période.</p><Link href="/manager/missions/new" className="mt-3 inline-flex text-xs font-semibold text-[#1f4d47]">Créer une mission</Link></div>
                    ) : (
                        <div className="mt-5 divide-y divide-[#edf1ef]">
                            {missionsNearGoal.map((m) => {
                                const goal = 20;
                                const pct = Math.min(100, Math.round((m.meetingsThisPeriod / goal) * 100));
                                const fill = pct >= 100 ? "#237d63" : pct >= 80 ? "#c96600" : pct >= 40 ? "#ed7f00" : "#9eb6ae";
                                return (
                                    <Link key={m.id} href={`/manager/missions/${m.id}`} className="group block py-4 first:pt-0 last:pb-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0c3b38]/25">
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="min-w-0"><p className="truncate text-[13px] font-semibold text-[#263735] group-hover:text-[#1f4d47]">{m.name} <span className="font-normal text-slate-400">· {m.client.name}</span></p><p className="mt-1 text-[11px] text-slate-500">{m.sdrCount} SDR · {m.actionsThisPeriod} actions</p></div>
                                            <div className="flex items-center gap-2"><span className="text-xs font-semibold tabular-nums">{m.meetingsThisPeriod}/{goal}</span><ArrowRight className="h-3.5 w-3.5 text-slate-300 opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100" /></div>
                                        </div>
                                        <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-[#edf1ef]"><div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${pct}%`, background: fill }} /></div>
                                    </Link>
                                );
                            })}
                        </div>
                    )}
                </section>

                <section className="rounded-2xl border border-[#dfe7e3] bg-white p-5 shadow-[0_14px_38px_-28px_rgba(12,59,56,0.5)] xl:col-span-5">
                    <div className="flex items-center justify-between gap-3">
                        <div><h2 className="text-[15px] font-semibold text-[#15201e]">Performance SDR</h2><p className="mt-1 text-xs text-slate-500">Rendez-vous et activité commerciale</p></div>
                        <span className={cn("rounded-full px-2.5 py-1 text-[11px] font-semibold", rdvGoalPct >= 80 ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700")}>{Math.round(rdvGoalPct)}% objectif</span>
                    </div>
                    {stats?.rdvLeaderboard?.length ? (
                        <div className="mt-4 space-y-1">
                            {stats.rdvLeaderboard.slice(0, 6).map((person, i) => {
                                const callStats = stats.leaderboard.find((entry) => entry.id === person.id);
                                const maxRdv = stats.rdvLeaderboard[0]?.rdv || 1;
                                return (
                                    <div key={person.id} className={cn("flex items-center gap-3 rounded-xl p-2.5 transition-colors hover:bg-[#fbfaf7]", i === 0 && "border border-[#e1e9e5] bg-gradient-to-r from-[#edf5f2] to-[#fff7ea]")}>
                                        <span className={cn("w-5 text-center text-xs font-bold", i === 0 ? "text-[#c96600]" : "text-slate-400")}>{i + 1}</span>
                                        <span className={cn("flex h-8 w-8 items-center justify-center rounded-xl text-[11px] font-bold", i === 0 ? "bg-[#0c3b38] text-white" : "bg-[#edf1ef] text-[#526762]")}>{getInitials(person.name)}</span>
                                        <div className="min-w-0 flex-1"><div className="flex items-center justify-between"><span className="truncate text-xs font-semibold text-[#263735]">{person.name}</span><span className="text-xs font-bold tabular-nums">{person.rdv} RDV</span></div><div className="mt-1.5 h-1 overflow-hidden rounded-full bg-[#edf1ef]"><div className="h-full rounded-full bg-[#ed7f00]" style={{ width: `${Math.round((person.rdv / maxRdv) * 100)}%` }} /></div><p className="mt-1 text-[10px] text-slate-400">{callStats?.calls ?? 0} appels · {person.actions} actions</p></div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="py-10 text-center"><Users className="mx-auto h-7 w-7 text-slate-300" /><p className="mt-2 text-sm text-slate-500">Pas encore de performance sur cette période.</p></div>
                    )}
                </section>

                <section className="rounded-2xl border border-[#dfe7e3] bg-white p-5 shadow-[0_14px_38px_-28px_rgba(12,59,56,0.5)] xl:col-span-12">
                    <div><h2 className="text-[15px] font-semibold text-[#15201e]">Activité récente</h2><p className="mt-1 text-xs text-slate-500">Dernières interactions de l&apos;équipe</p></div>
                    {recentActivity.length === 0 ? (
                        <div className="py-10 text-center"><Activity className="mx-auto h-7 w-7 text-slate-300" /><p className="mt-2 text-sm text-slate-500">Aucune activité récente.</p></div>
                    ) : (
                        <ol className="mt-5 grid grid-cols-1 gap-x-8 md:grid-cols-2">
                            {recentActivity.slice(0, 10).map((item) => (
                                <li key={item.id} className="relative flex gap-3 border-b border-[#edf1ef] py-3 first:pt-0">
                                    <span className={cn("mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl", item.type === "meeting" ? "bg-amber-50 text-amber-700" : item.type === "call" ? "bg-[#e8f1ee] text-[#1f4d47]" : "bg-slate-100 text-slate-600")}>{item.type === "meeting" ? <CheckCircle2 className="h-4 w-4" /> : item.type === "call" ? <Phone className="h-4 w-4" /> : <Activity className="h-4 w-4" />}</span>
                                    <div className="min-w-0 flex-1"><p className="text-[12px] leading-relaxed text-slate-600"><span className="font-semibold text-[#263735]">{item.user}</span> {item.action}{item.contactOrCompanyName ? <> avec <span className="font-semibold text-[#1f4d47]">{item.contactOrCompanyName}</span></> : null}</p><p className="mt-1 text-[10px] text-slate-400">{item.campaignName ?? "Activité commerciale"} · {item.time}</p></div>
                                </li>
                            ))}
                        </ol>
                    )}
                </section>
            </div>

        </div>
    );
}
