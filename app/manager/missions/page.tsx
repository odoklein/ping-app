"use client";

import { useState, useEffect, useMemo } from "react";
import { useToast } from "@/components/ui";
import {
    Plus,
    Search,
    Target,
    Users,
    Calendar,
    RefreshCw,
    Phone,
    Mail,
    Linkedin,
    Loader2,
    X,
    Clock,
    ArrowUpRight,
    ListChecks,
    AlertTriangle,
    CheckCircle2,
    Timer,
    Hourglass,
    Layers,
    LayoutGrid,
    Table as TableIcon,
    ChevronRight,
} from "lucide-react";
import Link from "next/link";
import { MissionQuickViewDrawer } from "./_components/MissionQuickViewDrawer";
import { NewMissionDialog } from "./_components/NewMissionDialog";
import { MISSION_STATUS_CONFIG, MISSION_STATUS_TABS } from "@/lib/constants/missionStatus";
import type { MissionStatusValue } from "@/lib/constants/missionStatus";
import { cn } from "@/lib/utils";

// ============================================
// TYPES
// ============================================

interface Mission {
    id: string;
    name: string;
    objective?: string;
    channel: "CALL" | "EMAIL" | "LINKEDIN";
    channels?: ("CALL" | "EMAIL" | "LINKEDIN")[];
    status: MissionStatusValue;
    isActive?: boolean;
    startDate?: string;
    endDate?: string;
    client?: {
        id: string;
        name: string;
    };
    sdrAssignments?: Array<{
        sdr: {
            id: string;
            name: string;
        };
    }>;
    _count: {
        sdrAssignments: number;
        campaigns: number;
        lists: number;
    };
}

// ============================================
// CHANNEL CONFIG
// ============================================

const CHANNEL_CONFIG = {
    CALL: {
        icon: Phone,
        label: "Appel",
        color: "from-blue-500 to-indigo-600",
        bgLight: "bg-blue-50",
        textColor: "text-blue-600",
    },
    EMAIL: {
        icon: Mail,
        label: "Email",
        color: "from-violet-500 to-purple-600",
        bgLight: "bg-violet-50",
        textColor: "text-violet-600",
    },
    LINKEDIN: {
        icon: Linkedin,
        label: "LinkedIn",
        color: "from-sky-500 to-blue-600",
        bgLight: "bg-sky-50",
        textColor: "text-sky-600",
    },
};

// ============================================
// HELPERS
// ============================================

function getDaysRemaining(endDate?: string): number | null {
    if (!endDate) return null;
    const diff = new Date(endDate).getTime() - Date.now();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function getDaysWorked(startDate?: string, endDate?: string): number | null {
    if (!startDate) return null;
    const end = endDate ? Math.min(new Date(endDate).getTime(), Date.now()) : Date.now();
    const diff = end - new Date(startDate).getTime();
    return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
}

function getTimeProgress(startDate?: string, endDate?: string): number | null {
    if (!startDate || !endDate) return null;
    const total = new Date(endDate).getTime() - new Date(startDate).getTime();
    if (total <= 0) return 100;
    const elapsed = Date.now() - new Date(startDate).getTime();
    return Math.min(100, Math.max(0, Math.round((elapsed / total) * 100)));
}

type MissionTimeState = "ended" | "overdue" | "ending-soon" | "normal";

function getMissionTimeState(mission: Mission): MissionTimeState {
    if (mission.status === "COMPLETED" || mission.status === "ARCHIVED") return "ended";
    const daysLeft = getDaysRemaining(mission.endDate);
    if (daysLeft === null) return "normal";
    if (daysLeft < 0) return "overdue";
    if (daysLeft <= 7) return "ending-soon";
    return "normal";
}

function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState(value);
    useEffect(() => {
        const timer = setTimeout(() => setDebouncedValue(value), delay);
        return () => clearTimeout(timer);
    }, [value, delay]);
    return debouncedValue;
}

// ============================================
// MISSIONS PAGE
// ============================================

