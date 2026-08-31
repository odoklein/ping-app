"use client";

import { useState, useEffect, use, useMemo } from "react";
import Link from "next/link";
import {
    ArrowLeft, Calendar, CheckSquare, User, Users, Building2,
    Plus, LayoutGrid, List,
} from "lucide-react";
import { NewTaskModal } from "@/components/tasks/NewTaskModal";
import { KanbanBoard } from "@/components/tasks/KanbanBoard";
import { TaskDetailDrawer } from "@/components/tasks/TaskDetailDrawer";
import { LoadingState, Badge, useToast } from "@/components/ui";
import { cn } from "@/lib/utils";

interface ProjectTask {
    id: string;
    title: string;
    status: string;
    priority: string;
    dueDate: string | null;
    position?: number;
    labels?: string[];
    parentTaskId?: string | null;
    assignee: { id: string; name: string } | null;
    _count?: { comments: number; subtasks?: number };
}

interface ProjectDetail {
    id: string;
    name: string;
    description: string | null;
    status: "ACTIVE" | "COMPLETED" | "ARCHIVED";
    color: string | null;
    owner: { id: string; name: string; email: string };
    client: { id: string; name: string } | null;
    members: Array<{ id: string; userId: string; role: string; user: { id: string; name: string; email: string; role: string } }>;
    tasks: ProjectTask[];
    createdAt: string;
    updatedAt: string;
}

const STATUS_BADGE: Record<string, { variant: "success" | "primary" | "default"; label: string }> = {
    ACTIVE: { variant: "success", label: "Actif" },
    COMPLETED: { variant: "primary", label: "Terminé" },
    ARCHIVED: { variant: "default", label: "Archivé" },
};

