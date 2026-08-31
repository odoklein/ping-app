"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useToast } from "@/components/ui";
import {
    RefreshCw,
    ArrowRight,
    Calendar,
    CalendarCheck,
    ChevronLeft,
    ChevronRight,
    TrendingUp,
    Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";

const MONTH_NAMES = [
    "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
    "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

interface CommercialMeeting {
    id: string;
    callbackDate?: string | null;
    result: string;
    contact?: {
        firstName?: string | null;
        lastName?: string | null;
        company: { name: string };
    } | null;
    campaign: {
        name: string;
        mission: { name: string };
    };
}

interface CommercialProfile {
    firstName: string;
    lastName: string;
    title?: string | null;
    client: { name: string; logo?: string | null };
}

function formatShortDate(dateString: string) {
    const d = new Date(dateString);
    return {
        day: d.getDate(),
        month: d.toLocaleDateString("fr-FR", { month: "short" }).toUpperCase().replace(".", ""),
        time: d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
    };
}

export default function CommercialPortal() {
    const { data: session } = useSession();
    const toast = useToast();
    const [profile, setProfile] = useState<CommercialProfile | null>(null);
    const [allMeetings, setAllMeetings] = useState<CommercialMeeting[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [monthOffset, setMonthOffset] = useState(0);

    const now = new Date();
    const displayDate = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
    const currentMonthLabel = `${MONTH_NAMES[displayDate.getMonth()]} ${displayDate.getFullYear()}`;

    const fetchData = useCallback(async (refresh = false) => {
        if (refresh) setIsRefreshing(true);
        else setIsLoading(true);

        try {
            const monthStart = new Date(displayDate.getFullYear(), displayDate.getMonth(), 1);
            const monthEnd = new Date(displayDate.getFullYear(), displayDate.getMonth() + 1, 0, 23, 59, 59, 999);
            const startDate = monthStart.toISOString().split("T")[0];
            const endDate = monthEnd.toISOString().split("T")[0];

            const [profileRes, meetingsRes] = await Promise.all([
                fetch("/api/commercial/settings"),
                fetch(`/api/commercial/meetings?startDate=${startDate}&endDate=${endDate}`),
            ]);

            const [profileJson, meetingsJson] = await Promise.all([
                profileRes.json(),
                meetingsRes.json(),
            ]);

            if (profileJson.success) setProfile(profileJson.data);
            if (meetingsJson.success) setAllMeetings(meetingsJson.data?.allMeetings ?? []);
        } catch {
            toast.error("Erreur de chargement", "Impossible de charger les données");
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [monthOffset]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const confirmedMeetings = allMeetings.filter((m) => m.result === "MEETING_BOOKED");
    const upcomingMeetings = allMeetings
        .filter((m) => m.result === "MEETING_BOOKED" && m.callbackDate && new Date(m.callbackDate) >= new Date())
        .sort((a, b) => new Date(a.callbackDate!).getTime() - new Date(b.callbackDate!).getTime())
        .slice(0, 5);

    const userName = profile
        ? `${profile.firstName} ${profile.lastName}`
        : session?.user?.name?.split(" ")[0] ?? "Commercial";

    if (isLoading) {
        return (
            <div className="min-h-full bg-gradient-to-br from-[var(--elan-paper)] via-[var(--elan-paper)] to-[var(--elan-paper-2)] p-4 md:p-6">
                <div className="animate-pulse space-y-6">
                    <div className="h-8 w-48 bg-gray-200 rounded-lg" />
                    <div className="h-40 bg-gray-200 rounded-2xl" />
                    <div className="h-64 bg-gray-200 rounded-2xl" />
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-full bg-[#ECE5D8] p-4 md:p-6 space-y-6">
            {/* ── Greeting ── */}
            <div
                className="flex flex-wrap items-center justify-between gap-4"
                style={{ animation: "dashFadeUp 0.4s ease both" }}
            >
                <div>
                    <h1 className="text-2xl md:text-[28px] font-bold text-[var(--elan-ink)] tracking-tight leading-tight">
                        Bonjour, <span className="gradient-text">{userName}</span>
                    </h1>
                    <div className="flex items-center gap-2 mt-1.5">
                        <p className="text-sm text-[var(--elan-slate)]">{MONTH_NAMES[now.getMonth()]} {now.getFullYear()}</p>
                        {profile?.client?.name && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#0C3B38] bg-[#DBE4DF] border border-[rgba(12,59,56,.16)] px-2 py-[2px] rounded-full">
                                <TrendingUp className="w-3 h-3" />{profile.client.name}
                            </span>
                        )}
                    </div>
                </div>
                <button
                    onClick={() => fetchData(true)}
                    disabled={isRefreshing}
                    className="w-10 h-10 rounded-xl border border-[var(--elan-line)] flex items-center justify-center text-[var(--elan-slate)] hover:text-[#0C3B38] hover:border-[#0C3B38] transition-all duration-200 disabled:opacity-50 bg-[var(--elan-surface)]/80 hover:shadow-md"
                    title="Rafraîchir"
                >
                    <RefreshCw className={cn("w-4 h-4 transition-transform duration-200", isRefreshing && "animate-spin")} />
                </button>
            </div>

            {/* ── Hero Card ── */}
            <div
                className="relative overflow-hidden rounded-2xl shadow-xl"
                style={{
                    animation: "dashFadeUp 0.4s ease both",
                    animationDelay: "60ms",
                    background: "#0C3B38",
                }}
            >
                <div className="absolute top-0 right-0 w-72 h-72 rounded-full bg-[var(--elan-surface)]/[0.04] -translate-y-1/2 translate-x-1/3" />
                <div className="absolute bottom-0 left-0 w-52 h-52 rounded-full bg-[var(--elan-surface)]/[0.04] translate-y-1/2 -translate-x-1/4" />
                <div className="absolute top-8 right-10 opacity-20">
                    <Sparkles className="w-5 h-5 text-white animate-pulse" />
                </div>

                <div className="relative p-6 md:p-8">
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                        {/* RDV count */}
                        <div>
                            <p className="text-[11px] font-semibold text-[#C0CCC7] uppercase tracking-[0.2em]">
                                Rendez-vous confirmés
                            </p>
                            <div className="mt-2 flex items-baseline gap-1">
                                <AnimatedNumber
                                    value={confirmedMeetings.length}
                                    className="text-[64px] md:text-[72px] font-black text-white leading-none drop-shadow-lg"
                                />
                                <span className="text-2xl font-bold text-[#FF9E1B] mb-1">RDV</span>
                            </div>
                        </div>

                        {/* Month selector */}
                        <div className="flex items-center gap-2 self-start md:self-auto">
                            <span className="text-[11px] font-semibold text-[#C0CCC7] uppercase tracking-wider">Période</span>
                            <div className="flex items-center rounded-lg bg-[var(--elan-surface)]/[0.08] border border-white/[0.06] p-0.5">
                                <button
                                    onClick={() => setMonthOffset((o) => o - 1)}
                                    className="w-8 h-8 rounded-md flex items-center justify-center text-[#C0CCC7] hover:bg-[var(--elan-surface)]/[0.12] hover:text-white transition-all"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </button>
                                <span className="min-w-[110px] text-center text-sm font-semibold text-white px-2">
                                    {currentMonthLabel}
                                </span>
                                <button
                                    onClick={() => setMonthOffset((o) => Math.min(o + 1, 0))}
                                    disabled={monthOffset >= 0}
                                    className="w-8 h-8 rounded-md flex items-center justify-center text-[#C0CCC7] hover:bg-[var(--elan-surface)]/[0.12] hover:text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Upcoming Meetings ── */}
            <div
                className="premium-card overflow-hidden"
                style={{ animation: "dashFadeUp 0.4s ease both", animationDelay: "120ms" }}
            >
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
                        href="/commercial/portal/meetings"
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0C3B38] hover:text-[#E07C00] transition-colors group"
                    >
                        Voir tout <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                    </Link>
                </div>

                {upcomingMeetings.length === 0 ? (
                    <div className="text-center py-12 px-6">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[var(--elan-paper)] to-[var(--elan-paper-2)] flex items-center justify-center mx-auto mb-4">
                            <Calendar className="w-6 h-6 text-[#899892]" />
                        </div>
                        <p className="text-sm font-medium text-[var(--elan-slate)]">Aucun RDV à venir</p>
                        <p className="text-xs text-[#899892] mt-1">Les prochains RDV planifiés apparaîtront ici.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-[var(--elan-line)]">
                        {upcomingMeetings.map((m, idx) => {
                            const contactName = m.contact
                                ? [m.contact.firstName, m.contact.lastName].filter(Boolean).join(" ") || "Contact"
                                : "Contact";
                            const companyName = m.contact?.company?.name ?? "";
                            const dateInfo = m.callbackDate ? formatShortDate(m.callbackDate) : null;

                            return (
                                <Link
                                    key={m.id}
                                    href="/commercial/portal/meetings"
                                    className="flex items-center gap-4 px-6 py-3.5 hover:bg-[#DBE4DF]/50 transition-all duration-200 group relative"
                                    style={{ animation: "dashFadeUp 0.35s ease both", animationDelay: `${160 + idx * 50}ms` }}
                                >
                                    <div className="absolute left-0 top-2 bottom-2 w-[3px] rounded-full bg-[#FF9E1B] opacity-0 group-hover:opacity-100 transition-opacity" />

                                    <div className="w-[52px] shrink-0 flex flex-col items-center py-1.5 px-1 rounded-lg bg-[#F4F0E8] border border-[var(--elan-line)] group-hover:border-[#0C3B38]/20 group-hover:bg-[#DBE4DF] transition-all">
                                        {dateInfo ? (
                                            <>
                                                <span className="text-[17px] font-extrabold text-[var(--elan-ink)] leading-none">{dateInfo.day}</span>
                                                <span className="text-[9px] font-bold text-[#7f8e89] uppercase tracking-wide mt-0.5">{dateInfo.month}</span>
                                            </>
                                        ) : (
                                            <span className="text-[8px] font-bold text-[#7f8e89] uppercase text-center leading-tight">À conf.</span>
                                        )}
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[13.5px] font-bold text-[var(--elan-ink)] truncate">{contactName}</span>
                                            {companyName && (
                                                <>
                                                    <span className="text-[11px] text-[#7f8e89]">·</span>
                                                    <span className="text-[12.5px] text-[#5C5E7E] font-medium truncate">{companyName}</span>
                                                </>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            {dateInfo ? (
                                                <span className="text-[11.5px] text-[#0C3B38] font-semibold">{dateInfo.time}</span>
                                            ) : (
                                                <span className="text-[11px] text-[#899892] italic">Date à confirmer</span>
                                            )}
                                        </div>
                                    </div>

                                    <span className="hidden sm:inline-flex text-[10.5px] font-semibold text-[#0C3B38] bg-[#DBE4DF] border border-[rgba(12,59,56,.16)] px-2 py-[2px] rounded-full shrink-0">
                                        {m.campaign.mission.name}
                                    </span>

                                    <div className="w-7 h-7 rounded-lg bg-[#F4F0E8] flex items-center justify-center shrink-0 group-hover:bg-[#FF9E1B] transition-all">
                                        <ArrowRight className="w-3.5 h-3.5 text-[#899892] group-hover:text-white group-hover:translate-x-0.5 transition-all" />
                                    </div>
                                </Link>
                            );
                        })}

                        <div className="px-6 py-3">
                            <Link
                                href="/commercial/portal/meetings"
                                className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-[#0C3B38] hover:text-[#E07C00] transition-colors group"
                            >
                                Voir tous mes rendez-vous <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
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
