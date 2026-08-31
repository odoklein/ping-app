"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useToast } from "@/components/ui";
import { RefreshCw, ArrowRight, Calendar, Sparkles, PhoneCall, TrendingUp, CalendarCheck, ChevronLeft, ChevronRight, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { DashboardSkeleton } from "@/components/client/skeletons";
import { BreakdownCharts } from "@/components/client/BreakdownCharts";

interface DashboardStats {
    totalActions: number;
    meetingsBooked: number;
    monthlyObjective: number;
    activeMissions: number;
}

interface ClientMeeting {
    id: string;
    createdAt: string;
    callbackDate?: string | null;
    note?: string | null;
    result?: string;
    contact: {
        firstName?: string | null;
        lastName?: string | null;
        title?: string | null;
        company: { name: string };
    } | null;
    company?: { name: string } | null;
    campaign: {
        name: string;
        mission: { name: string };
    };
    interlocuteur?: {
        id: string;
        firstName?: string | null;
        lastName?: string | null;
        title?: string | null;
    } | null;
}

interface Mission {
    id: string;
    name: string;
    isActive: boolean;
}

interface PortalSettings {
    portalShowCallHistory: boolean;
    portalShowDatabase: boolean;
}

const MONTH_NAMES = [
    "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
    "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

function getGreeting(): string {
    const h = new Date().getHours();
    if (h >= 18) return "Bonsoir";
    if (h >= 12) return "Bon après-midi";
    return "Bonjour";
}

function formatMeetingDate(dateString: string): string {
    const d = new Date(dateString);
    return d.toLocaleDateString("fr-FR", {
        weekday: "long",
        day: "numeric",
        month: "long",
    });
}

function formatMeetingTime(dateString: string): string {
    const d = new Date(dateString);
    return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

function formatShortMonth(dateString: string): string {
    const d = new Date(dateString);
    return d.toLocaleDateString("fr-FR", { month: "short" }).toUpperCase().replace(".", "");
}

export default function ClientPortal() {
    const { data: session } = useSession();
    const toast = useToast();
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [upcomingMeetings, setUpcomingMeetings] = useState<ClientMeeting[]>([]);
    const [missionName, setMissionName] = useState<string>("");
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [portalSettings, setPortalSettings] = useState<PortalSettings | null>(null);
    const [totalMeetingsCount, setTotalMeetingsCount] = useState<number>(0);
    const [callsCountForMonth, setCallsCountForMonth] = useState<number>(0);
    // Month selector for calls stats: 0 = current month, -1 = previous, etc.
    const [callsMonthOffset, setCallsMonthOffset] = useState(0);

    const clientId = (session?.user as { clientId?: string })?.clientId;
    const userName = session?.user?.name?.split(" ")[0] ?? "Client";

    const now = new Date();
    const currentMonth = MONTH_NAMES[now.getMonth()];
    const currentYear = now.getFullYear();

    const fetchData = useCallback(async (refresh = false) => {
        if (refresh) setIsRefreshing(true);
        else setIsLoading(true);
        try {
            const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
            const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
            const startDate = monthStart.toISOString().split("T")[0];
            const endDate = monthEnd.toISOString().split("T")[0];

            // For calls stats: selected month from offset
            const callsMonthDate = new Date(now.getFullYear(), now.getMonth() + callsMonthOffset, 1);
            const callsStart = new Date(callsMonthDate.getFullYear(), callsMonthDate.getMonth(), 1);
            const callsEnd = new Date(callsMonthDate.getFullYear(), callsMonthDate.getMonth() + 1, 0, 23, 59, 59, 999);
            const callsStartStr = callsStart.toISOString().split("T")[0];
            const callsEndStr = callsEnd.toISOString().split("T")[0];

            const [statsRes, missionsRes, meetingsRes, settingsRes, callsRes] = await Promise.all([
                fetch(`/api/stats?startDate=${startDate}&endDate=${endDate}`),
                fetch("/api/missions?isActive=true"),
                clientId ? fetch(`/api/clients/${clientId}/meetings`) : Promise.resolve(null),
                fetch("/api/client/portal/settings"),
                fetch(`/api/client/calls?startDate=${callsStartStr}&endDate=${callsEndStr}`),
            ]);

            const [statsJson, missionsJson, meetingsJson, settingsJson, callsJson] = await Promise.all([
                statsRes.json(),
                missionsRes.json(),
                meetingsRes?.ok ? meetingsRes.json() : Promise.resolve(null),
                settingsRes.json(),
                callsRes.ok ? callsRes.json() : Promise.resolve({ success: false }),
            ]);

            if (statsJson.success) setStats(statsJson.data);
            if (missionsJson.success) {
                const missions = Array.isArray(missionsJson.data) ? missionsJson.data as Mission[] : [];
                setMissionName(missions[0]?.name ?? "");
            }
            if (meetingsJson?.success) {
                const allMeetings: ClientMeeting[] = meetingsJson.data?.allMeetings ?? [];
                const upcoming = allMeetings
                    .filter((m) => {
                        if (!m.callbackDate) return true;
                        return new Date(m.callbackDate) >= new Date();
                    })
                    .sort((a, b) => {
                        const da = a.callbackDate ? new Date(a.callbackDate).getTime() : 0;
                        const db = b.callbackDate ? new Date(b.callbackDate).getTime() : 0;
                        return da - db;
                    })
                    .slice(0, 5);
                setUpcomingMeetings(upcoming);
                const nonCancelledCount = allMeetings.filter(
                    (m) => m.result !== "MEETING_CANCELLED"
                ).length;
                setTotalMeetingsCount(nonCancelledCount);
            }
            if (settingsJson?.success) {
                setPortalSettings(settingsJson.data);
            }
            if (callsJson?.success) {
                setCallsCountForMonth(callsJson.data?.total ?? 0);
            }
        } catch (error) {
            console.error("Failed to fetch data:", error);
            toast.error("Erreur de chargement", "Impossible de charger les données");
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [clientId, callsMonthOffset]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    if (isLoading && !stats) {
        return <DashboardSkeleton />;
    }

    const meetingsBooked = totalMeetingsCount || stats?.meetingsBooked || 0;

    return (
        <div className="min-h-full bg-[#ECE5D8] p-4 md:p-6 space-y-6">
            {/* ── Greeting bar ── */}
            <div className="flex flex-wrap items-center justify-between gap-4" style={{ animation: "dashFadeUp 0.4s ease both" }}>
                <div>
                    <h1 className="text-2xl md:text-[28px] font-bold text-[var(--elan-ink)] tracking-tight leading-tight">
                        {getGreeting()}, <span className="gradient-text">{userName}</span>
                    </h1>
                    <div className="flex items-center gap-2 mt-1.5">
                        <p className="text-sm text-[var(--elan-slate)]">
                            {currentMonth} {currentYear}
                        </p>
                        {missionName && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-[2px] rounded-full">
                                <TrendingUp className="w-3 h-3" />{missionName}
                            </span>
                        )}
                    </div>
                </div>
                <button
                    onClick={() => fetchData(true)}
                    disabled={isRefreshing}
                    className="w-10 h-10 rounded-xl border border-[var(--elan-line)] flex items-center justify-center text-[var(--elan-slate)] hover:text-[var(--elan-petrol)] hover:border-[rgba(255,158,27,0.3)] transition-all duration-200 disabled:opacity-50 bg-[var(--elan-surface)]/80 backdrop-blur-sm hover:shadow-md hover:shadow-[rgba(255,158,27,0.18)]"
                    title="Rafraîchir"
                    aria-label="Actualiser les données"
                >
                    <RefreshCw className={cn("w-4 h-4 transition-transform duration-200", isRefreshing && "animate-spin")} />
                </button>
            </div>

            {/* ── Hero Card ── */}
            <div
                className="relative overflow-hidden rounded-2xl shadow-xl"
                style={{ animation: "dashFadeUp 0.4s ease both", animationDelay: "60ms", background: "#0C3B38" }}
            >
                {/* Decorative orbs */}
                <div className="absolute top-0 right-0 w-72 h-72 rounded-full bg-[var(--elan-surface)]/[0.04] -translate-y-1/2 translate-x-1/3" />
                <div className="absolute bottom-0 left-0 w-52 h-52 rounded-full bg-[var(--elan-surface)]/[0.04] translate-y-1/2 -translate-x-1/4" />
                <div className="absolute top-8 right-10 opacity-20">
                    <Sparkles className="w-5 h-5 text-white animate-float" />
                </div>

                <div className="relative p-6 md:p-8">
                    {/* Large RDV count */}
                    <div className="flex flex-col items-center md:items-start mb-8">
                        <p className="text-[11px] font-semibold text-[rgba(244,240,232,0.6)] uppercase tracking-[0.2em]">
                            Rendez-vous cumulés
                        </p>
                        <div className="mt-3 flex items-baseline gap-1">
                            <AnimatedNumber
                                value={meetingsBooked}
                                className="text-[72px] md:text-[80px] font-black text-white leading-none drop-shadow-lg"
                            />
                            <span className="text-2xl font-bold text-[rgba(244,240,232,0.45)] mb-2">RDV</span>
                        </div>
                    </div>

                    {/* Appels passés (month selector + single KPI) */}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                        <div className="flex items-center gap-2">
                            <span className="text-[11px] font-semibold text-[rgba(244,240,232,0.6)] uppercase tracking-wider">Appels passés</span>
                            <div className="flex items-center rounded-lg bg-[var(--elan-surface)]/[0.08] border border-white/[0.06] p-0.5">
                                <button
                                    type="button"
                                    onClick={() => setCallsMonthOffset((o) => o - 1)}
                                    className="w-8 h-8 rounded-md flex items-center justify-center text-[rgba(244,240,232,0.6)] hover:bg-[var(--elan-surface)]/[0.12] hover:text-white transition-all"
                                    aria-label="Mois précédent"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </button>
                                <span className="min-w-[100px] text-center text-sm font-semibold text-white px-2">
                                    {MONTH_NAMES[new Date(now.getFullYear(), now.getMonth() + callsMonthOffset, 1).getMonth()]} {new Date(now.getFullYear(), now.getMonth() + callsMonthOffset, 1).getFullYear()}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => setCallsMonthOffset((o) => Math.min(o + 1, 0))}
                                    disabled={callsMonthOffset >= 0}
                                    className="w-8 h-8 rounded-md flex items-center justify-center text-[rgba(244,240,232,0.6)] hover:bg-[var(--elan-surface)]/[0.12] hover:text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                                    aria-label="Mois suivant"
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 rounded-xl bg-[var(--elan-surface)]/[0.08] backdrop-blur-sm border border-white/[0.06] px-4 py-3.5 hover:bg-[var(--elan-surface)]/[0.12] transition-all duration-200 group">
                            <div className="w-10 h-10 rounded-lg bg-[rgba(255,158,27,0.18)] flex items-center justify-center shrink-0 group-hover:bg-[rgba(255,158,27,0.26)] transition-all duration-200">
                                <PhoneCall className="w-[18px] h-[18px] text-[rgba(244,240,232,0.7)]" />
                            </div>
                            <div>
                                <AnimatedNumber
                                    value={callsCountForMonth}
                                    className="text-xl font-extrabold text-white leading-none"
                                />
                                <p className="text-[11px] text-[rgba(244,240,232,0.5)] mt-0.5 font-medium">ce mois</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Optional: Call history & Database shortcuts ── */}
            {(portalSettings?.portalShowCallHistory || portalSettings?.portalShowDatabase) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4" style={{ animation: "dashFadeUp 0.4s ease both", animationDelay: "120ms" }}>
                    {portalSettings?.portalShowCallHistory && (
                        <Link
                            href="/client/portal/calls"
                            className="flex items-center gap-4 p-4 rounded-xl border border-[rgba(12,59,56,0.10)] bg-[var(--elan-surface)]/80 backdrop-blur-sm hover:border-[rgba(12,59,56,0.26)] hover:shadow-md hover:shadow-[rgba(12,59,56,0.06)] transition-all duration-200 group"
                        >
                            <div className="w-10 h-10 rounded-xl bg-[rgba(219,228,223,0.5)] flex items-center justify-center shrink-0 group-hover:bg-[rgba(219,228,223,0.8)] transition-colors">
                                <PhoneCall className="w-5 h-5 text-[#0c3b38]" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-[var(--elan-ink)]">Historique des appels</p>
                                <p className="text-xs text-[var(--elan-slate)] mt-0.5">Consultez tous les appels passés par l&apos;équipe.</p>
                            </div>
                            <ArrowRight className="w-4 h-4 text-[#7f8e89] group-hover:text-[#0c3b38] group-hover:translate-x-0.5 transition-all shrink-0" />
                        </Link>
                    )}
                    {portalSettings?.portalShowDatabase && (
                        <Link
                            href="/client/portal/database"
                            className="flex items-center gap-4 p-4 rounded-xl border border-[rgba(12,59,56,0.10)] bg-[var(--elan-surface)]/80 backdrop-blur-sm hover:border-[rgba(12,59,56,0.26)] hover:shadow-md hover:shadow-[rgba(12,59,56,0.06)] transition-all duration-200 group"
                        >
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/10 to-teal-500/10 flex items-center justify-center shrink-0 group-hover:from-emerald-500/20 group-hover:to-teal-500/20 transition-colors">
                                <Users className="w-5 h-5 text-emerald-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-[var(--elan-ink)]">Base de données</p>
                                <p className="text-xs text-[var(--elan-slate)] mt-0.5">Vue des entreprises et contacts suivis par l&apos;équipe.</p>
                            </div>
                            <ArrowRight className="w-4 h-4 text-[#899892] group-hover:text-[var(--elan-petrol)] group-hover:translate-x-0.5 transition-all shrink-0" />
                        </Link>
                    )}
                </div>
            )}

            {/* ── Breakdown Analytics Charts ── */}
            <BreakdownCharts />

            {/* ── Upcoming Meetings ── */}
            <div className="premium-card overflow-hidden" style={{ animation: "dashFadeUp 0.4s ease both", animationDelay: "140ms" }}>
                <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-[var(--elan-line)]">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-[#FF9E1B] flex items-center justify-center shadow-sm">
                            <CalendarCheck className="w-4 h-4 text-[#15201E]" />
                        </div>
                        <h2 className="text-sm font-semibold text-[var(--elan-ink)] uppercase tracking-wider">
                            Prochains rendez-vous
                        </h2>
                    </div>
                    <Link
                        href="/client/portal/meetings"
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--elan-petrol)] hover:text-[var(--elan-amber-deep)] transition-colors duration-200 group"
                    >
                        Voir tout <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform duration-200" />
                    </Link>
                </div>

                {upcomingMeetings.length === 0 ? (
                    <div className="text-center py-12 px-6">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[var(--elan-paper)] to-[var(--elan-paper-2)] flex items-center justify-center mx-auto mb-4">
                            <Calendar className="w-6 h-6 text-[#899892]" />
                        </div>
                        <p className="text-sm font-medium text-[var(--elan-slate)]">Aucun RDV à venir</p>
                        <p className="text-xs text-[#899892] mt-1 max-w-xs mx-auto">
                            Les prochains RDV planifiés par votre équipe apparaîtront ici.
                        </p>
                    </div>
                ) : (
                    <div className="divide-y divide-[var(--elan-line)]">
                        {upcomingMeetings.map((m, idx) => {
                            const contactName = m.contact
                                ? [m.contact.firstName, m.contact.lastName].filter(Boolean).join(" ") || "Contact"
                                : "Contact entreprise";
                            const companyName =
                                m.contact?.company?.name ?? m.company?.name ?? "Entreprise inconnue";
                            const d = m.callbackDate ? new Date(m.callbackDate) : null;
                            return (
                                <Link
                                    key={m.id}
                                    href="/client/portal/meetings"
                                    className="flex items-center gap-4 px-6 py-3.5 hover:bg-gradient-to-r hover:from-[#F8F7FF] hover:to-transparent transition-all duration-200 group relative"
                                    style={{ animation: "dashFadeUp 0.35s ease both", animationDelay: `${180 + idx * 50}ms` }}
                                >
                                    {/* Hover accent bar */}
                                    <div className="absolute left-0 top-2 bottom-2 w-[3px] rounded-full bg-[var(--elan-amber)] opacity-0 group-hover:opacity-100 transition-opacity duration-200" />

                                    {/* Date pill */}
                                    <div className="w-[52px] shrink-0 flex flex-col items-center py-1.5 px-1 rounded-lg bg-[var(--elan-paper)] border border-[var(--elan-line)] group-hover:border-[rgba(12,59,56,0.2)] group-hover:bg-indigo-50/50 transition-all duration-200">
                                        {d ? (
                                            <>
                                                <span className="text-[17px] font-extrabold text-[var(--elan-ink)] leading-none">{d.getDate()}</span>
                                                <span className="text-[9px] font-bold text-[#7f8e89] uppercase tracking-wide mt-0.5">{formatShortMonth(m.callbackDate!)}</span>
                                            </>
                                        ) : (
                                            <span className="text-[8px] font-bold text-[#7f8e89] uppercase tracking-wide text-center leading-tight">À confirmer</span>
                                        )}
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[13.5px] font-bold text-[var(--elan-ink)] truncate">{contactName}</span>
                                            <span className="text-[11px] text-[#7f8e89]">·</span>
                                            <span className="text-[12.5px] text-[#5C5E7E] font-medium truncate">{companyName}</span>
                                        </div>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            {m.callbackDate ? (
                                                <>
                                                    <span className="text-[11.5px] text-[var(--elan-petrol)] font-semibold capitalize">{formatMeetingDate(m.callbackDate)}</span>
                                                    <span className="text-[10.5px] text-[#899892] font-medium">{formatMeetingTime(m.callbackDate)}</span>
                                                </>
                                            ) : (
                                                <span className="text-[11px] text-[#899892] italic">Date à confirmer</span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Mission badge */}
                                    <div className="hidden sm:flex items-center gap-1.5 shrink-0">
                                        <span className="inline-flex text-[10.5px] font-semibold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-[2px] rounded-full group-hover:bg-indigo-100/80 transition-colors duration-200">
                                            {m.campaign?.mission?.name ?? "—"}
                                        </span>
                                        {m.interlocuteur && (
                                            <span className="inline-flex text-[10.5px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-[2px] rounded-full">
                                                {[m.interlocuteur.firstName, m.interlocuteur.lastName].filter(Boolean).join(" ") || "Commercial assigné"}
                                            </span>
                                        )}
                                    </div>

                                    {/* Arrow */}
                                    <div className="w-7 h-7 rounded-lg bg-[var(--elan-paper)] flex items-center justify-center shrink-0 group-hover:bg-gradient-to-br group-hover:from-[#ff9e1b] group-hover:to-[#e07c00] transition-all duration-200">
                                        <ArrowRight className="w-3.5 h-3.5 text-[#899892] group-hover:text-white group-hover:translate-x-0.5 transition-all duration-200" />
                                    </div>
                                </Link>
                            );
                        })}

                        {/* Footer link */}
                        <div className="px-6 py-3">
                            <Link
                                href="/client/portal/meetings"
                                className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-[var(--elan-petrol)] hover:text-[var(--elan-amber-deep)] transition-colors duration-200 group"
                            >
                                Voir tous mes rendez-vous <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform duration-200" />
                            </Link>
                        </div>
                    </div>
                )}
            </div>

            <style jsx global>{`
                @keyframes dashFadeUp {
                    from { opacity: 0; transform: translateY(12px); }
                    to { opacity: 1; transform: none; }
                }
            `}</style>
        </div>
    );
}
