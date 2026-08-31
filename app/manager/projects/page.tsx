"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
    Plus, FolderKanban, LayoutGrid, LayoutList, Search,
    MoreHorizontal, Copy, Archive, Trash2,
    CheckCircle2, Clock, AlertTriangle, Loader2,
    X, TrendingUp, ArrowUpRight, Briefcase, ListTodo,
    Zap, RefreshCw,
} from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Modal, ModalFooter, ConfirmModal, useToast, DropdownMenu } from "@/components/ui";
import { AiOrganizationProposal, type OrganizationProposal } from "@/components/tasks/AiOrganizationProposal";

// ============================================
// TYPES
// ============================================

interface Project {
    id: string;
    name: string;
    description: string | null;
    status: "ACTIVE" | "COMPLETED" | "ARCHIVED";
    color: string | null;
    icon: string | null;
    isGroup: boolean;
    parentProjectId: string | null;
    startDate: string | null;
    endDate: string | null;
    owner: { id: string; name: string; email: string };
    client: { id: string; name: string } | null;
    members: { user: { id: string; name: string; email: string }; role: string }[];
    _count: { tasks: number; childProjects: number };
    taskStats: {
        TODO: number;
        IN_PROGRESS: number;
        IN_REVIEW: number;
        DONE: number;
        total: number;
        overdue: number;
        completionPercent: number;
    };
    createdAt: string;
    updatedAt: string;
}

