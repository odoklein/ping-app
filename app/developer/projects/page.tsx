"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
    Plus, FolderKanban, Users, CheckSquare, Search,
    ArrowRight, X, Loader2,
} from "lucide-react";
import { Modal, ModalFooter, LoadingState, EmptyState, useToast } from "@/components/ui";
import { cn } from "@/lib/utils";

interface Project {
    id: string;
    name: string;
    description: string | null;
    status: "ACTIVE" | "COMPLETED" | "ARCHIVED";
    color: string | null;
    owner: { id: string; name: string; email: string };
    client: { id: string; name: string } | null;
    members: Array<{ id: string; userId: string; role: string; user: { id: string; name: string; email: string } }>;
    _count: { tasks: number };
    createdAt: string;
    updatedAt: string;
}

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string; dot: string }> = {
    ACTIVE: { bg: "bg-emerald-50", text: "text-emerald-700", label: "Actif", dot: "bg-emerald-500" },
    COMPLETED: { bg: "bg-blue-50", text: "text-blue-700", label: "Terminé", dot: "bg-blue-500" },
    ARCHIVED: { bg: "bg-slate-100", text: "text-slate-600", label: "Archivé", dot: "bg-slate-400" },
};

export default function ProjectsPage() {
    const { data: session } = useSession();
    const { error: toastError, success: toastSuccess } = useToast();
    const [projects, setProjects] = useState<Project[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [showNewModal, setShowNewModal] = useState(false);
    const [newProject, setNewProject] = useState({ name: "", description: "" });
    const [isCreating, setIsCreating] = useState(false);

    const role = session?.user?.role as string | undefined;
    const canCreate = role === "MANAGER" || role === "DEVELOPER";

    useEffect(() => { loadProjects(); }, []);

    const loadProjects = async () => {
        try {
            const res = await fetch("/api/projects");
            const json = await res.json();
            if (json.success) setProjects(json.data);
        } catch (error) {
            console.error("Failed to load projects:", error);
            toastError("Erreur", "Impossible de charger les projets");
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreateProject = async () => {
        if (!newProject.name.trim()) return;
        setIsCreating(true);
        try {
            const res = await fetch("/api/projects", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(newProject),
            });
            const json = await res.json();
            if (json.success) {
                setProjects([json.data, ...projects]);
                setShowNewModal(false);
                setNewProject({ name: "", description: "" });
                toastSuccess("Projet créé", newProject.name);
            } else {
                toastError("Erreur", json.error || "Création impossible");
            }
        } catch (error) {
            console.error("Failed to create project:", error);
            toastError("Erreur", "Création impossible");
        } finally {
            setIsCreating(false);
        }
    };

    const filteredProjects = projects.filter((p) =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.description?.toLowerCase().includes(search.toLowerCase())
    );

    if (isLoading) return <LoadingState message="Chargement des projets..." />;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                    <h1 className="text-2xl font-bold text-[var(--elan-ink)]">Projets</h1>
                    <p className="text-sm text-[var(--elan-slate)] mt-1">
                        {projects.length} projet{projects.length !== 1 ? "s" : ""} au total
                    </p>
                </div>
                {canCreate && (
                    <button
                        onClick={() => setShowNewModal(true)}
                        className="flex items-center gap-2 h-10 px-5 text-sm font-semibold text-[var(--elan-ink)] bg-[var(--elan-amber)] hover:bg-[#f29113] rounded-xl transition-colors shadow-sm"
                    >
                        <Plus className="w-4 h-4" />
                        Nouveau projet
                    </button>
                )}
            </div>

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--elan-slate)]" />
                <input
                    type="text"
                    placeholder="Rechercher un projet..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full h-12 pl-12 pr-4 text-sm text-[var(--elan-ink)] bg-[var(--elan-surface)] border border-[var(--elan-line)] rounded-xl focus:outline-none focus:border-[var(--elan-petrol)] focus:ring-2 focus:ring-[var(--elan-petrol)]/10 transition-all"
                />
                {search && (
                    <button
                        onClick={() => setSearch("")}
                        className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-[var(--elan-paper-2)] rounded-full transition-colors"
                    >
                        <X className="w-4 h-4 text-[var(--elan-slate)]" />
                    </button>
                )}
            </div>

            {/* Grid */}
            {filteredProjects.length === 0 ? (
                <EmptyState
                    icon={FolderKanban}
                    title={search ? "Aucun résultat" : "Aucun projet"}
                    description={search ? "Essayez avec d'autres termes de recherche" : "Créez votre premier projet pour commencer"}
                    action={canCreate && !search ? (
                        <button
                            onClick={() => setShowNewModal(true)}
                            className="inline-flex items-center gap-2 h-10 px-5 text-sm font-semibold text-[var(--elan-ink)] bg-[var(--elan-amber)] hover:bg-[#f29113] rounded-xl transition-colors"
                        >
                            <Plus className="w-4 h-4" /> Créer un projet
                        </button>
                    ) : undefined}
                />
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {filteredProjects.map((project) => {
                        const statusStyle = STATUS_STYLES[project.status];
                        const accent = project.color || "#0c3b38";
                        return (
                            <Link
                                key={project.id}
                                href={`/developer/projects/${project.id}`}
                                className="group block bg-[var(--elan-surface)] border border-[var(--elan-line)] rounded-2xl overflow-hidden hover:border-[var(--elan-petrol)]/40 hover:shadow-lg hover:shadow-[var(--elan-petrol)]/5 transition-all duration-200"
                            >
                                <div className="h-1" style={{ backgroundColor: accent }} />
                                <div className="p-5">
                                    <div className="flex items-start justify-between mb-4">
                                        <div
                                            className="w-11 h-11 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform duration-300"
                                            style={{ backgroundColor: accent + "1a" }}
                                        >
                                            <FolderKanban className="w-5 h-5" style={{ color: accent }} />
                                        </div>
                                        <span className={cn("flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full", statusStyle.bg, statusStyle.text)}>
                                            <span className={cn("w-1.5 h-1.5 rounded-full", statusStyle.dot)} />
                                            {statusStyle.label}
                                        </span>
                                    </div>
                                    <h3 className="font-bold text-[var(--elan-ink)] mb-1 group-hover:text-[var(--elan-petrol)] transition-colors">
                                        {project.name}
                                    </h3>
                                    {project.description && (
                                        <p className="text-sm text-[var(--elan-slate)] line-clamp-2 mb-4">{project.description}</p>
                                    )}
                                    <div className="flex items-center justify-between pt-4 border-t border-[var(--elan-line)]">
                                        <div className="flex items-center gap-4 text-xs text-[var(--elan-slate)]">
                                            <span className="flex items-center gap-1.5"><CheckSquare className="w-4 h-4" />{project._count?.tasks || 0} tâches</span>
                                            <span className="flex items-center gap-1.5"><Users className="w-4 h-4" />{project.members.length}</span>
                                        </div>
                                        <ArrowRight className="w-4 h-4 text-[var(--elan-ink-soft)] group-hover:text-[var(--elan-petrol)] group-hover:translate-x-1 transition-all duration-200" />
                                    </div>
                                </div>
                            </Link>
                        );
                    })}
                </div>
            )}

            {/* New Project Modal */}
            <Modal
                isOpen={showNewModal}
                onClose={() => setShowNewModal(false)}
                title="Nouveau projet"
                description="Créez un nouveau projet"
                size="md"
            >
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-[var(--elan-slate)] mb-2">Nom du projet *</label>
                        <input
                            type="text"
                            value={newProject.name}
                            onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                            placeholder="Ex: Refonte landing page"
                            className="w-full px-4 py-3 bg-[var(--elan-surface)] border border-[var(--elan-line)] rounded-xl text-sm text-[var(--elan-ink)] focus:outline-none focus:border-[var(--elan-petrol)] focus:ring-2 focus:ring-[var(--elan-petrol)]/10"
                            autoFocus
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-[var(--elan-slate)] mb-2">Description</label>
                        <textarea
                            value={newProject.description}
                            onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                            placeholder="Description du projet..."
                            rows={3}
                            className="w-full px-4 py-3 bg-[var(--elan-surface)] border border-[var(--elan-line)] rounded-xl text-sm text-[var(--elan-ink)] resize-none focus:outline-none focus:border-[var(--elan-petrol)] focus:ring-2 focus:ring-[var(--elan-petrol)]/10"
                        />
                    </div>
                </div>
                <ModalFooter>
                    <button
                        onClick={() => setShowNewModal(false)}
                        className="px-4 py-2 text-sm font-medium text-[var(--elan-slate)] hover:text-[var(--elan-ink)] hover:bg-[var(--elan-paper-2)] rounded-lg transition-colors"
                    >
                        Annuler
                    </button>
                    <button
                        onClick={handleCreateProject}
                        disabled={!newProject.name.trim() || isCreating}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-[var(--elan-ink)] bg-[var(--elan-amber)] hover:bg-[#f29113] rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isCreating ? <><Loader2 className="w-4 h-4 animate-spin" /> Création...</> : <><Plus className="w-4 h-4" /> Créer</>}
                    </button>
                </ModalFooter>
            </Modal>
        </div>
    );
}
