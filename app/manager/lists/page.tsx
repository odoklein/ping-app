"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ConfirmModal, ContextMenu, useContextMenu, useToast } from "@/components/ui";
import {
    List,
    Building2,
    Users,
    Activity,
    Upload,
    Search,
    MoreVertical,
    Eye,
    Trash2,
    RefreshCw,
    Download,
    Database,
    Edit,
    Archive,
    ArchiveRestore,
    AlertTriangle,
    X,
    ChevronRight,
} from "lucide-react";
import Link from "next/link";
import { ListingSearchTab } from "@/components/listing/ListingSearchTab";
import type { ListingResult } from "@/components/listing/ListingSearchTab";
import { ImportToListModal } from "@/components/listing/ImportToListModal";
import { ListHealthDashboard } from "@/components/lists/ListHealthDashboard";
import {
    ProspectionHealthBadge,
    ActivityScoreBar,
    VelocityTrendBadge,
} from "@/components/lists/ProspectionHealthBadge";
import type { ListHealthSummary } from "@/lib/types/health";
import { cn } from "@/lib/utils";

function getCoverageColor(rate: number): string {
    if (rate >= 70) return "text-rose-600";
    if (rate >= 50) return "text-amber-600";
    return "text-emerald-600";
}

// ============================================
// TYPES
// ============================================

interface ListData {
    id: string;
    name: string;
    type: "SUZALI" | "CLIENT" | "MIXED";
    source?: string;
    createdAt: string;
    isArchived?: boolean;
    archivedAt?: string | null;
    mission?: {
        id: string;
        name: string;
    };
    _count: {
        companies: number;
    };
    stats?: {
        companyCount: number;
        contactCount: number;
        completeness: {
            INCOMPLETE: number;
            PARTIAL: number;
            ACTIONABLE: number;
        };
    };
}

const TYPE_STYLES = {
    SUZALI: { label: "Suzali", color: "bg-blue-50 text-blue-700 border-blue-200" },
    CLIENT: { label: "Client", color: "bg-amber-50 text-amber-700 border-amber-200" },
    MIXED: { label: "Mixte", color: "bg-cyan-50 text-cyan-700 border-cyan-200" },
};

const LISTS_QUERY_KEY = ["manager", "lists"] as const;

async function fetchListsApi(): Promise<ListData[]> {
    const pageSize = 200;
    let page = 1;
    let hasMore = true;
    const allLists: ListData[] = [];

    while (hasMore) {
        const res = await fetch(`/api/lists?page=${page}&limit=${pageSize}`);
        const json = await res.json();
        if (!json.success) throw new Error(json.error || "Impossible de charger les listes");

        const batch = Array.isArray(json.data) ? (json.data as ListData[]) : [];
        allLists.push(...batch);

        hasMore = Boolean(json.pagination?.hasMore);
        page += 1;

        if (!json.pagination && batch.length < pageSize) {
            hasMore = false;
        }
    }

    return allLists;
}

async function fetchHealthByListIds(listIds: string[]): Promise<Map<string, ListHealthSummary>> {
    if (listIds.length === 0) return new Map();
    const params = new URLSearchParams();
    listIds.forEach((id) => params.append("listIds[]", id));
    const res = await fetch(`/api/lists/health?${params.toString()}`);
    const json = await res.json();
    if (!json.success) throw new Error(json.error || "Impossible de charger la santé des listes");
    const map = new Map<string, ListHealthSummary>();
    for (const item of (json.data as ListHealthSummary[])) {
        map.set(item.listId, item);
    }
    return map;
}