interface TeamMemberOption {
    id: string;
    name: string;
    role: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; dot: string }> = {
    ACTIVE: { label: "Actif", color: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200", dot: "bg-emerald-500" },
    COMPLETED: { label: "Terminé", color: "text-blue-700", bg: "bg-blue-50", border: "border-blue-200", dot: "bg-blue-500" },
    ARCHIVED: { label: "Archivé", color: "text-slate-500", bg: "bg-slate-50", border: "border-slate-200", dot: "bg-slate-400" },
};

const PRESET_COLORS = [
    "#0c3b38", "#25745f", "#ff9e1b", "#e07c00", "#b9433e",
    "#ef4444", "#f97316", "#eab308", "#22c55e", "#14b8a6",
    "#06b6d4", "#3b82f6", "#0ea5e9", "#5c6e69",
];

// ============================================
// PAGE
// ============================================

export default function ManagerProjectsPage() {
    const searchParams = useSearchParams();
    const { success, error: showError } = useToast();
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [view, setView] = useState<"grid" | "list">("grid");
    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("");
    const [clientFilter, setClientFilter] = useState("");
    const [showCreate, setShowCreate] = useState(false);
    const [clients, setClients] = useState<{ id: string; name: string }[]>([]);
    const [users, setUsers] = useState<TeamMemberOption[]>([]);
    const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const hasLoaded = useRef(false);
    const requestController = useRef<AbortController | null>(null);

    const [createForm, setCreateForm] = useState({
        name: "",
        description: "",
        clientId: "",
        color: "#0c3b38",
        startDate: "",
        endDate: "",
        memberIds: [] as string[],
        isGroup: false,
        parentProjectId: "",
    });
    const [creating, setCreating] = useState(false);
    const [organizationProposal, setOrganizationProposal] = useState<OrganizationProposal | null>(null);

    useEffect(() => {
        const parentProjectId = searchParams.get("parentProjectId");
        if (parentProjectId) {
            setCreateForm((current) => ({ ...current, parentProjectId, isGroup: false }));
            setShowCreate(true);
        }
    }, [searchParams]);

    useEffect(() => {
        const timeout = window.setTimeout(() => setDebouncedSearch(search.trim()), 250);
        return () => window.clearTimeout(timeout);
    }, [search]);

    const fetchProjects = useCallback(async () => {
        requestController.current?.abort();
        const controller = new AbortController();
        requestController.current = controller;

        if (hasLoaded.current) setRefreshing(true);
        else setLoading(true);
        setLoadError(null);
        try {
            const params = new URLSearchParams();
            params.set("limit", "200");
            if (debouncedSearch) params.set("search", debouncedSearch);
            if (statusFilter) params.set("status", statusFilter);
            if (clientFilter) params.set("clientId", clientFilter);

            const res = await fetch(`/api/projects?${params}`, { signal: controller.signal });
            const json = await res.json();
            if (!res.ok || !json.success) {
                throw new Error(json.error || "Impossible de charger les projets.");
            }
            setProjects(Array.isArray(json.data) ? json.data : []);
            hasLoaded.current = true;
        } catch (e) {
            if ((e as Error).name !== "AbortError") {
                setLoadError(e instanceof Error ? e.message : "Une erreur est survenue.");
            }
        } finally {
            if (!controller.signal.aborted) {
                setLoading(false);
                setRefreshing(false);
            }
        }
    }, [debouncedSearch, statusFilter, clientFilter]);

    useEffect(() => {
        void fetchProjects();
        return () => requestController.current?.abort();
    }, [fetchProjects]);

    useEffect(() => {
        Promise.all([
            fetch("/api/clients").then((r) => r.json()),
            fetch("/api/users?role=MANAGER,SDR,DEVELOPER,BUSINESS_DEVELOPER&limit=200").then((r) => r.json()),
        ]).then(([cj, uj]) => {
            if (cj.success) setClients(cj.data || []);
            if (uj.success) {
                const userData = (uj.data?.users || uj.data || []) as TeamMemberOption[];
                setUsers(userData.map(({ id, name, role }) => ({ id, name, role })));
            }
        }).catch(console.error);
    }, []);

    const handleCreate = async (proposal?: OrganizationProposal) => {
        if (!createForm.name.trim()) return;
        setCreating(true);
        try {
            const hasImportedStructure = (proposal?.children?.length ?? 0) > 0;
            const rootIsGroup = createForm.isGroup || hasImportedStructure;
            const res = await fetch("/api/projects", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: proposal?.item?.title || createForm.name.trim(),
                    // An AI import stores only Mistral's concise summary, never the pasted source list.
                    description: proposal ? (proposal.summary || proposal.item?.description || null) : createForm.description.trim() || null,
                    clientId: createForm.clientId || null,
                    color: createForm.color,
                    startDate: createForm.startDate || null,
                    endDate: createForm.endDate || null,
                    members: createForm.memberIds.map((id) => ({ userId: id })),
                    isGroup: rootIsGroup,
                    parentProjectId: createForm.parentProjectId || null,
                }),
            });
            const json = await res.json();
            if (res.ok && json.success) {
                const createNode = async (node: NonNullable<OrganizationProposal["children"]>[number], parentProjectId: string) => {
                    const nodeIsGroup = (node.children?.length ?? 0) > 0;
                    const nodeResponse = await fetch("/api/projects", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ name: node.title, description: node.description || null, color: createForm.color, clientId: createForm.clientId || null, members: createForm.memberIds.map((id) => ({ userId: id })), parentProjectId, isGroup: nodeIsGroup }),
                    });
                    const nodeJson = await nodeResponse.json();
                    if (!nodeResponse.ok || !nodeJson.success) throw new Error(nodeJson.error || `Impossible de créer ${node.title}`);

                    for (const child of node.children || []) await createNode(child, nodeJson.data.id);
                    if (!nodeIsGroup) {
                        for (const task of node.tasks || []) {
                            const taskResponse = await fetch("/api/tasks", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ projectId: nodeJson.data.id, title: task.title, description: task.description || null, priority: task.priority || "MEDIUM", estimatedHours: task.estimatedHours?.toString() || null }),
                            });
                            const taskJson = await taskResponse.json();
                            if (!taskResponse.ok || !taskJson.success) throw new Error(taskJson.error || `Impossible de créer la tâche ${task.title}`);
                        }
                    }
                };
                for (const child of proposal?.children || []) {
                    await createNode(child, json.data.id);
                }
                success("Projet créé", createForm.name);
                setShowCreate(false);
                setOrganizationProposal(null);
                setCreateForm({ name: "", description: "", clientId: "", color: "#0c3b38", startDate: "", endDate: "", memberIds: [], isGroup: false, parentProjectId: "" });
                fetchProjects();
            } else {
                showError("Erreur", json.error || "Impossible de créer le projet");
            }
        } catch {
            showError("Erreur", "Impossible de créer le projet");
        } finally {
            setCreating(false);
        }
    };

    const requestOrganization = async () => {
        if (!createForm.name.trim()) return;
        setCreating(true);
        try {
            const res = await fetch("/api/ai/mistral/organize-work", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ kind: "PROJECT", title: createForm.name, description: createForm.description, existingItems: projects.map((project) => project.name) }),
            });
            const json = await res.json();
            if (!res.ok || !json.success) throw new Error(json.error || "Organisation indisponible");
            setOrganizationProposal(json.data);
        } catch (error) {
            showError("Organisation IA indisponible", error instanceof Error ? error.message : "Réessayez dans un instant.");
        } finally { setCreating(false); }
    };

    const applyProposalToForm = () => {
        const item = organizationProposal?.item;
        if (!item) return;
        setCreateForm((current) => ({ ...current, name: item.title || current.name, description: item.description || current.description }));
    };

    const handleDuplicate = async (projectId: string) => {
        try {
            const res = await fetch(`/api/projects/${projectId}/duplicate`, { method: "POST" });
            const json = await res.json();
            if (!res.ok || !json.success) throw new Error(json.error);
            success("Projet dupliqué", "");
            void fetchProjects();
        } catch { showError("Erreur", "Impossible de dupliquer"); }
    };

    const handleArchive = async (projectId: string) => {
        try {
            const res = await fetch(`/api/projects/${projectId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: "ARCHIVED" }),
            });
            const json = await res.json();
            if (!res.ok || !json.success) throw new Error(json.error);
            success("Projet archivé", "");
            void fetchProjects();
        } catch { showError("Erreur", "Impossible d'archiver"); }
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        setIsDeleting(true);
        try {
            const res = await fetch(`/api/projects/${deleteTarget}`, { method: "DELETE" });
            const json = await res.json();
            if (!res.ok || !json.success) throw new Error(json.error);
            success("Projet supprimé", "");
            setDeleteTarget(null);
            void fetchProjects();
        } catch { showError("Erreur", "Impossible de supprimer"); }
        finally { setIsDeleting(false); }
    };

    // Stats
    const totalActive = projects.filter((p) => p.status === "ACTIVE").length;
    const totalTasks = projects.reduce((acc, p) => acc + (p.taskStats?.total || 0), 0);
    const totalDone = projects.reduce((acc, p) => acc + (p.taskStats?.DONE || 0), 0);
    const totalOverdue = projects.reduce((acc, p) => acc + (p.taskStats?.overdue || 0), 0);
    const avgCompletion = projects.length
        ? Math.round(projects.reduce((acc, p) => acc + (p.taskStats?.completionPercent || 0), 0) / projects.length)
        : 0;

    return (
        <div className="elan-page">
            {/* Header */}
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                    <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#748396]">Portefeuille</p>
                    <h1 className="text-[26px] font-bold tracking-[-0.035em] text-[#0F1D2E]">Projets équipe</h1>
                    <p className="mt-1 text-[12px] text-[#65778A]">
                        {projects.length} projet{projects.length !== 1 ? "s" : ""} visible{projects.length !== 1 ? "s" : ""}, {totalTasks} tâches au total
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => void fetchProjects()}
                        disabled={refreshing}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[#DDE4EA] bg-white text-[#526476] hover:border-[#BAC7D2] hover:text-[#0B5A51] disabled:opacity-50"
                        title="Actualiser"
                    >
                        {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                    </button>
                    <button
                        onClick={() => setShowCreate(true)}
                        className="flex h-10 items-center justify-center gap-2 rounded-lg border border-[#063E39] bg-[#084C45] px-4 text-[12px] font-bold text-white shadow-[0_5px_14px_rgba(8,76,69,0.18)] transition-colors hover:bg-[#063E39]"
                    >
                        <Plus className="w-4 h-4" />
                        Nouveau projet
                    </button>
                </div>
            </div>

            {/* KPI Strip */}
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
                <KpiCard icon={Zap} label="Actifs" value={totalActive} iconColor="text-emerald-600" iconBg="bg-emerald-50" />
                <KpiCard icon={ListTodo} label="Tâches" value={totalTasks} iconColor="text-blue-600" iconBg="bg-blue-50" />
                <KpiCard icon={CheckCircle2} label="Terminées" value={totalDone} iconColor="text-emerald-600" iconBg="bg-emerald-50" />
                <KpiCard icon={TrendingUp} label="Progression" value={`${avgCompletion}%`} iconColor="text-[#0B5A51]" iconBg="bg-[#EAF5F2]" />
                <KpiCard icon={AlertTriangle} label="En retard" value={totalOverdue} iconColor={totalOverdue > 0 ? "text-red-600" : "text-slate-400"} iconBg={totalOverdue > 0 ? "bg-red-50" : "bg-slate-50"} accent={totalOverdue > 0} />
            </div>

            {/* Controls */}
            <div className="flex items-center gap-3 mb-6 flex-wrap">
                <div className="relative flex-1 min-w-[240px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Rechercher un projet..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full rounded-[10px] border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm transition-colors focus:border-[#E07C00] focus:outline-none focus:ring-2 focus:ring-[#FF9E1B]/20"
                    />
                </div>

                {/* Status filter chips */}
                <div className="flex items-center gap-1.5">
                    {[
                        { value: "", label: "Tous" },
                        { value: "ACTIVE", label: "Actifs" },
                        { value: "COMPLETED", label: "Terminés" },
                        { value: "ARCHIVED", label: "Archivés" },
                    ].map(f => (
                        <button
                            key={f.value}
                            onClick={() => setStatusFilter(f.value)}
                            className={cn(
                                "px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all",
                                statusFilter === f.value
                                    ? "bg-[#EEF3F1] text-[#1F4D47] border-[#AFC5BF] shadow-sm"
                                    : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
                            )}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>

                {/* Client filter */}
                {clients.length > 0 && (
                    <select
                        value={clientFilter}
                        onChange={(e) => setClientFilter(e.target.value)}
                        className="min-w-[150px] appearance-none rounded-[10px] border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF9E1B]/20"
                    >
                        <option value="">Tous les clients</option>
                        {clients.map((c) => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>
                )}

                {/* View toggle */}
                <div className="flex bg-slate-100 border border-slate-200 rounded-xl p-0.5 ml-auto">
                    <button
                        onClick={() => setView("grid")}
                        className={cn("p-2 rounded-lg transition-all", view === "grid" ? "bg-white shadow-sm text-[#1F4D47]" : "text-slate-400 hover:text-slate-600")}
                    >
                        <LayoutGrid className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => setView("list")}
                        className={cn("p-2 rounded-lg transition-all", view === "list" ? "bg-white shadow-sm text-[#1F4D47]" : "text-slate-400 hover:text-slate-600")}
                    >
                        <LayoutList className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Content */}
            {loading ? (
                <ProjectsSkeleton />
            ) : loadError ? (
                <div className="flex min-h-[320px] flex-col items-center justify-center rounded-xl border border-red-200 bg-red-50/40 px-6 text-center">
                    <AlertTriangle className="mb-3 h-7 w-7 text-red-500" />
                    <h2 className="text-sm font-bold text-slate-800">Impossible de charger les projets</h2>
                    <p className="mt-1 max-w-md text-xs text-slate-500">{loadError}</p>
                    <button type="button" onClick={() => void fetchProjects()} className="mt-4 h-9 rounded-lg border border-red-200 bg-white px-4 text-[11px] font-bold text-red-600 hover:bg-red-50">
                        Réessayer
                    </button>
                </div>
            ) : projects.length === 0 ? (
                <div className="flex flex-col items-center py-32">
                    <div className="w-20 h-20 rounded-3xl bg-slate-100 flex items-center justify-center mb-6">
                        <FolderKanban className="w-10 h-10 text-slate-300" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">Aucun projet</h3>
                    <p className="text-sm text-slate-500 mb-6 max-w-sm text-center">
                        Les projets sont créés automatiquement lorsque vous extrayez des tâches depuis une session client, ou vous pouvez en créer un manuellement.
                    </p>
                    <button
                        onClick={() => setShowCreate(true)}
                        className="flex items-center gap-2 rounded-[10px] border border-[#143C37] bg-[#1F4D47] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#143C37]"
                    >
                        <Plus className="w-4 h-4" />
                        Créer un projet
                    </button>
                </div>
            ) : view === "grid" ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {projects.map((p) => (
                        <ProjectCard
                            key={p.id}
                            project={p}
                            onDuplicate={() => handleDuplicate(p.id)}
                            onArchive={() => handleArchive(p.id)}
                            onDelete={() => setDeleteTarget(p.id)}
                        />
                    ))}
                </div>
            ) : (
                <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                    <div className="grid grid-cols-[1fr,100px,120px,100px,60px] gap-4 px-5 py-3 border-b border-slate-100 bg-slate-50/60 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        <span>Projet</span>
                        <span>Statut</span>
                        <span>Progression</span>
                        <span>Équipe</span>
                        <span />
                    </div>
                    {projects.map((p) => (
                        <ProjectRow
                            key={p.id}
                            project={p}
                            onDuplicate={() => handleDuplicate(p.id)}
                            onArchive={() => handleArchive(p.id)}
                            onDelete={() => setDeleteTarget(p.id)}
                        />
                    ))}
                </div>
            )}

            {/* Create Modal */}
            <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Nouveau projet" description="Créez un projet pour organiser les tâches de votre équipe." size="lg">
                <div className="space-y-5">
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">Nom du projet *</label>
                        <input
                            type="text"
                            value={createForm.name}
                            onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                            className="w-full rounded-lg border border-[#DDE4EA] px-3.5 py-2.5 text-sm outline-none transition-all focus:border-[#2A7B70] focus:ring-2 focus:ring-[#2A7B70]/15"
                            placeholder="Ex: Onboarding UpikaJob, Sprint Q1..."
                            autoFocus
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">Description</label>
                        <textarea
                            value={createForm.description}
                            onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                            rows={3}
                            className="w-full resize-none rounded-lg border border-[#DDE4EA] px-3.5 py-2.5 text-sm outline-none transition-all focus:border-[#2A7B70] focus:ring-2 focus:ring-[#2A7B70]/15"
                            placeholder="Décrivez l'objectif du projet..."
                        />
                    </div>
                    <button type="button" onClick={requestOrganization} disabled={!createForm.name.trim() || creating} className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#0B5A51] hover:text-[#063E39] disabled:opacity-50">
                        <Zap className="h-4 w-4" /> Organiser avec Mistral
                    </button>
                    {organizationProposal && <AiOrganizationProposal
                        proposal={organizationProposal}
                        childLabel="Sous-projets proposés"
                        onAccept={() => { applyProposalToForm(); handleCreate(organizationProposal); }}
                        onEdit={() => { applyProposalToForm(); setOrganizationProposal(null); }}
                        onReject={() => setOrganizationProposal(null)}
                        accepting={creating}
                    />}
                    <label className="flex items-start gap-3 rounded-xl border border-[#C9DED8] bg-[#F5FAF8] p-3.5 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={createForm.isGroup}
                            onChange={(e) => setCreateForm({ ...createForm, isGroup: e.target.checked, parentProjectId: "" })}
                            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#0B5A51]"
                        />
                        <span>
                            <span className="block text-sm font-semibold text-[#173A35]">Projet principal / portefeuille</span>
                            <span className="mt-0.5 block text-xs text-slate-500">Ex. « Sous-traitance ». Il contiendra des sous-projets et n&apos;a pas de tâches directement.</span>
                        </span>
                    </label>
                    {!createForm.isGroup && (
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Projet principal</label>
                            <select
                                value={createForm.parentProjectId}
                                onChange={(e) => setCreateForm({ ...createForm, parentProjectId: e.target.value })}
                                className="w-full rounded-lg border border-[#DDE4EA] bg-white px-3.5 py-2.5 text-sm outline-none transition-all focus:border-[#2A7B70] focus:ring-2 focus:ring-[#2A7B70]/15"
                            >
                                <option value="">Aucun — projet indépendant</option>
                                {projects.filter((project) => project.isGroup).map((project) => (
                                    <option key={project.id} value={project.id}>{project.name}</option>
                                ))}
                            </select>
                            <p className="mt-1.5 text-xs text-slate-500">Pour un client, sélectionnez « Sous-traitance » puis nommez le sous-projet avec le nom du client.</p>
                        </div>
                    )}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Client</label>
                            <select
                                value={createForm.clientId}
                                onChange={(e) => setCreateForm({ ...createForm, clientId: e.target.value })}
                                className="w-full rounded-lg border border-[#DDE4EA] bg-white px-3.5 py-2.5 text-sm outline-none transition-all focus:border-[#2A7B70] focus:ring-2 focus:ring-[#2A7B70]/15"
                            >
                                <option value="">Aucun client</option>
                                {clients.map((c) => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Couleur</label>
                            <div className="flex items-center gap-1.5 flex-wrap">
                                {PRESET_COLORS.map(c => (
                                    <button
                                        key={c}
                                        onClick={() => setCreateForm({ ...createForm, color: c })}
                                        className={cn(
                                            "w-7 h-7 rounded-lg transition-all",
                                            createForm.color === c ? "scale-110 ring-2 ring-[#0B5A51] ring-offset-2" : "hover:scale-110"
                                        )}
                                        style={{ backgroundColor: c }}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">Membres de l&apos;équipe</label>
                        <select
                            value=""
                            onChange={(e) => {
                                const id = e.target.value;
                                if (id && !createForm.memberIds.includes(id)) {
                                    setCreateForm({ ...createForm, memberIds: [...createForm.memberIds, id] });
                                }
                                e.target.value = "";
                            }}
                            className="w-full rounded-lg border border-[#DDE4EA] bg-white px-3.5 py-2.5 text-sm outline-none transition-all focus:border-[#2A7B70] focus:ring-2 focus:ring-[#2A7B70]/15"
                        >
                            <option value="">Ajouter un membre...</option>
                            {users.filter((u) => !createForm.memberIds.includes(u.id)).map((u) => (
                                <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                            ))}
                        </select>
                        {createForm.memberIds.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-2.5">
                                {createForm.memberIds.map((id) => {
                                    const u = users.find((x) => x.id === id);
                                    return (
                                        <span key={id} className="inline-flex items-center gap-1.5 rounded-lg border border-[#C9DED8] bg-[#EAF5F2] px-2.5 py-1 text-xs font-medium text-[#0B5A51]">
                                            {u?.name ?? id}
                                            <button type="button" onClick={() => setCreateForm({ ...createForm, memberIds: createForm.memberIds.filter((x) => x !== id) })} className="rounded-full p-0.5 transition-colors hover:bg-[#CFE5DF]">
                                                <X className="w-3 h-3" />
                                            </button>
                                        </span>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Date début</label>
                            <input type="date" value={createForm.startDate} onChange={(e) => setCreateForm({ ...createForm, startDate: e.target.value })} className="w-full rounded-lg border border-[#DDE4EA] px-3.5 py-2.5 text-sm outline-none transition-all focus:border-[#2A7B70] focus:ring-2 focus:ring-[#2A7B70]/15" />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Date fin</label>
                            <input type="date" value={createForm.endDate} onChange={(e) => setCreateForm({ ...createForm, endDate: e.target.value })} className="w-full rounded-lg border border-[#DDE4EA] px-3.5 py-2.5 text-sm outline-none transition-all focus:border-[#2A7B70] focus:ring-2 focus:ring-[#2A7B70]/15" />
                        </div>
                    </div>
                </div>
                <ModalFooter>
                    <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded-xl transition-colors">
                        Annuler
                    </button>
                    <button
                        onClick={handleCreate}
                        disabled={!createForm.name.trim() || creating}
                        className="px-5 py-2.5 text-sm font-semibold text-white rounded-xl disabled:opacity-50 flex items-center gap-2 transition-all shadow-lg shadow-[rgba(12,59,56,0.15)]"
                        style={{ background: "linear-gradient(135deg, #0c3b38 0%, #25745f 100%)" }}
                    >
                        {creating && <Loader2 className="w-4 h-4 animate-spin" />}
                        Créer le projet
                    </button>
                </ModalFooter>
            </Modal>

            {/* Delete Confirm */}
            <ConfirmModal
                isOpen={!!deleteTarget}
                onClose={() => setDeleteTarget(null)}
                onConfirm={handleDelete}
                title="Supprimer ce projet ?"
                message="Le projet et toutes ses tâches seront définitivement supprimés. Cette action est irréversible."
                confirmText="Supprimer"
                variant="danger"
                isLoading={isDeleting}
            />
        </div>
    );
}

// ============================================
// SUB-COMPONENTS
// ============================================

function ProjectsSkeleton() {
    return (
        <div className="grid animate-pulse grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-label="Chargement des projets">
            {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="h-[228px] rounded-xl border border-[#DDE4EA] bg-white p-5">
                    <div className="h-4 w-2/3 rounded bg-[#E4E9ED]" />
                    <div className="mt-3 h-3 w-2/5 rounded bg-[#EDF1F3]" />
                    <div className="mt-8 h-2 rounded bg-[#E4E9ED]" />
                    <div className="mt-5 h-3 w-1/3 rounded bg-[#EDF1F3]" />
                    <div className="mt-9 h-px bg-[#EDF1F3]" />
                    <div className="mt-4 h-7 w-24 rounded bg-[#E4E9ED]" />
                </div>
            ))}
        </div>
    );
}

function KpiCard({ icon: Icon, label, value, subtitle, iconColor, iconBg, accent }: {
    icon: LucideIcon; label: string; value: number | string; subtitle?: string; iconColor: string; iconBg: string; accent?: boolean;
}) {
    return (
        <div className={cn(
            "flex min-h-[82px] items-center gap-3 rounded-xl border bg-white px-4 shadow-[0_1px_3px_rgba(20,40,60,0.03)] transition-colors",
            accent ? "border-red-200 bg-red-50/30" : "border-slate-200"
        )}>
            <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0", iconBg)}>
                <Icon className={cn("w-4.5 h-4.5", iconColor)} />
            </div>
            <div className="min-w-0">
                <p className="text-lg font-bold text-slate-900 leading-tight">{value}</p>
                <p className="text-[11px] text-slate-500 font-medium">{label}</p>
                {subtitle && <p className="text-[10px] text-slate-400">{subtitle}</p>}
            </div>
        </div>
    );
}

function ProjectCard({ project, onDuplicate, onArchive, onDelete }: {
    project: Project; onDuplicate: () => void; onArchive: () => void; onDelete: () => void;
}) {
    const stats = project.taskStats;
    const status = STATUS_CONFIG[project.status] || STATUS_CONFIG.ACTIVE;
    const progress = stats?.completionPercent || 0;

    return (
        <Link
            href={`/manager/projects/${project.id}`}
            className="group relative block overflow-hidden rounded-xl border border-[#DDE4EA] bg-white transition-all duration-200 hover:-translate-y-px hover:border-[#9DBDB5] hover:shadow-[0_10px_24px_rgba(19,52,47,0.08)]"
        >
            {/* Color accent bar */}
            <div className="h-1" style={{ backgroundColor: project.color || "#6366f1" }} />

            <div className="p-5">
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                        <h3 className="truncate text-sm font-bold text-slate-900 transition-colors group-hover:text-[#0B5A51]">
                            {project.name}
                        </h3>
                        {project.client && (
                            <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                                <Briefcase className="w-3 h-3" />
                                {project.client.name}
                            </p>
                        )}
                        {project.isGroup && (
                            <p className="mt-1 text-xs font-semibold text-[#0B5A51]">Portefeuille · {project._count.childProjects} sous-projet{project._count.childProjects !== 1 ? "s" : ""}</p>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <span className={cn("inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[10px] font-bold border", status.bg, status.color, status.border)}>
                            <span className={cn("w-1.5 h-1.5 rounded-full", status.dot)} />
                            {status.label}
                        </span>
                        <DropdownMenu
                            width={176}
                            trigger={
                                <span className="p-1.5 text-slate-300 hover:text-slate-500 rounded-lg hover:bg-slate-50 transition-colors opacity-0 group-hover:opacity-100 inline-flex cursor-pointer">
                                    <MoreHorizontal className="w-4 h-4" />
                                </span>
                            }
                            items={[
                                { label: "Dupliquer", icon: <Copy className="w-3.5 h-3.5 text-slate-400" />, onClick: onDuplicate },
                                { label: "Archiver", icon: <Archive className="w-3.5 h-3.5 text-slate-400" />, onClick: onArchive },
                                { label: "Supprimer", icon: <Trash2 className="w-3.5 h-3.5" />, onClick: onDelete, variant: "danger", divider: true },
                            ]}
                        />
                    </div>
                </div>

                {/* Description */}
                {project.description && (
                    <p className="text-xs text-slate-500 line-clamp-2 mb-4 leading-relaxed">{project.description}</p>
                )}

                {/* Task status breakdown */}
                {!project.isGroup && <div className="flex items-center gap-1 mb-3">
                    {stats && stats.total > 0 ? (
                        <>
                            {stats.DONE > 0 && <div className="h-2 rounded-full bg-emerald-500 transition-all" style={{ flex: stats.DONE }} />}
                            {stats.IN_REVIEW > 0 && <div className="h-2 rounded-full bg-amber-400 transition-all" style={{ flex: stats.IN_REVIEW }} />}
                            {stats.IN_PROGRESS > 0 && <div className="h-2 rounded-full bg-blue-500 transition-all" style={{ flex: stats.IN_PROGRESS }} />}
                            {stats.TODO > 0 && <div className="h-2 rounded-full bg-slate-200 transition-all" style={{ flex: stats.TODO }} />}
                        </>
                    ) : (
                        <div className="h-2 rounded-full bg-slate-100 w-full" />
                    )}
                </div>}

                {/* Stats row */}
                <div className="flex items-center justify-between text-[11px] text-slate-500 mb-4">
                    <div className="flex items-center gap-3">
                        {project.isGroup ? <span className="flex items-center gap-1"><FolderKanban className="w-3 h-3 text-[#0B5A51]" />{project._count.childProjects} projets gérés</span> : <>
                            <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-emerald-500" />{stats?.DONE || 0}</span>
                            <span className="flex items-center gap-1"><Clock className="w-3 h-3 text-blue-500" />{stats?.IN_PROGRESS || 0}</span>
                            <span className="flex items-center gap-1"><ListTodo className="w-3 h-3 text-slate-400" />{stats?.TODO || 0}</span>
                        </>}
                    </div>
                    {!project.isGroup && <span className="font-bold text-slate-700">{progress}%</span>}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                    <div className="flex -space-x-2">
                        {project.members.slice(0, 4).map((m) => (
                            <div
                                key={m.user.id}
                                className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold border-2 border-white shadow-sm"
                                style={{ backgroundColor: project.color + "20", color: project.color || "#6366f1" }}
                                title={m.user.name}
                            >
                                {m.user.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                            </div>
                        ))}
                        {project.members.length > 4 && (
                            <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center text-[10px] font-bold border-2 border-white">
                                +{project.members.length - 4}
                            </div>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        {(stats?.overdue || 0) > 0 && (
                            <span className="flex items-center gap-1 text-[10px] text-red-600 font-bold bg-red-50 px-2 py-0.5 rounded-lg">
                                <AlertTriangle className="w-3 h-3" />
                                {stats.overdue} en retard
                            </span>
                        )}
                        <ArrowUpRight className="w-4 h-4 text-slate-300 transition-colors group-hover:text-[#0B5A51]" />
                    </div>
                </div>
            </div>
        </Link>
    );
}

function ProjectRow({ project, onDuplicate, onArchive, onDelete }: {
    project: Project; onDuplicate: () => void; onArchive: () => void; onDelete: () => void;
}) {
    const stats = project.taskStats;
    const status = STATUS_CONFIG[project.status] || STATUS_CONFIG.ACTIVE;
    const progress = stats?.completionPercent || 0;

    return (
        <Link
            href={`/manager/projects/${project.id}`}
            className="group grid grid-cols-[1fr,100px,120px,100px,60px] items-center gap-4 border-b border-slate-100 px-5 py-3.5 transition-colors last:border-b-0 hover:bg-[#F5F9F8]"
        >
            <div className="flex items-center gap-3 min-w-0">
                <div className="w-3 h-8 rounded-full shrink-0" style={{ backgroundColor: project.color || "#6366f1" }} />
                <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-800 transition-colors group-hover:text-[#0B5A51]">{project.name}</p>
                    <p className="text-xs text-slate-500 truncate">
                        {project.client ? project.client.name : "Pas de client"} · {project.owner.name}
                    </p>
                </div>
            </div>
            <span className={cn("inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[10px] font-bold border w-fit", status.bg, status.color, status.border)}>
                <span className={cn("w-1.5 h-1.5 rounded-full", status.dot)} />
                {status.label}
            </span>
            <div>
                <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-[#149956] transition-all" style={{ width: `${progress}%` }} />
                    </div>
                    <span className="text-xs font-bold text-slate-700 w-8 text-right">{progress}%</span>
                </div>
                <p className="text-[10px] text-slate-400 mt-0.5">{stats?.total || 0} tâches</p>
            </div>
            <div className="flex -space-x-1.5">
                {project.members.slice(0, 3).map((m) => (
                    <div key={m.user.id} className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-[#E7F3F0] text-[9px] font-bold text-[#0B5A51]">
                        {m.user.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                    </div>
                ))}
                {project.members.length > 3 && (
                    <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center text-[9px] font-bold border-2 border-white">
                        +{project.members.length - 3}
                    </div>
                )}
            </div>
            <div className="flex items-center gap-1" onClick={(e) => e.preventDefault()}>
                <button onClick={onDuplicate} className="rounded-lg p-1.5 text-slate-300 transition-colors hover:bg-[#EAF5F2] hover:text-[#0B5A51]" title="Dupliquer">
                    <Copy className="w-3.5 h-3.5" />
                </button>
                <button onClick={onArchive} className="p-1.5 text-slate-300 hover:text-amber-600 rounded-lg hover:bg-amber-50 transition-colors" title="Archiver">
                    <Archive className="w-3.5 h-3.5" />
                </button>
                <button onClick={onDelete} className="p-1.5 text-slate-300 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors" title="Supprimer">
                    <Trash2 className="w-3.5 h-3.5" />
                </button>
            </div>
        </Link>
    );
}