export default function MissionsPage() {
    const [missions, setMissions] = useState<Mission[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [channelFilter, setChannelFilter] = useState<string>("all");
    const [viewMode, setViewMode] = useState<"cards" | "table">("cards");
    const [page, setPage] = useState<number>(1);
    const [total, setTotal] = useState<number>(0);
    const [selectedMissionForDrawer, setSelectedMissionForDrawer] = useState<Mission | null>(null);
    const [showNewMissionDialog, setShowNewMissionDialog] = useState(false);
    const { error: showError } = useToast();

    const pageSize = 10;
    const debouncedSearchQuery = useDebounce(searchQuery, 300);

    const fetchMissions = async () => {
        setIsLoading(true);
        try {
            const params = new URLSearchParams();
            params.set("page", String(page));
            params.set("limit", String(pageSize));
            if (statusFilter !== "all") {
                params.set("status", statusFilter);
            }
            if (debouncedSearchQuery.trim()) {
                params.set("search", debouncedSearchQuery.trim());
            }
            if (channelFilter !== "all") {
                params.set("channel", channelFilter);
            }
            const res = await fetch(`/api/missions?${params.toString()}`);
            const json = await res.json();
            if (json.success) {
                setMissions(json.data);
                if (json.pagination?.total != null) {
                    setTotal(json.pagination.total);
                } else {
                    setTotal(json.data.length);
                }
            } else {
                showError("Erreur", json.error || "Impossible de charger les missions");
            }
        } catch (err) {
            console.error("Failed to fetch missions:", err);
            showError("Erreur", "Impossible de charger les missions");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchMissions();
    }, [statusFilter, page, debouncedSearchQuery, channelFilter]);

    useEffect(() => {
        setPage(1);
    }, [debouncedSearchQuery, channelFilter]);

    const stats = {
        total: total || missions.length,
        active: missions.filter((m) => m.status === "ACTIVE").length,
        paused: missions.filter((m) => m.status === "PAUSED").length,
        totalMembers: missions.reduce((acc, m) => acc + (m._count?.sdrAssignments || 0), 0),
    };

    const totalPages = Math.max(1, Math.ceil((total || missions.length || 1) / pageSize));
    const startItem = total === 0 ? 0 : (page - 1) * pageSize + 1;
    const endItem = total === 0 ? 0 : Math.min(total, startItem + missions.length - 1);

    return (
        <div className="space-y-6 max-w-[1600px] mx-auto w-full pb-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/70">
                <div className="space-y-1">
                    <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-[#0B0F19] text-primary flex items-center justify-center shadow-md shadow-black/20 border border-slate-800">
                            <Target className="w-5 h-5" />
                        </div>
                        <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                            Centre de Missions
                        </h1>
                    </div>
                    <p className="text-xs text-slate-500 pl-1">
                        Pilotez vos campagnes, assignez les SDRs et suivez les objectifs en direct.
                    </p>
                </div>

                <div className="flex items-center gap-2.5 flex-wrap">
                    <button
                        onClick={fetchMissions}
                        disabled={isLoading}
                        title="Actualiser"
                        className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:text-primary hover:border-blue-300 transition-all shadow-2xs disabled:opacity-50"
                    >
                        <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin text-primary")} />
                    </button>

                    <div className="flex items-center bg-white p-1 rounded-xl border border-slate-200 shadow-2xs">
                        <button
                            onClick={() => setViewMode("cards")}
                            className={cn(
                                "p-1.5 rounded-lg transition-all",
                                viewMode === "cards" ? "bg-[#0B0F19] text-white" : "text-slate-500 hover:text-slate-900"
                            )}
                            title="Vue Grille de Cartes"
                        >
                            <LayoutGrid className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setViewMode("table")}
                            className={cn(
                                "p-1.5 rounded-lg transition-all",
                                viewMode === "table" ? "bg-[#0B0F19] text-white" : "text-slate-500 hover:text-slate-900"
                            )}
                            title="Vue Tableau Exécutif"
                        >
                            <TableIcon className="w-4 h-4" />
                        </button>
                    </div>

                    <button
                        onClick={() => setIsNewModalOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-primary hover:bg-primary-hover shadow-md shadow-primary/20 active:scale-[0.98] transition-all cursor-pointer"
                    >
                        <Plus className="w-4 h-4" />
                        Nouvelle mission
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                <div className="p-5 rounded-3xl bg-gradient-to-br from-[#0A1224] via-[#0B152A] to-[#050B16] border border-blue-900/70 text-white shadow-xl shadow-black/20 flex flex-col justify-between relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/15 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none" />
                    <div className="flex items-center justify-between z-10">
                        <div className="w-11 h-11 rounded-2xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-primary">
                            <Layers className="w-5 h-5" />
                        </div>
                        <span className="px-2.5 py-0.5 rounded-full bg-blue-500/15 border border-blue-400/30 text-blue-300 text-[10px] font-bold">
                            Volume Global
                        </span>
                    </div>
                    <div className="my-4 z-10">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Missions</p>
                        <div className="flex items-baseline gap-2 mt-1">
                            <p className="text-3xl sm:text-4xl font-black text-white tracking-tight tabular-nums">
                                {stats.total}
                            </p>
                            <span className="text-xs text-slate-400 font-medium">créées</span>
                        </div>
                    </div>
                    <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-white/10 z-10">
                        <span>Opérations managées</span>
                        <span className="text-blue-300 font-bold">{stats.total} missions</span>
                    </div>
                </div>

                <div className="p-5 rounded-3xl bg-gradient-to-br from-[#0B0F19] via-[#0D121F] to-[#04060A] border border-slate-800 text-white shadow-xl shadow-black/20 flex flex-col justify-between relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none" />
                    <div className="flex items-center justify-between z-10">
                        <div className="w-11 h-11 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                            <Target className="w-5 h-5" />
                        </div>
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-400/10 border border-emerald-400/20 text-emerald-300 text-[10px] font-bold flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> En Cours
                        </span>
                    </div>
                    <div className="my-4 z-10">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Missions Actives</p>
                        <div className="flex items-baseline gap-2 mt-1">
                            <p className="text-3xl sm:text-4xl font-black text-white tracking-tight tabular-nums">
                                {stats.active}
                            </p>
                            <span className="text-xs text-slate-400 font-medium">/ {stats.total}</span>
                        </div>
                    </div>
                    <div className="space-y-1.5 z-10 pt-2 border-t border-white/10">
                        <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-emerald-400 to-teal-400 rounded-full"
                                style={{ width: stats.total ? `${Math.round((stats.active / stats.total) * 100)}%` : "0%" }}
                            />
                        </div>
                        <div className="flex justify-between items-center text-[11px] text-slate-400">
                            <span>Taux de déploiement</span>
                            <span className="text-emerald-300 font-bold">{stats.total ? Math.round((stats.active / stats.total) * 100) : 0}%</span>
                        </div>
                    </div>
                </div>

                <div className="p-5 rounded-3xl bg-gradient-to-br from-white via-emerald-50/40 to-emerald-100/30 border border-emerald-200/80 shadow-sm hover:shadow-md transition-all flex flex-col justify-between relative overflow-hidden">
                    <div className="flex items-center justify-between z-10">
                        <div className="w-11 h-11 rounded-2xl bg-emerald-100/80 border border-emerald-200 flex items-center justify-center text-emerald-600 shadow-2xs">
                            <Users className="w-5 h-5" />
                        </div>
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-100/80 border border-emerald-200 text-emerald-800 text-[10px] font-bold">
                            Force SDR
                        </span>
                    </div>
                    <div className="my-4 z-10">
                        <p className="text-xs font-bold text-emerald-900/60 uppercase tracking-wider">Membres Assignés</p>
                        <div className="flex items-baseline gap-2 mt-1">
                            <p className="text-3xl sm:text-4xl font-black text-emerald-950 tracking-tight tabular-nums">
                                {stats.totalMembers}
                            </p>
                            <span className="text-xs text-emerald-700/70 font-medium">assignations SDR</span>
                        </div>
                    </div>
                    <div className="flex items-center justify-between text-xs text-emerald-800 pt-2 border-t border-emerald-200/60 z-10">
                        <span>Équipe opérationnelle</span>
                        <span className="font-bold">Prospection active</span>
                    </div>
                </div>

                <div className="p-5 rounded-3xl bg-gradient-to-br from-white via-amber-50/40 to-amber-100/30 border border-amber-200/80 shadow-sm hover:shadow-md transition-all flex flex-col justify-between relative overflow-hidden">
                    <div className="flex items-center justify-between z-10">
                        <div className="w-11 h-11 rounded-2xl bg-amber-100/80 border border-amber-200 flex items-center justify-center text-amber-600 shadow-2xs">
                            <Clock className="w-5 h-5" />
                        </div>
                        <span className="px-2.5 py-0.5 rounded-full bg-amber-100/80 border border-amber-200 text-amber-800 text-[10px] font-bold">
                            En Attente
                        </span>
                    </div>
                    <div className="my-4 z-10">
                        <p className="text-xs font-bold text-amber-900/60 uppercase tracking-wider">Missions en Pause</p>
                        <div className="flex items-baseline gap-2 mt-1">
                            <p className="text-3xl sm:text-4xl font-black text-amber-950 tracking-tight tabular-nums">
                                {stats.paused}
                            </p>
                            <span className="text-xs text-amber-700/70 font-medium">à réactiver</span>
                        </div>
                    </div>
                    <div className="flex items-center justify-between text-xs text-amber-800 pt-2 border-t border-amber-200/60 z-10">
                        <span>Disponibilité</span>
                        <span className="font-bold">{stats.paused > 0 ? "Reprise requise" : "Aucun blocage"}</span>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/80 p-3 shadow-2xs flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3 flex-1 min-w-[260px]">
                    <div className="relative flex-1">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Rechercher une mission, un client..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full h-10 pl-10 pr-9 text-xs font-medium text-slate-900 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary placeholder:text-slate-400 transition-all"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery("")}
                                className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-slate-200 transition-colors"
                            >
                                <X className="w-3.5 h-3.5 text-slate-400" />
                            </button>
                        )}
                    </div>

                    <div className="hidden lg:flex items-center bg-slate-100 p-1 rounded-xl">
                        {MISSION_STATUS_TABS.map((opt) => (
                            <button
                                key={opt.value}
                                onClick={() => {
                                    setStatusFilter(opt.value);
                                    setPage(1);
                                }}
                                className={cn(
                                    "px-3 py-1 text-xs font-semibold rounded-lg transition-all",
                                    statusFilter === opt.value
                                        ? "bg-[#0B0F19] text-white shadow-2xs"
                                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
                                )}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex items-center bg-slate-100 p-1 rounded-xl">
                    {[
                        { value: "all", label: "Tous canaux" },
                        { value: "CALL", label: "📞 Appel" },
                        { value: "EMAIL", label: "📧 Email" },
                        { value: "LINKEDIN", label: "💼 LinkedIn" },
                    ].map((opt) => (
                        <button
                            key={opt.value}
                            onClick={() => setChannelFilter(opt.value)}
                            className={cn(
                                "px-2.5 py-1 text-xs font-semibold rounded-lg transition-all",
                                channelFilter === opt.value
                                    ? "bg-white text-slate-900 shadow-2xs"
                                    : "text-slate-600 hover:text-slate-900"
                            )}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>
            </div>

            {isLoading && missions.length === 0 ? (
                <div className="grid gap-4">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="h-32 bg-slate-200/60 rounded-3xl animate-pulse" />
                    ))}
                </div>
            ) : missions.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-3xl border border-slate-200 shadow-sm">
                    <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4 border border-slate-200">
                        <Target className="w-8 h-8 text-slate-400" />
                    </div>
                    <h3 className="text-base font-bold text-slate-900 mb-1">
                        {searchQuery || channelFilter !== "all" ? "Aucune mission trouvée" : "Aucune mission créée"}
                    </h3>
                    <p className="text-xs text-slate-500 mb-6">
                        {searchQuery || channelFilter !== "all"
                            ? "Modifiez vos filtres ou termes de recherche pour voir plus de résultats."
                            : "Créez votre première mission pour commencer la prospection."}
                    </p>
                    {!searchQuery && channelFilter === "all" && (
                        <button
                            onClick={() => setShowNewMissionDialog(true)}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-primary hover:bg-primary-hover transition-colors"
                        >
                            <Plus className="w-4 h-4" />
                            Créer une mission
                        </button>
                    )}
                </div>
            ) : viewMode === "table" ? (
                <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                    <th className="py-3.5 px-6">Mission & Client</th>
                                    <th className="py-3.5 px-4">Canal</th>
                                    <th className="py-3.5 px-4">Statut</th>
                                    <th className="py-3.5 px-4">SDRs Déployés</th>
                                    <th className="py-3.5 px-4">Campagnes & Listes</th>
                                    <th className="py-3.5 px-4">Période</th>
                                    <th className="py-3.5 px-6 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-xs">
                                {missions.map((mission) => {
                                    const channel = CHANNEL_CONFIG[mission.channel] || CHANNEL_CONFIG.CALL;
                                    const ChannelIcon = channel.icon;
                                    const timeState = getMissionTimeState(mission);
                                    const daysRemaining = getDaysRemaining(mission.endDate);

                                    return (
                                        <tr
                                            key={mission.id}
                                            onClick={() => setSelectedMissionForDrawer(mission)}
                                            className="hover:bg-slate-50/70 transition-colors cursor-pointer"
                                        >
                                            <td className="py-4 px-6">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-xs shrink-0">
                                                        {mission.client?.name?.[0] || "M"}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="font-bold text-slate-900 truncate">{mission.name}</p>
                                                        <p className="text-[11px] text-slate-400 truncate">{mission.client?.name}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-4 px-4">
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 text-[11px] font-bold">
                                                    <ChannelIcon className="w-3 h-3" />
                                                    {channel.label}
                                                </span>
                                            </td>
                                            <td className="py-4 px-4">
                                                <span
                                                    className={cn(
                                                        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase",
                                                        mission.status === "ACTIVE"
                                                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                                            : mission.status === "PAUSED"
                                                            ? "bg-amber-50 text-amber-700 border border-amber-200"
                                                            : "bg-slate-100 text-slate-600"
                                                    )}
                                                >
                                                    <span
                                                        className={cn(
                                                            "w-1.5 h-1.5 rounded-full",
                                                            mission.status === "ACTIVE" ? "bg-emerald-500 animate-pulse" : "bg-slate-400"
                                                        )}
                                                    />
                                                    {MISSION_STATUS_CONFIG[mission.status]?.label ?? mission.status}
                                                </span>
                                            </td>
                                            <td className="py-4 px-4">
                                                <div className="flex items-center gap-1.5">
                                                    <Users className="w-3.5 h-3.5 text-slate-400" />
                                                    <span className="font-bold text-slate-700">{mission._count.sdrAssignments}</span>
                                                    <span className="text-slate-400">SDR</span>
                                                </div>
                                            </td>
                                            <td className="py-4 px-4 text-slate-500">
                                                {mission._count.campaigns} camp. · {mission._count.lists} listes
                                            </td>
                                            <td className="py-4 px-4">
                                                <div className="flex items-center gap-1 text-[11px] text-slate-500">
                                                    <Calendar className="w-3 h-3 text-slate-400" />
                                                    <span>
                                                        {mission.startDate
                                                            ? new Date(mission.startDate).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })
                                                            : "N/A"}
                                                    </span>
                                                    {timeState === "ending-soon" && daysRemaining !== null && (
                                                        <span className="ml-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded">
                                                            J-{daysRemaining}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="py-4 px-6 text-right">
                                                <span className="text-primary font-bold flex items-center justify-end gap-1">
                                                    Gérer <ChevronRight className="w-3.5 h-3.5" />
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <div className="grid gap-3.5">
                    {missions.map((mission) => {
                        const channelsList = mission.channels?.length ? mission.channels : [mission.channel];
                        const channel = CHANNEL_CONFIG[mission.channel] || CHANNEL_CONFIG.CALL;
                        const ChannelIcon = channel.icon;
                        const memberCount = mission._count.sdrAssignments;
                        const daysWorked = getDaysWorked(mission.startDate, mission.endDate);
                        const daysRemaining = getDaysRemaining(mission.endDate);
                        const timeProgress = getTimeProgress(mission.startDate, mission.endDate);
                        const timeState = getMissionTimeState(mission);

                        return (
                            <div
                                key={mission.id}
                                onClick={() => setSelectedMissionForDrawer(mission)}
                                className="group relative p-5 rounded-3xl bg-white border border-slate-200/80 hover:border-blue-300 hover:shadow-xl hover:shadow-blue-500/5 transition-all duration-300 cursor-pointer flex flex-col justify-between overflow-hidden"
                            >
                                <div className="flex items-center justify-between gap-4 flex-wrap">
                                    <div className="flex items-center gap-4 min-w-0">
                                        <div className="w-13 h-13 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 text-white flex items-center justify-center font-bold text-base shadow-md shadow-black/10 group-hover:scale-105 transition-transform shrink-0">
                                            {mission.client?.name?.[0] || "M"}
                                        </div>

                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <h3 className="text-base font-bold text-slate-900 group-hover:text-primary transition-colors truncate">
                                                    {mission.name}
                                                </h3>
                                                <span
                                                    className={cn(
                                                        "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase",
                                                        mission.status === "ACTIVE"
                                                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                                            : mission.status === "PAUSED"
                                                            ? "bg-amber-50 text-amber-700 border border-amber-200"
                                                            : "bg-slate-100 text-slate-600"
                                                    )}
                                                >
                                                    <span
                                                        className={cn(
                                                            "w-1.5 h-1.5 rounded-full",
                                                            mission.status === "ACTIVE" ? "bg-emerald-500 animate-pulse" : "bg-slate-400"
                                                        )}
                                                    />
                                                    {MISSION_STATUS_CONFIG[mission.status]?.label ?? mission.status}
                                                </span>

                                                {timeState === "ending-soon" && daysRemaining !== null && (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                                        <AlertTriangle className="w-3 h-3" />
                                                        Fin dans {daysRemaining}j
                                                    </span>
                                                )}
                                            </div>

                                            <p className="text-xs text-slate-400 truncate mt-0.5">
                                                {mission.client?.name}
                                                {mission.objective && <span> · {mission.objective}</span>}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4 flex-shrink-0">
                                        <div className="hidden sm:flex items-center -space-x-2">
                                            {mission.sdrAssignments?.slice(0, 3).map((a, idx) => (
                                                <div
                                                    key={a.sdr.id}
                                                    style={{ zIndex: 10 - idx }}
                                                    className="w-7 h-7 rounded-full bg-slate-900 border-2 border-white text-[10px] font-bold text-white flex items-center justify-center shadow-xs"
                                                    title={a.sdr.name}
                                                >
                                                    {a.sdr.name.slice(0, 2).toUpperCase()}
                                                </div>
                                            ))}
                                            {memberCount > 3 && (
                                                <div className="w-7 h-7 rounded-full bg-slate-100 border-2 border-white text-[10px] font-bold text-slate-600 flex items-center justify-center shadow-xs z-0">
                                                    +{memberCount - 3}
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-1">
                                            {channelsList.map((ch) => {
                                                const cfg = CHANNEL_CONFIG[ch] || CHANNEL_CONFIG.CALL;
                                                const Icon = cfg.icon;
                                                return (
                                                    <span
                                                        key={ch}
                                                        className={cn("px-2.5 py-1 rounded-xl text-[11px] font-bold flex items-center gap-1", cfg.bgLight, cfg.textColor)}
                                                    >
                                                        <Icon className="w-3 h-3" />
                                                        {cfg.label}
                                                    </span>
                                                );
                                            })}
                                        </div>

                                        <div className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-center text-slate-400 group-hover:text-white group-hover:bg-primary group-hover:border-primary transition-all">
                                            <ArrowUpRight className="w-4 h-4" />
                                        </div>
                                    </div>
                                </div>

                                {timeProgress !== null && (
                                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-3">
                                        <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                            <div
                                                className={cn(
                                                    "h-full rounded-full transition-all duration-500",
                                                    timeState === "ending-soon" ? "bg-gradient-to-r from-amber-400 to-orange-500" : "bg-gradient-to-r from-primary to-[#156cd4]"
                                                )}
                                                style={{ width: `${timeProgress}%` }}
                                            />
                                        </div>
                                        <span className="text-[11px] font-bold text-slate-500 tabular-nums shrink-0">
                                            {daysWorked !== null ? `${daysWorked}j travaillés` : `${timeProgress}%`}
                                        </span>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {totalPages > 1 && (
                <div className="flex items-center justify-between text-xs text-slate-500 pt-2">
                    <span>
                        Affichage {startItem}-{endItem} sur {total} missions
                    </span>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                            disabled={page === 1 || isLoading}
                            className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50 font-semibold shadow-2xs"
                        >
                            Précédent
                        </button>
                        <span className="px-2 font-bold text-slate-700">
                            Page {page} / {totalPages}
                        </span>
                        <button
                            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                            disabled={page === totalPages || isLoading}
                            className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50 font-semibold shadow-2xs"
                        >
                            Suivant
                        </button>
                    </div>
                </div>
            )}

            <MissionQuickViewDrawer
                isOpen={!!selectedMissionForDrawer}
                onClose={() => setSelectedMissionForDrawer(null)}
                mission={selectedMissionForDrawer}
            />

            <NewMissionDialog
                isOpen={showNewMissionDialog}
                onClose={() => setShowNewMissionDialog(false)}
                onCreated={fetchMissions}
            />
        </div>
    );
}
