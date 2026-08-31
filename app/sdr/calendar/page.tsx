"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useSession } from "next-auth/react";
import {
    ChevronLeft,
    ChevronRight,
    CalendarDays,
    Clock,
    Phone,
    Mail,
    Linkedin,
    Briefcase,
    Loader2,
    X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui";

// ============================================
// TYPES
// ============================================

interface ScheduleBlock {
    id: string;
    date: string;
    startTime: string;
    endTime: string;
    status: string;
    suggestionStatus: string | null;
    notes: string | null;
    sdrId: string;
    missionId: string;
    allocationId: string | null;
    mission: {
        id: string;
        name: string;
        channel: string;
        client: { id: string; name: string };
    };
    createdBy: { id: string; name: string };
}

interface SdrAbsence {
    id: string;
    startDate: string;
    endDate: string;
    type: string;
    impactsPlanning: boolean;
    note: string | null;
}

interface SdrCapacity {
    id: string;
    month: string;
    baseWorkingDays: number;
    effectiveAvailableDays: number;
}

interface SdrAllocation {
    id: string;
    allocatedDays: number;
    scheduledDays: number;
    status: string;
    missionMonthPlan: {
        id: string;
        month: string;
        mission: { id: string; name: string };
    };
}

interface SdrData {
    id: string;
    name: string;
    email: string;
    role: string;
    capacities: SdrCapacity[];
    absences: SdrAbsence[];
    allocations: SdrAllocation[];
}

interface Mission {
    id: string;
    name: string;
    channel: string;
    channels: string[];
    client: { id: string; name: string };
}

interface MonthlyData {
    month: string;
    daysInMonth: number;
    sdr: SdrData;
    blocks: ScheduleBlock[];
    blocksByDate: Record<string, ScheduleBlock[]>;
    missions: Mission[];
}

interface MonthCell {
    date: string;
    day: number;
    isToday: boolean;
    isCurrentMonth: boolean;
}

// ============================================
// CONSTANTS
// ============================================

const DAY_LABELS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
const CHANNEL_ICONS: Record<string, typeof Phone> = { CALL: Phone, EMAIL: Mail, LINKEDIN: Linkedin };
const CHANNEL_COLORS: Record<string, string> = {
    CALL: "bg-emerald-500",
    EMAIL: "bg-blue-500",
    LINKEDIN: "bg-sky-600",
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

function toDateString(date: Date): string {
    return date.toISOString().slice(0, 10);
}

function formatMonthLabel(month: string): string {
    const [year, mon] = month.split("-").map(Number);
    const date = new Date(year, mon - 1, 1);
    return date.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
}

function formatDateLabel(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString("fr-FR", {
        weekday: "long",
        day: "numeric",
        month: "long",
    });
}

// ============================================
// MAIN PAGE COMPONENT
// ============================================

export default function SdrCalendarPage() {
    const { data: session } = useSession();
    const { error: showError } = useToast();

    const [month, setMonth] = useState(() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    });
    const [data, setData] = useState<MonthlyData | null>(null);
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState<string | null>(null);

    const fetchMonthly = useCallback(async () => {
        if (!session?.user?.id) return;
        setLoading(true);
        try {
            const res = await fetch(`/api/planning/me?month=${month}`);
            const json = await res.json();
            if (json.success) {
                setData(json.data);
            } else {
                showError("Erreur", json.error || "Impossible de charger le calendrier");
            }
        } catch {
            showError("Erreur", "Impossible de charger le calendrier");
        } finally {
            setLoading(false);
        }
    }, [month, session?.user?.id, showError]);

    useEffect(() => {
        void fetchMonthly();
    }, [fetchMonthly]);

    useEffect(() => {
        setSelectedDate(null);
    }, [month]);

    const calendarGrid = useMemo(() => {
        if (!data) return [];
        const [year, mon] = month.split("-").map(Number);
        let startDow = new Date(year, mon - 1, 1).getDay() - 1;
        if (startDow < 0) startDow = 6;

        const cells: MonthCell[] = [];
        const prevMonthDays = new Date(year, mon - 1, 0).getDate();
        for (let i = startDow - 1; i >= 0; i--) {
            const d = prevMonthDays - i;
            const pm = mon - 1 <= 0 ? 12 : mon - 1;
            const py = mon - 1 <= 0 ? year - 1 : year;
            cells.push({
                date: `${py}-${String(pm).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
                day: d,
                isToday: false,
                isCurrentMonth: false,
            });
        }

        const today = new Date();
        const todayStr = toDateString(today);
        for (let d = 1; d <= data.daysInMonth; d++) {
            const dateStr = `${year}-${String(mon).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
            cells.push({ date: dateStr, day: d, isToday: dateStr === todayStr, isCurrentMonth: true });
        }

        const remaining = 7 - (cells.length % 7);
        if (remaining < 7) {
            for (let d = 1; d <= remaining; d++) {
                const nm = mon + 1 > 12 ? 1 : mon + 1;
                const ny = mon + 1 > 12 ? year + 1 : year;
                cells.push({
                    date: `${ny}-${String(nm).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
                    day: d,
                    isToday: false,
                    isCurrentMonth: false,
                });
            }
        }

        return cells;
    }, [data, month]);

    const weeks = useMemo(() => {
        const result: MonthCell[][] = [];
        for (let i = 0; i < calendarGrid.length; i += 7) {
            result.push(calendarGrid.slice(i, i + 7));
        }
        return result;
    }, [calendarGrid]);

    const selectedBlocks = useMemo(() => {
        if (!selectedDate || !data) return [];
        return data.blocksByDate[selectedDate] ?? [];
    }, [selectedDate, data]);

    const capacity = data?.sdr.capacities[0];
    const totalAllocated = data?.sdr.allocations.reduce((s, a) => s + a.allocatedDays, 0) ?? 0;
    const totalScheduled = data?.blocks.length ?? 0;

    function prevMonth() {
        const [year, mon] = month.split("-").map(Number);
        const date = new Date(year, mon - 2, 1);
        setMonth(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`);
    }

    function nextMonth() {
        const [year, mon] = month.split("-").map(Number);
        const date = new Date(year, mon, 1);
        setMonth(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`);
    }

    function goToToday() {
        const now = new Date();
        setMonth(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`);
    }

    if (loading && !data) {
        return (
            <div className="flex h-full items-center justify-center">
                <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
            </div>
        );
    }

    return (
        <div className="flex h-full min-h-0 flex-col overflow-hidden bg-white">
            {/* Header */}
            <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-2 py-3 sm:px-6 sm:py-4">
                <div className="flex min-w-0 flex-1 items-center justify-between gap-2 sm:flex-none sm:justify-start sm:gap-3">
                    <div className="flex items-center gap-1">
                        <button
                            onClick={prevMonth}
                            className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        <h1 className="min-w-[112px] text-center text-base font-bold capitalize text-slate-800 sm:min-w-[180px] sm:text-lg">
                            {formatMonthLabel(month)}
                        </h1>
                        <button
                            onClick={nextMonth}
                            className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
                        >
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    </div>
                    <button
                        onClick={goToToday}
                        className="rounded-lg bg-[#EEF3F1] px-2.5 py-1.5 text-sm font-medium text-[#1F4D47] transition-colors hover:bg-[#E2ECE9] sm:ml-2 sm:px-3"
                    >
                        <span className="sm:hidden">Auj.</span>
                        <span className="hidden sm:inline">Aujourd&apos;hui</span>
                    </button>
                </div>

                <div className="flex items-center gap-6">
                    {/* Stats */}
                    <div className="hidden items-center gap-4 text-sm lg:flex">
                        {capacity && (
                            <div className="flex items-center gap-2">
                                <span className="text-slate-500">Disponibilité:</span>
                                <span className="font-semibold text-slate-700">
                                    {capacity.effectiveAvailableDays}j
                                </span>
                            </div>
                        )}
                        <div className="flex items-center gap-2">
                            <span className="text-slate-500">Alloué:</span>
                            <span className="font-semibold text-[#1F4D47]">{totalAllocated}j</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-slate-500">Planifié:</span>
                            <span className="font-semibold text-emerald-600">{totalScheduled} créneaux</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Calendar Grid */}
            <div className="relative flex flex-1 overflow-hidden">
                <div className="flex-1 flex flex-col min-w-0">
                    {/* Day Headers */}
                    <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50/80 flex-shrink-0">
                        {DAY_LABELS.map((label, index) => (
                            <div
                                key={label}
                                className={cn(
                                    "py-2.5 text-center text-[10px] font-semibold uppercase tracking-normal sm:py-3 sm:text-xs sm:tracking-wider",
                                    index >= 5 ? "text-slate-400" : "text-slate-600"
                                )}
                            >
                                <span className="sm:hidden">{label.slice(0, 3)}</span>
                                <span className="hidden sm:inline">{label}</span>
                            </div>
                        ))}
                    </div>

                    {/* Calendar Cells */}
                    <div className="flex-1 overflow-y-auto">
                        <div
                            className="grid h-full"
                            style={{ gridTemplateRows: `repeat(${weeks.length}, minmax(clamp(72px, 11vh, 100px), 1fr))` }}
                        >
                            {weeks.map((week, weekIndex) => (
                                <div key={weekIndex} className="grid grid-cols-7 border-b border-slate-100">
                                    {week.map((cell, cellIndex) => {
                                        const dateBlocks = data?.blocksByDate[cell.date] ?? [];
                                        const isWeekend = cellIndex >= 5;
                                        const hasAbsence = data?.sdr.absences.some(
                                            (a) =>
                                                cell.date >= a.startDate.slice(0, 10) &&
                                                cell.date <= a.endDate.slice(0, 10)
                                        );

                                        return (
                                            <button
                                                key={cell.date}
                                                type="button"
                                                onClick={() =>
                                                    cell.isCurrentMonth && setSelectedDate(cell.date)
                                                }
                                                className={cn(
                                                    "relative border-r border-slate-100 p-1 text-left transition-colors last:border-r-0 sm:px-3 sm:py-2",
                                                    cell.isCurrentMonth
                                                        ? "bg-white hover:bg-slate-50/80"
                                                        : "bg-slate-50/30",
                                                    isWeekend && cell.isCurrentMonth && "bg-slate-50/40",
                                                    selectedDate === cell.date &&
                                                        cell.isCurrentMonth &&
                                                        "ring-2 ring-[#E07C00] ring-inset",
                                                    hasAbsence && "bg-amber-50/50"
                                                )}
                                            >
                                                {/* Day Number */}
                                                <div className="mb-1 flex items-center justify-between sm:mb-2">
                                                    <span
                                                        className={cn(
                                                            "flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold sm:h-7 sm:w-7 sm:text-sm",
                                                            cell.isToday && "bg-[#FF9E1B] text-[#15201E] shadow-sm",
                                                            !cell.isToday && cell.isCurrentMonth && "text-slate-700",
                                                            !cell.isToday &&
                                                                !cell.isCurrentMonth &&
                                                                "text-slate-300"
                                                        )}
                                                    >
                                                        {cell.day}
                                                    </span>

                                                    {dateBlocks.length > 0 && (
                                                        <span className="rounded-full bg-[#EEF3F1] px-1.5 py-0.5 text-[9px] font-bold text-[#1F4D47] sm:px-2 sm:text-[10px]">
                                                            {dateBlocks.length}
                                                        </span>
                                                    )}

                                                    {hasAbsence && (
                                                        <span className="text-[10px] font-medium text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded-full ml-1">
                                                            Abs
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Mission Indicators */}
                                                <div className="space-y-1">
                                                    {dateBlocks.slice(0, 3).map((block, idx) => {
                                                        const Icon = CHANNEL_ICONS[block.mission.channel] ?? Briefcase;
                                                        const color = CHANNEL_COLORS[block.mission.channel] ?? "bg-slate-400";
                                                        return (
                                                            <div
                                                                key={idx}
                                                                className={cn(
                                                                    "flex items-center gap-1.5 px-2 py-1 rounded-md text-white text-xs",
                                                                    color
                                                                )}
                                                            >
                                                                <Icon className="w-3 h-3" />
                                                                <span className="hidden truncate sm:inline">
                                                                    {block.mission.client.name}
                                                                </span>
                                                            </div>
                                                        );
                                                    })}
                                                    {dateBlocks.length > 3 && (
                                                        <div className="text-xs text-slate-500 text-center py-0.5">
                                                            +{dateBlocks.length - 3} autres
                                                        </div>
                                                    )}
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Day Detail Sidebar */}
                {selectedDate && (
                    <div className="absolute inset-0 z-20 flex w-full flex-col border-l border-slate-200 bg-white sm:relative sm:inset-auto sm:w-[360px]">
                        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
                            <div>
                                <h3 className="font-semibold text-slate-800 capitalize">
                                    {formatDateLabel(selectedDate)}
                                </h3>
                                <p className="text-sm text-slate-500">
                                    {selectedBlocks.length} créneau{selectedBlocks.length !== 1 ? "x" : ""}
                                </p>
                            </div>
                            <button
                                onClick={() => setSelectedDate(null)}
                                className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-3">
                            {selectedBlocks.length === 0 ? (
                                <div className="text-center py-8 text-slate-400">
                                    <CalendarDays className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                    <p>Aucun créneau planifié</p>
                                </div>
                            ) : (
                                selectedBlocks.map((block) => {
                                    const Icon = CHANNEL_ICONS[block.mission.channel] ?? Briefcase;
                                    const color = CHANNEL_COLORS[block.mission.channel] ?? "bg-slate-400";

                                    return (
                                        <div
                                            key={block.id}
                                            className="border border-slate-200 rounded-xl p-4 hover:border-indigo-300 transition-colors"
                                        >
                                            <div className="flex items-start gap-3">
                                                <div
                                                    className={cn(
                                                        "w-10 h-10 rounded-lg flex items-center justify-center text-white shrink-0",
                                                        color
                                                    )}
                                                >
                                                    <Icon className="w-5 h-5" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="font-semibold text-slate-800 truncate">
                                                        {block.mission.name}
                                                    </h4>
                                                    <p className="text-sm text-slate-500 truncate">
                                                        {block.mission.client.name}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="mt-3 flex items-center gap-4 text-sm text-slate-600">
                                                <div className="flex items-center gap-1.5">
                                                    <Clock className="w-4 h-4 text-slate-400" />
                                                    <span>
                                                        {block.startTime.slice(0, 5)} -{" "}
                                                        {block.endTime.slice(0, 5)}
                                                    </span>
                                                </div>
                                            </div>

                                            {block.notes && (
                                                <p className="mt-2 text-sm text-slate-500 bg-slate-50 p-2 rounded-lg">
                                                    {block.notes}
                                                </p>
                                            )}

                                            {block.suggestionStatus === "SUGGESTED" && (
                                                <div className="mt-3 flex items-center gap-2 text-sm">
                                                    <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded-md font-medium">
                                                        Suggéré
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
