"use client";

import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui";
import {
    Search,
    Plus,
    Building2,
    Target,
    Users,
    RefreshCw,
    Loader2,
    ArrowRight,
    X,
    FileText,
    Mic,
    ChevronDown,
    Clock,
    Sparkles,
} from "lucide-react";
import Link from "next/link";
import { ClientOnboardingModal } from "@/components/manager/ClientOnboardingModal";
import { ClientDrawer } from "@/components/drawers";
import { OnboardingReadinessGauge } from "@/components/common/OnboardingReadinessGauge";
import { CLIENTS_QUERY_KEY, LEEXI_RECAPS_QUERY_KEY } from "@/lib/query-keys";
import { cn } from "@/lib/utils";

// ============================================
// TYPES
// ============================================

interface OnboardingReadiness {
    calendarConnected: boolean;
    personaSet: boolean;
    missionCreated: boolean;
}

interface ClientMission {
    id: string;
    name: string;
    endDate: string;
    isActive: boolean;
    status: string;
}

interface Client {
    id: string;
    name: string;
    industry?: string;
    email?: string;
    phone?: string;
    createdAt: string;
    missions: ClientMission[];
    _count: {
        missions: number;
        users: number;
    };
    readiness?: OnboardingReadiness;
}

interface LeexiRecapItem {
    id: string;
    title: string;
    date: string;
    duration: number;
    recapText: string;
    companyName: string;
}

interface LeexiMatchedGroup {
    clientId: string;
    clientName: string;
    recaps: LeexiRecapItem[];
}

interface LeexiRecapsData {
    matched: LeexiMatchedGroup[];
    unmatched: LeexiRecapItem[];
    totalRecaps: number;
    totalMatched: number;
}

// ============================================
// FETCHERS
// ============================================

async function fetchClientsApi(): Promise<Client[]> {
    const res = await fetch("/api/clients");
    const json = await res.json();
    if (!json.success) throw new Error(json.error || "Impossible de charger les clients");
    return json.data;
}

async function fetchLeexiRecapsApi(): Promise<LeexiRecapsData | null> {
    const res = await fetch("/api/leexi/recaps");
    const json = await res.json();
    if (json.success) return json.data;
    if (res.status !== 503) throw new Error(json.error || "Erreur Leexi");
    return null;
}

// ============================================
// CLIENTS PAGE
// ============================================