export default function ProjectDetailsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const { error: toastError } = useToast();
    const [project, setProject] = useState<ProjectDetail | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [view, setView] = useState<"kanban" | "list">("kanban");
    const [showNewTaskModal, setShowNewTaskModal] = useState(false);
    const [newTaskStatus, setNewTaskStatus] = useState<string | undefined>();
    const [selectedTask, setSelectedTask] = useState<string | null>(null);
    const [showDrawer, setShowDrawer] = useState(false);

    useEffect(() => { loadProject(); }, [id]);

    const loadProject = async () => {
        try {
            const res = await fetch(`/api/projects/${id}`);
            const json = await res.json();
            if (json.success) setProject(json.data);
        } catch (error) {
            console.error("Failed to load project:", error);
            toastError("Erreur", "Impossible de charger le projet");
        } finally {
            setIsLoading(false);
        }
    };

    const members = useMemo(() => project?.members.map((m) => ({ id: m.user.id, name: m.user.name })) || [], [project]);

    const kanbanTasks = useMemo(
        () => (project?.tasks || [])
            .filter((t) => !t.parentTaskId)
            .map((t) => ({ ...t, labels: t.labels || [], position: t.position ?? 0 })),
        [project]
    );

    const handleStatusChange = async (taskId: string, newStatus: string, newPosition: number) => {
        setProject((prev) => prev ? { ...prev, tasks: prev.tasks.map((t) => t.id === taskId ? { ...t, status: newStatus, position: newPosition } : t) } : prev);
        try {
            await fetch(`/api/tasks/${taskId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: newStatus, position: newPosition }),
            });
        } catch (e) {
            console.error(e);
            loadProject();
        }
    };

    const handleReorder = async (updates: { id: string; position: number; status?: string }[]) => {
        try {
            await fetch("/api/tasks/reorder", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ updates }),
            });
        } catch (e) { console.error(e); }
    };

    const handleTaskClick = (taskId: string) => { setSelectedTask(taskId); setShowDrawer(true); };
    const handleAddTask = (status?: string) => { setNewTaskStatus(status); setShowNewTaskModal(true); };

    if (isLoading) return <LoadingState message="Chargement du projet..." />;

    if (!project) {
        return (
            <div className="text-center py-16 bg-[var(--elan-surface)] rounded-2xl border border-[var(--elan-line)]">
                <h2 className="text-xl font-semibold text-[var(--elan-ink)] mb-2">Projet non trouvé</h2>
                <p className="text-[var(--elan-slate)] mb-4">Ce projet n&apos;existe pas ou a été supprimé.</p>
                <Link href="/developer/projects" className="inline-flex items-center gap-2 text-sm text-[var(--elan-petrol)] hover:underline">
                    <ArrowLeft className="w-4 h-4" /> Retour aux projets
                </Link>
            </div>
        );
    }

    const accent = project.color || "#0c3b38";
    const badge = STATUS_BADGE[project.status];
    const completedTasks = project.tasks.filter((t) => t.status === "DONE").length;
    const totalTasks = project.tasks.length;
    const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    return (
        <div className="space-y-6">
            {/* Back */}
            <Link
                href="/developer/projects"
                className="inline-flex items-center gap-2 text-sm text-[var(--elan-slate)] hover:text-[var(--elan-ink)] transition-colors group"
            >
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                Retour aux projets
            </Link>

            {/* Header */}
            <div className="bg-[var(--elan-surface)] border border-[var(--elan-line)] rounded-2xl overflow-hidden">
                <div className="h-1.5" style={{ backgroundColor: accent }} />
                <div className="p-6">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div className="flex items-start gap-4">
                            <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: accent + "1a" }}>
                                <CheckSquare className="w-6 h-6" style={{ color: accent }} />
                            </div>
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <h1 className="text-2xl font-bold text-[var(--elan-ink)]">{project.name}</h1>
                                    <Badge variant={badge.variant}>{badge.label}</Badge>
                                </div>
                                {project.description && (
                                    <p className="text-sm text-[var(--elan-slate)] max-w-2xl mb-3">{project.description}</p>
                                )}
                                <div className="flex flex-wrap items-center gap-5 text-sm text-[var(--elan-slate)]">
                                    {project.client && (
                                        <span className="flex items-center gap-1.5"><Building2 className="w-4 h-4" /> {project.client.name}</span>
                                    )}
                                    <span className="flex items-center gap-1.5"><User className="w-4 h-4" /> {project.owner.name}</span>
                                    <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4" /> {new Date(project.createdAt).toLocaleDateString("fr-FR")}</span>
                                </div>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="text-3xl font-bold text-[var(--elan-ink)]">{progress}%</div>
                            <div className="text-xs text-[var(--elan-slate)]">{completedTasks}/{totalTasks} terminées</div>
                        </div>
                    </div>
                    {/* Progress bar */}
                    <div className="mt-4 h-2 bg-[var(--elan-paper-2)] rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${progress}%`, backgroundColor: accent }} />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Tasks */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                        <h2 className="text-lg font-semibold text-[var(--elan-ink)]">Tâches</h2>
                        <div className="flex items-center gap-3">
                            <div className="flex items-center bg-[var(--elan-paper-2)] rounded-xl p-1 border border-[var(--elan-line)]">
                                {([["kanban", LayoutGrid], ["list", List]] as const).map(([key, Icon]) => (
                                    <button
                                        key={key}
                                        onClick={() => setView(key)}
                                        className={cn("flex items-center px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
                                            view === key ? "bg-[var(--elan-surface)] text-[var(--elan-ink)] shadow-sm" : "text-[var(--elan-slate)] hover:text-[var(--elan-ink)]")}
                                    >
                                        <Icon className="w-4 h-4" />
                                    </button>
                                ))}
                            </div>
                            <button
                                onClick={() => handleAddTask()}
                                className="flex items-center gap-2 h-9 px-4 text-sm font-semibold text-[var(--elan-ink)] bg-[var(--elan-amber)] hover:bg-[#f29113] rounded-xl transition-colors"
                            >
                                <Plus className="w-4 h-4" /> Ajouter
                            </button>
                        </div>
                    </div>

                    {totalTasks === 0 ? (
                        <div className="text-center py-16 bg-[var(--elan-surface)] rounded-2xl border border-[var(--elan-line)]">
                            <CheckSquare className="w-12 h-12 mx-auto mb-3 text-[var(--elan-paper-3)]" />
                            <p className="text-sm text-[var(--elan-slate)] mb-4">Aucune tâche pour le moment</p>
                            <button onClick={() => handleAddTask()} className="text-sm text-[var(--elan-petrol)] hover:underline font-medium">
                                Ajouter une tâche
                            </button>
                        </div>
                    ) : view === "kanban" ? (
                        <KanbanBoard
                            tasks={kanbanTasks as any}
                            onStatusChange={handleStatusChange}
                            onReorder={handleReorder}
                            onTaskClick={handleTaskClick}
                            onAddTask={handleAddTask}
                        />
                    ) : (
                        <div className="bg-[var(--elan-surface)] border border-[var(--elan-line)] rounded-2xl divide-y divide-[var(--elan-line)] overflow-hidden">
                            {project.tasks.map((task) => (
                                <button
                                    key={task.id}
                                    onClick={() => handleTaskClick(task.id)}
                                    className="w-full flex items-center justify-between gap-3 p-4 text-left hover:bg-[var(--elan-paper-2)] transition-colors"
                                >
                                    <div className="flex items-center gap-3 min-w-0">
                                        <span className={cn("w-2 h-8 rounded-full flex-shrink-0",
                                            task.status === "DONE" ? "bg-emerald-500" : task.status === "IN_PROGRESS" ? "bg-blue-500" : task.status === "IN_REVIEW" ? "bg-amber-500" : "bg-slate-400")} />
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium text-[var(--elan-ink)] truncate">{task.title}</p>
                                            {task.dueDate && (
                                                <span className="text-xs text-[var(--elan-slate)]">{new Date(task.dueDate).toLocaleDateString("fr-FR")}</span>
                                            )}
                                        </div>
                                    </div>
                                    {task.assignee && (
                                        <div className="w-8 h-8 rounded-full bg-[var(--elan-eucalyptus)] flex items-center justify-center text-xs font-bold text-[var(--elan-petrol)] flex-shrink-0">
                                            {task.assignee.name.charAt(0).toUpperCase()}
                                        </div>
                                    )}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Team + Stats */}
                <div className="space-y-6">
                    <div className="bg-[var(--elan-surface)] border border-[var(--elan-line)] rounded-2xl p-5">
                        <div className="flex items-center gap-2 mb-4">
                            <Users className="w-5 h-5 text-[var(--elan-petrol)]" />
                            <h2 className="text-base font-semibold text-[var(--elan-ink)]">Équipe</h2>
                            <span className="text-xs text-[var(--elan-slate)]">· {project.members.length}</span>
                        </div>
                        <div className="space-y-2">
                            {project.members.map((member) => (
                                <div key={member.id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-[var(--elan-paper-2)] transition-colors">
                                    <div className="w-9 h-9 rounded-full bg-[var(--elan-eucalyptus)] flex items-center justify-center text-sm font-bold text-[var(--elan-petrol)]">
                                        {member.user.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-[var(--elan-ink)] truncate">{member.user.name}</p>
                                        <p className="text-xs text-[var(--elan-slate)] truncate">{member.user.email}</p>
                                    </div>
                                    <span className="text-xs text-[var(--elan-slate)] capitalize px-2 py-1 bg-[var(--elan-paper-2)] rounded-full">{member.role.toLowerCase()}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-[var(--elan-surface)] border border-[var(--elan-line)] rounded-2xl p-5">
                        <h3 className="text-sm font-semibold text-[var(--elan-ink)] mb-3">Statistiques</h3>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="p-3 rounded-xl bg-[var(--elan-paper-2)]">
                                <p className="text-2xl font-bold text-[var(--elan-ink)]">{totalTasks}</p>
                                <p className="text-xs text-[var(--elan-slate)]">Tâches totales</p>
                            </div>
                            <div className="p-3 rounded-xl bg-emerald-50">
                                <p className="text-2xl font-bold text-emerald-600">{completedTasks}</p>
                                <p className="text-xs text-[var(--elan-slate)]">Terminées</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <NewTaskModal
                isOpen={showNewTaskModal}
                onClose={() => setShowNewTaskModal(false)}
                defaultProjectId={id}
                lockProject
                defaultStatus={newTaskStatus}
                members={members}
                onSuccess={() => { loadProject(); setShowNewTaskModal(false); }}
            />

            <TaskDetailDrawer
                taskId={selectedTask}
                isOpen={showDrawer}
                onClose={() => { setShowDrawer(false); setSelectedTask(null); }}
                onUpdate={loadProject}
                members={members}
            />
        </div>
    );
}