export default function ListsPage() {
    const router = useRouter();
    const queryClient = useQueryClient();
    const { success, error: showError } = useToast();
    const { data: lists = [], isLoading, isFetching, refetch } = useQuery({
        queryKey: LISTS_QUERY_KEY,
        queryFn: fetchListsApi,
    });
    const [searchQuery, setSearchQuery] = useState("");
    const [sizeFilter, setSizeFilter] = useState<string>("all");
    const [qualityFilter, setQualityFilter] = useState<string>("all");
    const [showArchived, setShowArchived] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deletingList, setDeletingList] = useState<ListData | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const { position, contextData, handleContextMenu, close: closeMenu } = useContextMenu();

    const [activeTab, setActiveTab] = useState<"lists" | "search" | "health">("lists");
    const [importModalOpen, setImportModalOpen] = useState(false);
    const [resultsToImport, setResultsToImport] = useState<ListingResult[]>([]);
    const visibleListIds = lists.filter((l) => !l.isArchived).map((l) => l.id);
    const { data: healthByListId = new Map<string, ListHealthSummary>() } = useQuery({
        queryKey: ["manager", "lists-health", visibleListIds],
        queryFn: () => fetchHealthByListIds(visibleListIds),
        enabled: (activeTab === "lists" || activeTab === "health") && visibleListIds.length > 0,
        staleTime: 2 * 60 * 1000,
    });

    const handleImportRequest = (results: ListingResult[]) => {
        setResultsToImport(results);
        setImportModalOpen(true);
    };

    const handleImportComplete = () => {
        setImportModalOpen(false);
        setResultsToImport([]);
        setActiveTab("lists");
        queryClient.invalidateQueries({ queryKey: LISTS_QUERY_KEY });
    };

    const handleDeleteList = async () => {
        if (!deletingList) return;

        setIsDeleting(true);
        try {
            const res = await fetch(`/api/lists/${deletingList.id}`, {
                method: "DELETE",
            });
            const json = await res.json();

            if (json.success) {
                success("Liste supprimée", `${deletingList.name} a été supprimée`);
                queryClient.invalidateQueries({ queryKey: LISTS_QUERY_KEY });
            } else {
                showError("Erreur", json.error || "Impossible de supprimer");
            }
        } catch (err) {
            showError("Erreur", "Impossible de supprimer la liste");
        } finally {
            setIsDeleting(false);
            setShowDeleteModal(false);
            setDeletingList(null);
        }
    };

    const handleArchiveToggle = async (list: ListData) => {
        const newArchivedState = !list.isArchived;
        
        queryClient.setQueryData<ListData[]>(LISTS_QUERY_KEY, (old) => {
            if (!old) return old;
            return old.map((l) =>
                l.id === list.id
                    ? { ...l, isArchived: newArchivedState, archivedAt: newArchivedState ? new Date().toISOString() : null }
                    : l
            );
        });

        try {
            const res = await fetch(`/api/lists/${list.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ isArchived: newArchivedState }),
            });
            const json = await res.json();

            if (json.success) {
                success(
                    newArchivedState ? "Liste archivée" : "Liste désarchivée",
                    `${list.name} a été ${newArchivedState ? "archivée" : "désarchivée"}`
                );
            } else {
                queryClient.setQueryData<ListData[]>(LISTS_QUERY_KEY, (old) => {
                    if (!old) return old;
                    return old.map((l) =>
                        l.id === list.id ? { ...l, isArchived: list.isArchived, archivedAt: list.archivedAt } : l
                    );
                });
                showError("Erreur", json.error || "Impossible de modifier la liste");
            }
        } catch (err) {
            queryClient.setQueryData<ListData[]>(LISTS_QUERY_KEY, (old) => {
                if (!old) return old;
                return old.map((l) =>
                    l.id === list.id ? { ...l, isArchived: list.isArchived, archivedAt: list.archivedAt } : l
                );
            });
            showError("Erreur", "Impossible de modifier la liste");
        }
    };

    const getContextMenuItems = (list: ListData) => [
        {
            label: "Voir les détails",
            icon: <Eye className="w-4 h-4" />,
            onClick: () => router.push(`/manager/lists/${list.id}`),
        },
        {
            label: "Modifier",
            icon: <Edit className="w-4 h-4" />,
            onClick: () => router.push(`/manager/lists/${list.id}/edit`),
        },
        {
            label: "Exporter CSV",
            icon: <Download className="w-4 h-4" />,
            onClick: () => window.open(`/api/lists/${list.id}/export`, "_blank"),
        },
        {
            label: list.isArchived ? "Désarchiver" : "Archiver",
            icon: list.isArchived ? <ArchiveRestore className="w-4 h-4" /> : <Archive className="w-4 h-4" />,
            onClick: () => handleArchiveToggle(list),
            variant: "default" as const,
            divider: true,
        },
        {
            label: "Supprimer",
            icon: <Trash2 className="w-4 h-4" />,
            onClick: () => {
                setDeletingList(list);
                setShowDeleteModal(true);
            },
            variant: "danger" as const,
        },
    ];

    const filteredLists = lists.filter((list) => {
        const matchesSearch =
            !searchQuery ||
            list.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (list.mission?.name && list.mission.name.toLowerCase().includes(searchQuery.toLowerCase()));

        const contactCount = list.stats?.contactCount || 0;
        let matchesSize = true;
        if (sizeFilter === "small") matchesSize = contactCount < 50;
        else if (sizeFilter === "medium") matchesSize = contactCount >= 50 && contactCount < 200;
        else if (sizeFilter === "large") matchesSize = contactCount >= 200;

        const totalContacts = list.stats?.contactCount || 0;
        const actionablePercent =
            totalContacts > 0
                ? Math.round(((list.stats?.completeness?.ACTIONABLE || 0) / totalContacts) * 100)
                : 0;
        let matchesQuality = true;
        if (qualityFilter === "low") matchesQuality = actionablePercent < 50;
        else if (qualityFilter === "medium") matchesQuality = actionablePercent >= 50 && actionablePercent < 80;
        else if (qualityFilter === "high") matchesQuality = actionablePercent >= 80;

        const matchesArchived = showArchived ? !!list.isArchived : !list.isArchived;

        return matchesSearch && matchesSize && matchesQuality && matchesArchived;
    });

    const stats = useMemo(() => {
        const visibleLists = lists.filter((l) => !l.isArchived);
        const total = visibleLists.length;
        const companies = visibleLists.reduce((acc, l) => acc + (l._count?.companies || 0), 0);
        const contacts = visibleLists.reduce((acc, l) => acc + (l.stats?.contactCount || 0), 0);
        let atRisk = 0;
        let stalled = 0;
        for (const health of healthByListId.values()) {
            if (health.status === "AT_RISK") atRisk++;
            else if (health.status === "STALLED") stalled++;
        }
        return { total, companies, contacts, atRisk, stalled, toWatch: atRisk + stalled };
    }, [lists, healthByListId]);

    return (
        <div className="space-y-6 max-w-[1600px] mx-auto w-full pb-8">
            {/* ── Top Header & Tab Navigation ── */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/70">
                <div className="space-y-1">
                    <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-[#0B0F19] text-[#2890F8] flex items-center justify-center shadow-md shadow-black/20 border border-slate-800">
                            <List className="w-5 h-5" />
                        </div>
                        <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                            Listes & Segments
                        </h1>
                    </div>
                    <p className="text-xs text-slate-500 pl-1">
                        Gérez vos bases prospects, la santé d&apos;activité et la recherche de leads Suzali.
                    </p>
                </div>

                <div className="flex items-center gap-2.5 flex-wrap">
                    {/* Tabs Pill */}
                    <div className="flex items-center p-1 bg-white rounded-xl border border-slate-200 shadow-2xs">
                        <button
                            onClick={() => setActiveTab("lists")}
                            className={cn(
                                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                                activeTab === "lists"
                                    ? "bg-[#0B0F19] text-white shadow-2xs"
                                    : "text-slate-600 hover:text-slate-900"
                            )}
                        >
                            <List className="w-3.5 h-3.5" />
                            Mes Listes
                        </button>
                        <button
                            onClick={() => setActiveTab("search")}
                            className={cn(
                                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                                activeTab === "search"
                                    ? "bg-[#0B0F19] text-white shadow-2xs"
                                    : "text-slate-600 hover:text-slate-900"
                            )}
                        >
                            <Database className="w-3.5 h-3.5" />
                            Recherche Leads
                        </button>
                        <button
                            onClick={() => setActiveTab("health")}
                            className={cn(
                                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                                activeTab === "health"
                                    ? "bg-[#0B0F19] text-white shadow-2xs"
                                    : "text-slate-600 hover:text-slate-900"
                            )}
                        >
                            <Activity className="w-3.5 h-3.5" />
                            Santé Prospection
                        </button>
                    </div>

                    {activeTab === "lists" && (
                        <>
                            <button
                                onClick={() => refetch()}
                                disabled={isFetching}
                                title="Actualiser"
                                className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:text-[#2890F8] hover:border-blue-300 transition-all shadow-2xs disabled:opacity-50"
                            >
                                <RefreshCw className={cn("w-4 h-4", isFetching && "animate-spin text-[#2890F8]")} />
                            </button>

                            <Link
                                href="/manager/lists/import"
                                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-[#2890F8] to-[#156cd4] hover:from-[#1e7fd8] hover:to-[#0f5ab5] shadow-md shadow-blue-500/20 active:scale-[0.98] transition-all"
                            >
                                <Upload className="w-4 h-4" />
                                <span>Importer CSV</span>
                            </Link>
                        </>
                    )}
                </div>
            </div>

            {activeTab === "lists" ? (
                <>
                    {/* ── 4 Executive KPI Cards ── */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                        {/* 1. Total Listes — Midnight Sapphire Card */}
                        <div className="p-5 rounded-3xl bg-gradient-to-br from-[#0A1224] via-[#0B152A] to-[#050B16] border border-blue-900/70 text-white shadow-xl shadow-black/20 flex flex-col justify-between relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-[#2890F8]/15 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none" />
                            <div className="flex items-center justify-between z-10">
                                <div className="w-11 h-11 rounded-2xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-[#2890F8]">
                                    <List className="w-5 h-5" />
                                </div>
                                <span className="px-2.5 py-0.5 rounded-full bg-blue-500/15 border border-blue-400/30 text-blue-300 text-[10px] font-bold">
                                    Bases
                                </span>
                            </div>
                            <div className="my-4 z-10">
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Listes Actives</p>
                                <div className="flex items-baseline gap-2 mt-1">
                                    <p className="text-3xl sm:text-4xl font-black text-white tracking-tight tabular-nums">
                                        {stats.total}
                                    </p>
                                    <span className="text-xs text-slate-400 font-medium">segments</span>
                                </div>
                            </div>
                            <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-white/10 z-10">
                                <span>Bases opérationnelles</span>
                                <span className="text-blue-300 font-bold">{stats.total} actives</span>
                            </div>
                        </div>

                        {/* 2. Sociétés Couvertes — Obsidian Gold Card */}
                        <div className="p-5 rounded-3xl bg-gradient-to-br from-[#0B0F19] via-[#0D121F] to-[#04060A] border border-slate-800 text-white shadow-xl shadow-black/20 flex flex-col justify-between relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none" />
                            <div className="flex items-center justify-between z-10">
                                <div className="w-11 h-11 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                                    <Building2 className="w-5 h-5" />
                                </div>
                                <span className="px-2.5 py-0.5 rounded-full bg-amber-400/10 border border-amber-400/20 text-amber-300 text-[10px] font-bold">
                                    Comptes
                                </span>
                            </div>
                            <div className="my-4 z-10">
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Sociétés Couvertes</p>
                                <div className="flex items-baseline gap-2 mt-1">
                                    <p className="text-3xl sm:text-4xl font-black text-white tracking-tight tabular-nums">
                                        {stats.companies.toLocaleString("fr-FR")}
                                    </p>
                                    <span className="text-xs text-slate-400 font-medium">entreprises</span>
                                </div>
                            </div>
                            <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-white/10 z-10">
                                <span>Couverture B2B</span>
                                <span className="text-amber-300 font-bold">Prospectées</span>
                            </div>
                        </div>

                        {/* 3. Contacts Qualifiés — Mint Emerald Theme */}
                        <div className="p-5 rounded-3xl bg-gradient-to-br from-white via-emerald-50/40 to-emerald-100/30 border border-emerald-200/80 shadow-sm hover:shadow-md transition-all flex flex-col justify-between relative overflow-hidden">
                            <div className="flex items-center justify-between z-10">
                                <div className="w-11 h-11 rounded-2xl bg-emerald-100/80 border border-emerald-200 flex items-center justify-center text-emerald-600 shadow-2xs">
                                    <Users className="w-5 h-5" />
                                </div>
                                <span className="px-2.5 py-0.5 rounded-full bg-emerald-100/80 border border-emerald-200 text-emerald-800 text-[10px] font-bold">
                                    Contacts
                                </span>
                            </div>
                            <div className="my-4 z-10">
                                <p className="text-xs font-bold text-emerald-900/60 uppercase tracking-wider">Contacts Enregistrés</p>
                                <div className="flex items-baseline gap-2 mt-1">
                                    <p className="text-3xl sm:text-4xl font-black text-emerald-950 tracking-tight tabular-nums">
                                        {stats.contacts.toLocaleString("fr-FR")}
                                    </p>
                                    <span className="text-xs text-emerald-700/70 font-medium">décideurs</span>
                                </div>
                            </div>
                            <div className="flex items-center justify-between text-xs text-emerald-800 pt-2 border-t border-emerald-200/60 z-10">
                                <span>Contacts individuels</span>
                                <span className="font-bold">Base adressable</span>
                            </div>
                        </div>

                        {/* 4. Alertes Santé Prospection — Solar Amber Soft Theme */}
                        <div
                            onClick={() => {
                                if (stats.toWatch > 0) setActiveTab("health");
                            }}
                            className={cn(
                                "p-5 rounded-3xl bg-gradient-to-br from-white via-amber-50/40 to-amber-100/30 border border-amber-200/80 shadow-sm hover:shadow-md transition-all flex flex-col justify-between relative overflow-hidden",
                                stats.toWatch > 0 && "cursor-pointer hover:border-amber-300"
                            )}
                        >
                            <div className="flex items-center justify-between z-10">
                                <div className="w-11 h-11 rounded-2xl bg-amber-100/80 border border-amber-200 flex items-center justify-center text-amber-600 shadow-2xs">
                                    <AlertTriangle className="w-5 h-5" />
                                </div>
                                <span className="px-2.5 py-0.5 rounded-full bg-amber-100/80 border border-amber-200 text-amber-800 text-[10px] font-bold">
                                    Santé Base
                                </span>
                            </div>
                            <div className="my-4 z-10">
                                <p className="text-xs font-bold text-amber-900/60 uppercase tracking-wider">À Surveiller</p>
                                <div className="flex items-baseline gap-2 mt-1">
                                    <p className="text-3xl sm:text-4xl font-black text-amber-950 tracking-tight tabular-nums">
                                        {stats.toWatch}
                                    </p>
                                    <span className="text-xs text-amber-700/70 font-medium">({stats.atRisk} à risque)</span>
                                </div>
                            </div>
                            <div className="flex items-center justify-between text-xs text-amber-800 pt-2 border-t border-amber-200/60 z-10">
                                <span>{stats.toWatch > 0 ? "Voir le tableau de santé" : "Santé optimale"}</span>
                                <ChevronRight className="w-4 h-4 text-amber-600" />
                            </div>
                        </div>
                    </div>

                    {/* ── Unified Filter Bar ── */}
                    <div className="bg-white rounded-2xl border border-slate-200/80 p-3 shadow-2xs flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-3 flex-1 min-w-[260px]">
                            <div className="relative flex-1">
                                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Rechercher une liste, une mission..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full h-10 pl-10 pr-9 text-xs font-medium text-slate-900 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2890F8]/20 focus:border-[#2890F8] placeholder:text-slate-400 transition-all"
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

                            {/* Size Filters */}
                            <div className="hidden lg:flex items-center bg-slate-100 p-1 rounded-xl">
                                {[
                                    { value: "all", label: "Toutes tailles" },
                                    { value: "small", label: "< 50" },
                                    { value: "medium", label: "50-200" },
                                    { value: "large", label: "200+" },
                                ].map((s) => (
                                    <button
                                        key={s.value}
                                        onClick={() => setSizeFilter(s.value)}
                                        className={cn(
                                            "px-2.5 py-1 text-xs font-semibold rounded-lg transition-all",
                                            sizeFilter === s.value
                                                ? "bg-[#0B0F19] text-white shadow-2xs"
                                                : "text-slate-600 hover:text-slate-900"
                                        )}
                                    >
                                        {s.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            {/* Quality Filter */}
                            <div className="flex items-center bg-slate-100 p-1 rounded-xl">
                                {[
                                    { value: "all", label: "Qualité" },
                                    { value: "low", label: "< 50%" },
                                    { value: "medium", label: "50-80%" },
                                    { value: "high", label: "80%+" },
                                ].map((q) => (
                                    <button
                                        key={q.value}
                                        onClick={() => setQualityFilter(q.value)}
                                        className={cn(
                                            "px-2.5 py-1 text-xs font-semibold rounded-lg transition-all",
                                            qualityFilter === q.value
                                                ? "bg-[#0B0F19] text-white shadow-2xs"
                                                : "text-slate-600 hover:text-slate-900"
                                        )}
                                    >
                                        {q.label}
                                    </button>
                                ))}
                            </div>

                            {/* Archive toggle */}
                            <button
                                onClick={() => setShowArchived((p) => !p)}
                                className={cn(
                                    "flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all border",
                                    showArchived
                                        ? "bg-amber-50 text-amber-800 border-amber-200"
                                        : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                                )}
                            >
                                <Archive className="w-3.5 h-3.5" />
                                <span>Archivées</span>
                            </button>
                        </div>
                    </div>

                    {/* ── Table View ── */}
                    {isLoading && lists.length === 0 ? (
                        <div className="grid gap-3">
                            {Array.from({ length: 5 }).map((_, i) => (
                                <div key={i} className="h-16 bg-slate-200/60 rounded-2xl animate-pulse" />
                            ))}
                        </div>
                    ) : filteredLists.length === 0 ? (
                        <div className="text-center py-20 bg-white rounded-3xl border border-slate-200 shadow-sm">
                            <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4 border border-slate-200">
                                <List className="w-8 h-8 text-slate-400" />
                            </div>
                            <h3 className="text-base font-bold text-slate-900 mb-1">
                                {searchQuery || sizeFilter !== "all" || qualityFilter !== "all" || showArchived
                                    ? "Aucune liste ne correspond à vos filtres"
                                    : "Aucune liste de contacts créée"}
                            </h3>
                            <p className="text-xs text-slate-500 mb-6">
                                {searchQuery || sizeFilter !== "all" || qualityFilter !== "all"
                                    ? "Essayez d'ajuster ou réinitialiser vos filtres."
                                    : "Importez votre premier fichier CSV pour générer une liste."}
                            </p>
                            {!searchQuery && sizeFilter === "all" && qualityFilter === "all" && !showArchived && (
                                <Link
                                    href="/manager/lists/import"
                                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#2890F8] hover:bg-[#1a75ce] transition-colors"
                                >
                                    <Upload className="w-4 h-4" />
                                    Importer un CSV
                                </Link>
                            )}
                        </div>
                    ) : (
                        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                            <th className="py-3.5 px-6">Nom de la liste</th>
                                            <th className="py-3.5 px-4">Mission associée</th>
                                            <th className="py-3.5 px-4 text-center">Type</th>
                                            <th className="py-3.5 px-4 text-center">Sociétés</th>
                                            <th className="py-3.5 px-4 text-center">Contacts</th>
                                            <th className="py-3.5 px-6">Santé & Activité</th>
                                            <th className="py-3.5 px-4 text-center">Source</th>
                                            <th className="py-3.5 px-6 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 text-xs">
                                        {filteredLists.map((list) => {
                                            const totalContacts = list.stats?.contactCount || 0;
                                            const actionablePercent =
                                                totalContacts > 0
                                                    ? Math.round(((list.stats?.completeness?.ACTIONABLE || 0) / totalContacts) * 100)
                                                    : 0;
                                            const health = healthByListId.get(list.id);

                                            return (
                                                <tr
                                                    key={list.id}
                                                    onClick={() => router.push(`/manager/lists/${list.id}`)}
                                                    onContextMenu={(e) => handleContextMenu(e, list)}
                                                    className={cn(
                                                        "hover:bg-slate-50/70 transition-colors cursor-pointer group",
                                                        list.isArchived && "opacity-60"
                                                    )}
                                                >
                                                    <td className="py-4 px-6">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 font-bold text-xs shrink-0 group-hover:bg-[#2890F8] group-hover:text-white group-hover:border-[#2890F8] transition-all">
                                                                <List className="w-4 h-4" />
                                                            </div>
                                                            <div className="min-w-0">
                                                                <div className="flex items-center gap-2">
                                                                    <p className="font-bold text-slate-900 group-hover:text-[#2890F8] transition-colors truncate">
                                                                        {list.name}
                                                                    </p>
                                                                    {list.isArchived && (
                                                                        <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-slate-100 text-slate-500 border border-slate-200">
                                                                            Archivée
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                {totalContacts > 0 && (
                                                                    <p className="text-[11px] text-slate-400 mt-0.5">
                                                                        {actionablePercent}% qualifié
                                                                        {health && health.actions7d > 0 && (
                                                                            <span> · {health.actions7d} actions 7j</span>
                                                                        )}
                                                                    </p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </td>

                                                    <td className="py-4 px-4 text-slate-600 font-medium">
                                                        {list.mission?.name || <span className="text-slate-400 italic">Non assignée</span>}
                                                    </td>

                                                    <td className="py-4 px-4 text-center">
                                                        <span
                                                            className={cn(
                                                                "inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border",
                                                                TYPE_STYLES[list.type]?.color
                                                            )}
                                                        >
                                                            {TYPE_STYLES[list.type]?.label ?? list.type}
                                                        </span>
                                                    </td>

                                                    <td className="py-4 px-4 text-center font-bold text-slate-900 tabular-nums">
                                                        {list._count?.companies || 0}
                                                    </td>

                                                    <td className="py-4 px-4 text-center font-bold text-slate-900 tabular-nums">
                                                        {totalContacts}
                                                    </td>

                                                    <td className="py-4 px-6" onClick={(e) => e.stopPropagation()}>
                                                        {!health ? (
                                                            <span className="text-[11px] text-slate-400">Non renseigné</span>
                                                        ) : (
                                                            <div className="flex flex-col gap-1 w-full min-w-[170px]">
                                                                <div className="flex items-center justify-between gap-2">
                                                                    <ProspectionHealthBadge
                                                                        status={health.status}
                                                                        statusLabel={health.statusLabel}
                                                                        compact
                                                                    />
                                                                    <VelocityTrendBadge
                                                                        trend={health.velocity.trend}
                                                                        explanation={health.velocity.trendExplanation}
                                                                    />
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    <div className="flex-1">
                                                                        <ActivityScoreBar
                                                                            score={health.activityScore}
                                                                            size="sm"
                                                                            explanation="Score composite 0-100"
                                                                        />
                                                                    </div>
                                                                    {health.coverageRate !== null && (
                                                                        <span
                                                                            className={cn(
                                                                                "text-[10px] font-bold tabular-nums shrink-0",
                                                                                getCoverageColor(health.coverageRate)
                                                                            )}
                                                                        >
                                                                            {Math.round(health.coverageRate)}%
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </td>

                                                    <td className="py-4 px-4 text-center text-slate-400 text-[11px]">
                                                        {list.source || "N/A"}
                                                    </td>

                                                    <td className="py-4 px-6 text-right">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleContextMenu(e, list);
                                                            }}
                                                            className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                                                        >
                                                            <MoreVertical className="w-4 h-4" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </>
            ) : activeTab === "search" ? (
                <div className="bg-white border border-slate-200/80 rounded-3xl overflow-hidden shadow-sm min-h-[600px] flex flex-col p-2">
                    <ListingSearchTab onImport={handleImportRequest} />
                </div>
            ) : (
                <div className="bg-white border border-slate-200/80 rounded-3xl overflow-hidden shadow-sm p-6">
                    <ListHealthDashboard />
                </div>
            )}

            <ImportToListModal
                isOpen={importModalOpen}
                onClose={() => {
                    setImportModalOpen(false);
                    setResultsToImport([]);
                }}
                results={resultsToImport}
                onImportComplete={handleImportComplete}
            />

            <ContextMenu
                items={contextData ? getContextMenuItems(contextData) : []}
                position={position}
                onClose={closeMenu}
            />

            <ConfirmModal
                isOpen={showDeleteModal}
                onClose={() => {
                    setShowDeleteModal(false);
                    setDeletingList(null);
                }}
                onConfirm={handleDeleteList}
                title="Supprimer la liste ?"
                message={`Êtes-vous sûr de vouloir supprimer "${deletingList?.name}" ? Cette action supprimera également toutes les sociétés et contacts associés.`}
                confirmText="Supprimer"
                variant="danger"
                isLoading={isDeleting}
            />
        </div>
    );
}