export default function ClientsPage() {
    const queryClient = useQueryClient();
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<"all" | "active_mission" | "onboarding" | "no_mission">("all");
    const [industryFilter, setIndustryFilter] = useState<string>("all");
    const [sortBy, setSortBy] = useState<"name" | "recent" | "missions">("recent");

    // Onboarding modal
    const [showOnboardingModal, setShowOnboardingModal] = useState(false);
    const [initialRecapText, setInitialRecapText] = useState<string | undefined>(undefined);

    // Drawer state
    const [selectedClient, setSelectedClient] = useState<Client | null>(null);
    const [showDrawer, setShowDrawer] = useState(false);

    // Leexi UI state
    const [showLeexiSection, setShowLeexiSection] = useState(false);
    const [expandedRecapId, setExpandedRecapId] = useState<string | null>(null);

    // React Query: clients list
    const {
        data: clients = [],
        isLoading,
        isFetching,
        refetch: refetchClients,
        error: clientsError,
    } = useQuery({
        queryKey: CLIENTS_QUERY_KEY,
        queryFn: fetchClientsApi,
    });

    // React Query: Leexi recaps
    const {
        data: leexiData,
        isLoading: isLoadingLeexi,
        refetch: refetchLeexi,
        error: leexiErrorQuery,
    } = useQuery({
        queryKey: LEEXI_RECAPS_QUERY_KEY,
        queryFn: fetchLeexiRecapsApi,
        retry: false,
        staleTime: 2 * 60 * 1000,
    });

    // Unique Industries
    const industries = useMemo(() => {
        const set = new Set<string>();
        clients.forEach((c) => {
            if (c.industry && c.industry.trim()) set.add(c.industry.trim());
        });
        return Array.from(set).sort();
    }, [clients]);

    // Filter & Sort Clients
    const filteredClients = useMemo(() => {
        return clients
            .filter((client) => {
                const matchesSearch =
                    client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    (client.industry && client.industry.toLowerCase().includes(searchQuery.toLowerCase())) ||
                    (client.email && client.email.toLowerCase().includes(searchQuery.toLowerCase()));

                if (!matchesSearch) return false;

                if (industryFilter !== "all" && client.industry !== industryFilter) {
                    return false;
                }

                const hasActiveMission = client.missions?.some((m) => m.isActive && m.status === "ACTIVE");
                const hasAnyMission = (client._count?.missions ?? 0) > 0;

                if (statusFilter === "active_mission" && !hasActiveMission) return false;
                if (statusFilter === "no_mission" && hasAnyMission) return false;
                if (statusFilter === "onboarding" && client.readiness && (!client.readiness.calendarConnected || !client.readiness.missionCreated)) return true;
                if (statusFilter === "onboarding" && !client.readiness) return false;

                return true;
            })
            .sort((a, b) => {
                if (sortBy === "name") return a.name.localeCompare(b.name);
                if (sortBy === "missions") return (b._count.missions || 0) - (a._count.missions || 0);
                return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            });
    }, [clients, searchQuery, industryFilter, statusFilter, sortBy]);

    // Stats
    const totalClients = clients.length;
    const activeMissionClients = clients.filter((c) => c.missions?.some((m) => m.isActive && m.status === "ACTIVE")).length;
    const totalUsers = clients.reduce((acc, c) => acc + (c._count?.users || 0), 0);
    const clientsWithPortal = clients.filter((c) => (c._count?.users || 0) > 0).length;
    const portalAdoptionRate = totalClients ? Math.round((clientsWithPortal / totalClients) * 100) : 0;

    const getClientRecapCount = (clientId: string) => {
        if (!leexiData) return 0;
        const group = leexiData.matched.find((m) => m.clientId === clientId);
        return group?.recaps.length || 0;
    };

    const handleOnboardingSuccess = () => {
        queryClient.invalidateQueries({ queryKey: CLIENTS_QUERY_KEY });
        queryClient.invalidateQueries({ queryKey: LEEXI_RECAPS_QUERY_KEY });
    };

    const handleCreateFromRecap = (recapTextContent: string) => {
        setInitialRecapText(recapTextContent);
        setShowOnboardingModal(true);
    };

    const handleClientClick = (client: Client) => {
        setSelectedClient(client);
        setShowDrawer(true);
    };

    const handleClientUpdate = (updatedClient: Client) => {
        queryClient.setQueryData<Client[]>(CLIENTS_QUERY_KEY, (prev) =>
            prev ? prev.map((c) => (c.id === updatedClient.id ? { ...c, ...updatedClient } : c)) : prev
        );
        setSelectedClient((prev) => (prev ? { ...prev, ...updatedClient } : null));
    };

    if (clientsError) {
        return (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
                <p className="text-sm text-red-600">{(clientsError as Error).message}</p>
                <button
                    onClick={() => refetchClients()}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-hover transition-colors"
                >
                    <RefreshCw className="w-4 h-4" />
                    Réessayer
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-[1600px] mx-auto w-full pb-8">
            {/* ── Top Header & Actions ── */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/70">
                <div className="space-y-1">
                    <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-[#0B0F19] text-primary flex items-center justify-center shadow-md shadow-black/20 border border-slate-800">
                            <Building2 className="w-5 h-5" />
                        </div>
                        <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                            Portefeuille Clients
                        </h1>
                    </div>
                    <p className="text-xs text-slate-500 pl-1">
                        Gérez vos comptes clients, l'onboarding et la synchronisation Leexi.
                    </p>
                </div>

                <div className="flex items-center gap-2.5 flex-wrap">
                    <button
                        onClick={() => refetchClients()}
                        disabled={isFetching}
                        title="Actualiser"
                        className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:text-primary hover:border-blue-300 transition-all shadow-2xs disabled:opacity-50"
                    >
                        <RefreshCw className={cn("w-4 h-4", isFetching && "animate-spin text-primary")} />
                    </button>

                    <Link
                        href="/manager/playbook/import"
                        className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:border-primary hover:shadow-xs transition-all shadow-2xs"
                    >
                        <FileText className="w-3.5 h-3.5 text-slate-500" />
                        <span>Importer playbook</span>
                    </Link>

                    <button
                        onClick={() => setShowOnboardingModal(true)}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-primary to-[#156cd4] hover:from-[#1e7fd8] hover:to-[#0f5ab5] shadow-md shadow-blue-500/20 active:scale-[0.98] transition-all"
                    >
                        <Plus className="w-4 h-4" />
                        <span>Nouveau client</span>
                    </button>
                </div>
            </div>

            {/* ── 4 Executive KPI Cards ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                {/* 1. Total Clients — Midnight Sapphire Card */}
                <div className="p-5 rounded-3xl bg-gradient-to-br from-[#0A1224] via-[#0B152A] to-[#050B16] border border-blue-900/70 text-white shadow-xl shadow-black/20 flex flex-col justify-between relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/15 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none" />
                    <div className="flex items-center justify-between z-10">
                        <div className="w-11 h-11 rounded-2xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-primary">
                            <Building2 className="w-5 h-5" />
                        </div>
                        <span className="px-2.5 py-0.5 rounded-full bg-blue-500/15 border border-blue-400/30 text-blue-300 text-[10px] font-bold">
                            Portefeuille
                        </span>
                    </div>
                    <div className="my-4 z-10">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Comptes Clients</p>
                        <div className="flex items-baseline gap-2 mt-1">
                            <p className="text-3xl sm:text-4xl font-black text-white tracking-tight tabular-nums">
                                {totalClients}
                            </p>
                            <span className="text-xs text-slate-400 font-medium">enregistrés</span>
                        </div>
                    </div>
                    <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-white/10 z-10">
                        <span>Comptes opérationnels</span>
                        <span className="text-blue-300 font-bold">{totalClients} actifs</span>
                    </div>
                </div>

                {/* 2. Missions Actives — Obsidian Gold Card */}
                <div className="p-5 rounded-3xl bg-gradient-to-br from-[#0B0F19] via-[#0D121F] to-[#04060A] border border-slate-800 text-white shadow-xl shadow-black/20 flex flex-col justify-between relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none" />
                    <div className="flex items-center justify-between z-10">
                        <div className="w-11 h-11 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                            <Target className="w-5 h-5" />
                        </div>
                        <span className="px-2.5 py-0.5 rounded-full bg-amber-400/10 border border-amber-400/20 text-amber-300 text-[10px] font-bold">
                            Opérations
                        </span>
                    </div>
                    <div className="my-4 z-10">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Clients en Mission</p>
                        <div className="flex items-baseline gap-2 mt-1">
                            <p className="text-3xl sm:text-4xl font-black text-white tracking-tight tabular-nums">
                                {activeMissionClients}
                            </p>
                            <span className="text-xs text-slate-400 font-medium">/ {totalClients}</span>
                        </div>
                    </div>
                    <div className="space-y-1.5 z-10 pt-2 border-t border-white/10">
                        <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-amber-400 to-orange-400 rounded-full"
                                style={{ width: totalClients ? `${Math.round((activeMissionClients / totalClients) * 100)}%` : "0%" }}
                            />
                        </div>
                        <div className="flex justify-between items-center text-[11px] text-slate-400">
                            <span>Taux d'activité</span>
                            <span className="text-amber-300 font-bold">{totalClients ? Math.round((activeMissionClients / totalClients) * 100) : 0}%</span>
                        </div>
                    </div>
                </div>

                {/* 3. Portail Client — Mint Emerald Theme */}
                <div className="p-5 rounded-3xl bg-gradient-to-br from-white via-emerald-50/40 to-emerald-100/30 border border-emerald-200/80 shadow-sm hover:shadow-md transition-all flex flex-col justify-between relative overflow-hidden">
                    <div className="flex items-center justify-between z-10">
                        <div className="w-11 h-11 rounded-2xl bg-emerald-100/80 border border-emerald-200 flex items-center justify-center text-emerald-600 shadow-2xs">
                            <Users className="w-5 h-5" />
                        </div>
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-100/80 border border-emerald-200 text-emerald-800 text-[10px] font-bold">
                            Accès Portail
                        </span>
                    </div>
                    <div className="my-4 z-10">
                        <p className="text-xs font-bold text-emerald-900/60 uppercase tracking-wider">Adoption Portail</p>
                        <div className="flex items-baseline gap-2 mt-1">
                            <p className="text-3xl sm:text-4xl font-black text-emerald-950 tracking-tight tabular-nums">
                                {portalAdoptionRate}%
                            </p>
                            <span className="text-xs text-emerald-700/70 font-medium">({clientsWithPortal} clients)</span>
                        </div>
                    </div>
                    <div className="flex items-center justify-between text-xs text-emerald-800 pt-2 border-t border-emerald-200/60 z-10">
                        <span>Interlocuteurs actifs</span>
                        <span className="font-bold">{totalUsers} utilisateurs</span>
                    </div>
                </div>

                {/* 4. Leexi Intelligence — Soft Violet Sapphire Theme */}
                <div
                    onClick={() => setShowLeexiSection((s) => !s)}
                    className="p-5 rounded-3xl bg-gradient-to-br from-white via-violet-50/40 to-purple-100/30 border border-violet-200/80 shadow-sm hover:border-violet-300 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between relative overflow-hidden"
                >
                    <div className="flex items-center justify-between z-10">
                        <div className="w-11 h-11 rounded-2xl bg-violet-100/80 border border-violet-200 flex items-center justify-center text-violet-600 shadow-2xs">
                            <Mic className="w-5 h-5" />
                        </div>
                        <span className="px-2.5 py-0.5 rounded-full bg-violet-100/80 border border-violet-200 text-violet-800 text-[10px] font-bold flex items-center gap-1">
                            <Sparkles className="w-3 h-3 text-violet-500" /> Leexi AI
                        </span>
                    </div>
                    <div className="my-4 z-10">
                        <p className="text-xs font-bold text-violet-900/60 uppercase tracking-wider">Récaps d'Appels</p>
                        <div className="flex items-baseline gap-2 mt-1">
                            <p className="text-3xl sm:text-4xl font-black text-violet-950 tracking-tight tabular-nums">
                                {leexiData?.totalRecaps ?? 0}
                            </p>
                            <span className="text-xs text-violet-700/70 font-medium">appels traités</span>
                        </div>
                    </div>
                    <div className="flex items-center justify-between text-xs text-violet-800 pt-2 border-t border-violet-200/60 z-10">
                        <span>{showLeexiSection ? "Masquer les récaps" : "Voir les récapitulatifs"}</span>
                        <ChevronDown className={cn("w-4 h-4 text-violet-600 transition-transform", showLeexiSection && "rotate-180")} />
                    </div>
                </div>
            </div>

            {/* ── Collapsible Leexi Intelligence Banner ── */}
            {showLeexiSection && leexiData && (
                <div className="bg-white rounded-3xl border border-violet-200/80 p-6 shadow-sm space-y-4 animate-in fade-in duration-300">
                    <div className="flex items-center justify-between pb-3 border-b border-violet-100">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-violet-100 flex items-center justify-center text-violet-600">
                                <Mic className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-slate-900">Intelligence des Appels Commerciaux Leexi</h3>
                                <p className="text-xs text-slate-500">
                                    {leexiData.totalMatched} associé{leexiData.totalMatched > 1 ? "s" : ""} aux clients · {leexiData.unmatched.length} non associé{leexiData.unmatched.length > 1 ? "s" : ""}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={() => refetchLeexi()}
                            disabled={isLoadingLeexi}
                            className="text-xs font-semibold text-violet-600 hover:text-violet-700 flex items-center gap-1.5"
                        >
                            <RefreshCw className={cn("w-3.5 h-3.5", isLoadingLeexi && "animate-spin")} />
                            Synchroniser
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-72 overflow-y-auto pr-1">
                        {leexiData.matched.map((group) =>
                            group.recaps.map((recap) => (
                                <div
                                    key={recap.id}
                                    className="p-3.5 rounded-2xl bg-violet-50/40 border border-violet-100 hover:border-violet-300 transition-all cursor-pointer"
                                    onClick={() => setExpandedRecapId(expandedRecapId === recap.id ? null : recap.id)}
                                >
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="text-xs font-bold text-slate-900 truncate">{recap.title}</span>
                                        <Badge variant="outline" className="text-[10px] bg-white border-violet-200 text-violet-700 shrink-0">
                                            {group.clientName}
                                        </Badge>
                                    </div>
                                    <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">{recap.recapText}</p>
                                    {expandedRecapId === recap.id && (
                                        <div className="mt-2 pt-2 border-t border-violet-100 text-xs text-slate-700 whitespace-pre-line leading-relaxed">
                                            {recap.recapText}
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                        {leexiData.unmatched.map((recap) => (
                            <div
                                key={recap.id}
                                className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 hover:border-slate-300 transition-all"
                            >
                                <div className="flex items-center justify-between gap-2">
                                    <span className="text-xs font-bold text-slate-800 truncate">{recap.title}</span>
                                    <button
                                        onClick={() => handleCreateFromRecap(recap.recapText)}
                                        className="text-[10px] font-bold px-2 py-0.5 bg-indigo-50 text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors"
                                    >
                                        + Créer client
                                    </button>
                                </div>
                                <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">{recap.recapText}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ── Unified Filter & Search Bar ── */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-3 shadow-2xs flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3 flex-1 min-w-[260px]">
                    <div className="relative flex-1">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Rechercher par nom, secteur, email..."
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

                    {/* Status filter tabs */}
                    <div className="hidden md:flex items-center bg-slate-100 p-1 rounded-xl">
                        {[
                            { value: "all", label: "Tous" },
                            { value: "active_mission", label: "Missions actives" },
                            { value: "onboarding", label: "Onboarding" },
                            { value: "no_mission", label: "Sans mission" },
                        ].map((tab) => (
                            <button
                                key={tab.value}
                                onClick={() => setStatusFilter(tab.value as typeof statusFilter)}
                                className={cn(
                                    "px-3 py-1 text-xs font-semibold rounded-lg transition-all",
                                    statusFilter === tab.value
                                        ? "bg-[#0B0F19] text-white shadow-2xs"
                                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
                                )}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {/* Industry filter */}
                    {industries.length > 0 && (
                        <select
                            value={industryFilter}
                            onChange={(e) => setIndustryFilter(e.target.value)}
                            className="h-10 px-3 text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20"
                        >
                            <option value="all">Tous les secteurs</option>
                            {industries.map((ind) => (
                                <option key={ind} value={ind}>{ind}</option>
                            ))}
                        </select>
                    )}

                    {/* Sort selector */}
                    <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                        className="h-10 px-3 text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20"
                    >
                        <option value="recent">Plus récents</option>
                        <option value="name">Nom (A-Z)</option>
                        <option value="missions">Missions actives</option>
                    </select>
                </div>
            </div>

            {/* ── Client Cards Grid ── */}
            {isLoading && clients.length === 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="h-64 bg-slate-200/60 rounded-3xl animate-pulse" />
                    ))}
                </div>
            ) : filteredClients.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-3xl border border-slate-200 shadow-sm">
                    <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4 border border-slate-200">
                        <Building2 className="w-8 h-8 text-slate-400" />
                    </div>
                    <h3 className="text-base font-bold text-slate-900 mb-1">
                        {searchQuery ? "Aucun client ne correspond à votre recherche" : "Aucun client enregistré"}
                    </h3>
                    <p className="text-xs text-slate-500 mb-6 max-w-sm mx-auto">
                        {searchQuery
                            ? "Essayez d'ajuster vos critères ou effacez la recherche."
                            : "Créez votre premier compte client pour lancer des missions de prospection."}
                    </p>
                    {!searchQuery && (
                        <button
                            onClick={() => setShowOnboardingModal(true)}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-primary hover:bg-primary-hover transition-colors"
                        >
                            <Plus className="w-4 h-4" />
                            Créer un compte client
                        </button>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {filteredClients.map((client) => {
                        const recapCount = getClientRecapCount(client.id);
                        const hasPortal = (client._count?.users || 0) > 0;
                        const activeMissions = client.missions?.filter((m) => m.isActive && m.status === "ACTIVE") || [];

                        return (
                            <div
                                key={client.id}
                                onClick={() => handleClientClick(client)}
                                className="group relative p-6 rounded-3xl bg-white border border-slate-200/80 hover:border-blue-300 hover:shadow-xl hover:shadow-blue-500/5 transition-all duration-300 cursor-pointer flex flex-col justify-between overflow-hidden"
                            >
                                {/* Top Bar */}
                                <div>
                                    <div className="flex items-start justify-between gap-3 mb-4">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 text-white flex items-center justify-center font-black text-lg shadow-md shadow-black/10 group-hover:scale-105 transition-transform flex-shrink-0">
                                                {client.name.slice(0, 2).toUpperCase()}
                                            </div>
                                            <div className="min-w-0">
                                                <h3 className="text-base font-bold text-slate-900 group-hover:text-primary transition-colors truncate">
                                                    {client.name}
                                                </h3>
                                                <p className="text-xs text-slate-400 truncate mt-0.5">
                                                    {client.industry || "Secteur non spécifié"}
                                                </p>
                                            </div>
                                        </div>

                                        {hasPortal ? (
                                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-bold uppercase tracking-wider shrink-0">
                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                                Portail
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 text-[10px] font-semibold tracking-wide shrink-0">
                                                Sans accès
                                            </span>
                                        )}
                                    </div>

                                    {/* 2-Metric Strip */}
                                    <div className="grid grid-cols-2 gap-2 p-3 rounded-2xl bg-slate-50/80 border border-slate-100 mb-4">
                                        <div className="text-left">
                                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Missions</p>
                                            <p className="text-lg font-black text-slate-900 tabular-nums">
                                                {client._count?.missions || 0}{" "}
                                                <span className="text-[11px] font-semibold text-emerald-600">
                                                    ({activeMissions.length} active{activeMissions.length > 1 ? "s" : ""})
                                                </span>
                                            </p>
                                        </div>
                                        <div className="text-left border-l border-slate-200 pl-3">
                                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Contacts</p>
                                            <p className="text-lg font-black text-slate-900 tabular-nums">
                                                {client._count?.users || 0}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Onboarding Readiness or Leexi Badge */}
                                    <div className="space-y-2 mb-4">
                                        {client.readiness && (
                                            <div className="p-2.5 rounded-xl bg-slate-50/60 border border-slate-100">
                                                <OnboardingReadinessGauge readiness={client.readiness} size="sm" showLabels />
                                            </div>
                                        )}

                                        {recapCount > 0 && (
                                            <div className="flex items-center justify-between p-2 rounded-xl bg-violet-50/50 border border-violet-100 text-xs text-violet-800">
                                                <span className="flex items-center gap-1.5 font-semibold">
                                                    <Mic className="w-3.5 h-3.5 text-violet-600" /> {recapCount} récap{recapCount > 1 ? "s" : ""} Leexi
                                                </span>
                                                <span className="text-[10px] font-bold text-violet-600 underline">Explorer</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Footer Bar */}
                                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                                    <span className="flex items-center gap-1.5">
                                        <Clock className="w-3.5 h-3.5" /> Créé le {new Date(client.createdAt).toLocaleDateString("fr-FR")}
                                    </span>
                                    <span className="text-primary font-bold flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                                        Gérer <ArrowRight className="w-3.5 h-3.5" />
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Modals & Drawers */}
            <ClientOnboardingModal
                isOpen={showOnboardingModal}
                onClose={() => {
                    setShowOnboardingModal(false);
                    setInitialRecapText(undefined);
                }}
                onSuccess={handleOnboardingSuccess}
                initialRecapText={initialRecapText}
            />

            <ClientDrawer
                isOpen={showDrawer}
                onClose={() => setShowDrawer(false)}
                client={selectedClient}
                onUpdate={handleClientUpdate}
                onDelete={() => {
                    setSelectedClient(null);
                    setShowDrawer(false);
                    queryClient.invalidateQueries({ queryKey: CLIENTS_QUERY_KEY });
                    queryClient.invalidateQueries({ queryKey: LEEXI_RECAPS_QUERY_KEY });
                }}
            />
        </div>
    );
}
