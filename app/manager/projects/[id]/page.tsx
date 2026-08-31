"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
    ArrowLeft, LayoutDashboard, Columns3, List, BarChart3,
    Activity, Settings, Plus, Sparkles, Loader2, Calendar,
    Users, CheckCircle2, Clock, AlertTriangle, FolderKanban,
    FileText, MoreHorizontal, Download
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PageHeader, Badge, Tabs, Modal, ModalFooter, LoadingState, useToast } from "@/components/ui";
import { KanbanBoard } from "@/components/tasks/KanbanBoard";
import { TaskDetailDrawer } from "@/components/tasks/TaskDetailDrawer";
import { TaskFilters, TaskFilterState } from "@/components/tasks/TaskFilters";
import { NewTaskModal } from "@/components/tasks/NewTaskModal";
import { TaskCard } from "@/components/tasks/TaskCard";
import { ProjectAnalytics } from "@/components/projects/ProjectAnalytics";

// ============================================
// TYPES
// ============================================

interface ProjectData {
    id: string;
    name: string;
    description: string | null;
    status: string;
    color: string | null;
    icon: string | null;
    isGroup: boolean;
    startDate: string | null;
    endDate: string | null;
    owner: { id: string; name: string; email: string };
    client: { id: string; name: string } | null;
    members: { user: { id: string; name: string; email: string; role: string }; role: string }[];
    tasks: any[];
    milestones: any[];
    activities: any[];
    childProjects: Array<{
        id: string;
        name: string;
        description: string | null;
        color: string | null;
        status: string;
        client: { id: string; name: string } | null;
        taskStats: { total: number; completed: number; overdue: number; completionPercent: number };
    }>;
    taskStats: any;
    createdAt: string;
    updatedAt: string;
}

// ============================================
// PAGE
// ============================================

export default function ManagerProjectDetailPage() {
    const params = useParams();
    const router = useRouter();
    const { error: showError } = useToast();
    const projectId = params.id as string;

    const [project, setProject] = useState<ProjectData | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("overview");
    const [taskView, setTaskView] = useState<"kanban" | "list">("kanban");
    const [selectedTask, setSelectedTask] = useState<string | null>(null);
    const [showTaskDrawer, setShowTaskDrawer] = useState(false);
    const [showNewTask, setShowNewTask] = useState(false);
    const [newTaskDefaultStatus, setNewTaskDefaultStatus] = useState<string | undefined>();
    const [aiReportLoading, setAiReportLoading] = useState(false);
    const [aiReport, setAiReport] = useState<string | null>(null);
    const [showAiReport, setShowAiReport] = useState(false);
    const [filters, setFilters] = useState<TaskFilterState>({
        search: "", statuses: [], priorities: [], assigneeIds: [], labels: [],
    });
    const [allUsers, setAllUsers] = useState<{ id: string; name: string }[]>([]);
    const [addMemberUserId, setAddMemberUserId] = useState("");
    const [addMemberLoading, setAddMemberLoading] = useState(false);

    const fetchProject = useCallback(async () => {
        try {
            const res = await fetch(`/api/projects/${projectId}`);
            const json = await res.json();
            if (json.success && json.data) {
                // Ensure tasks is always an array so the UI never breaks
                const data = {
                    ...json.data,
                    tasks: Array.isArray(json.data.tasks) ? json.data.tasks : [],
                };
                setProject(data);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, [projectId]);

    useEffect(() => {
        fetchProject();
    }, [fetchProject]);

    useEffect(() => {
        if (!project) return;
        fetch("/api/users?role=MANAGER,SDR,DEVELOPER,BUSINESS_DEVELOPER&limit=200")
            .then((r) => r.json())
            .then((json) => {
                if (json.success && json.data?.users) {
                    setAllUsers(json.data.users.map((u: { id: string; name: string }) => ({ id: u.id, name: u.name })));
                }
            })
            .catch(() => {});
    }, [project?.id]);

    // All tasks (ensure array)
    const allTasks = Array.isArray(project?.tasks) ? project.tasks : [];

    const matchesFilter = (t: any) => {
        if (filters.search && !t.title?.toLowerCase().includes(filters.search.toLowerCase())) return false;
        if (filters.statuses.length > 0 && !filters.statuses.includes(t.status)) return false;
        if (filters.priorities.length > 0 && !filters.priorities.includes(t.priority)) return false;
        if (filters.assigneeIds.length > 0) {
            if (filters.assigneeIds.includes("unassigned") && !t.assigneeId) return true;
            if (t.assigneeId && filters.assigneeIds.includes(t.assigneeId)) return true;
            if (!filters.assigneeIds.includes("unassigned") && !t.assigneeId) return false;
            return false;
        }
        return true;
    };

    // Kanban: only top-level tasks (no subtasks in columns)
    const filteredTasksKanban = allTasks.filter((t: any) => {
        if (t.parentTaskId) return false;
        return matchesFilter(t);
    });

    // List: show all tasks (including subtasks) so nothing is hidden
    const filteredTasksList = allTasks.filter(matchesFilter);

    const members = project?.members?.map((m) => ({ id: m.user.id, name: m.user.name })) || [];

    // Kanban handlers
    const handleStatusChange = async (taskId: string, newStatus: string, newPosition: number) => {
        const previousProject = project;
        setProject((current) => current ? {
            ...current,
            tasks: current.tasks.map((task) => task.id === taskId
                ? { ...task, status: newStatus, position: newPosition }
                : task),
        } : current);

        try {
            const response = await fetch(`/api/tasks/${taskId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: newStatus, position: newPosition }),
            });
            const json = await response.json();
            if (!response.ok || !json.success) {
                throw new Error(json.error || "La tâche n'a pas pu être déplacée.");
            }
        } catch (error) {
            setProject(previousProject);
            showError("Déplacement annulé", error instanceof Error ? error.message : "Une erreur est survenue.");
        }
    };

    const handleReorder = async (updates: { id: string; position: number; status?: string }[]) => {
        const previousProject = project;
        setProject((current) => current ? {
            ...current,
            tasks: current.tasks.map((task) => {
                const update = updates.find((item) => item.id === task.id);
                return update
                    ? { ...task, position: update.position, ...(update.status ? { status: update.status } : {}) }
                    : task;
            }),
        } : current);

        try {
            const response = await fetch("/api/tasks/reorder", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ updates }),
            });
            const json = await response.json();
            if (!response.ok || !json.success) {
                throw new Error(json.error || "La réorganisation a échoué.");
            }
        } catch (error) {
            setProject(previousProject);
            showError("Réorganisation annulée", error instanceof Error ? error.message : "Une erreur est survenue.");
        }
    };

    const handleTaskClick = (taskId: string) => {
        setSelectedTask(taskId);
        setShowTaskDrawer(true);
    };

    const handleAddTask = (status?: string) => {
        setNewTaskDefaultStatus(status);
        setShowNewTask(true);
    };

    const handleTaskCreated = () => {
        setShowNewTask(false);
        fetchProject();
    };

    // AI Report
    const generateAiReport = async () => {
        if (!project) return;
        setAiReportLoading(true);
        try {
            const res = await fetch("/api/ai/mistral/project-report", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    projectName: project.name,
                    projectDescription: project.description,
                    taskStats: {
                        total: project.taskStats?.total || 0,
                        completed: project.taskStats?.completed || 0,
                        inProgress: (project.taskStats?.byStatus?.IN_PROGRESS || 0) + (project.taskStats?.byStatus?.IN_REVIEW || 0),
                        overdue: project.taskStats?.overdue || 0,
                        completionPercent: project.taskStats?.completionPercent || 0,
                    },
                    teamMembers: project.taskStats?.byAssignee || [],
                    startDate: project.startDate,
                    endDate: project.endDate,
                }),
            });
            const json = await res.json();
            if (json.success) {
                setAiReport(json.data.report);
                setShowAiReport(true);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setAiReportLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="elan-page">
                <LoadingState message="Chargement du projet..." />
            </div>
        );
    }

    if (!project) {
        return (
            <div className="elan-page items-center justify-center text-center">
                <p className="text-slate-500">Projet non trouvé</p>
                <button onClick={() => router.back()} className="mt-4 text-sm font-semibold text-[#0B5A51] hover:underline">
                    Retour
                </button>
            </div>
        );
    }

    if (project.isGroup) {
        return (
            <div className="elan-page mx-auto max-w-7xl">
                <button onClick={() => router.push("/manager/projects")} className="mb-5 flex items-center gap-1.5 text-sm text-slate-500 transition-colors hover:text-[#0B5A51]">
                    <ArrowLeft className="w-4 h-4" />Projets
                </button>
                <div className="flex flex-col gap-4 rounded-2xl border border-[#C9DED8] bg-[#F5FAF8] p-6 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: (project.color || "#0c3b38") + "20" }}>
                            <FolderKanban className="w-5 h-5" style={{ color: project.color || "#0c3b38" }} />
                        </div>
                        <div>
                            <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#0B5A51]">Projet principal</p>
                            <h1 className="mt-1 text-2xl font-bold text-slate-900">{project.name}</h1>
                            <p className="mt-1 text-sm text-slate-600">{project.description || "Gérez séparément les projets et les tâches de chaque client."}</p>
                        </div>
                    </div>
                    <button onClick={() => router.push(`/manager/projects?parentProjectId=${project.id}`)} className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#084C45] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#063E39]">
                        <Plus className="h-4 w-4" />Nouveau sous-projet
                    </button>
                </div>
                <div className="mt-7 flex items-end justify-between gap-4">
                    <div><h2 className="text-lg font-bold text-slate-900">Projets gérés</h2><p className="mt-1 text-sm text-slate-500">Chaque carte ouvre son propre tableau de tâches.</p></div>
                    <span className="rounded-full bg-[#EAF5F2] px-3 py-1 text-xs font-semibold text-[#0B5A51]">{project.childProjects?.length || 0} sous-projet{project.childProjects?.length !== 1 ? "s" : ""}</span>
                </div>
                {(project.childProjects?.length || 0) === 0 ? (
                    <div className="mt-5 rounded-xl border border-dashed border-[#C9DED8] bg-white px-6 py-16 text-center"><FolderKanban className="mx-auto h-9 w-9 text-[#8DAAA3]" /><h3 className="mt-3 font-semibold text-slate-800">Aucun sous-projet</h3><p className="mt-1 text-sm text-slate-500">Créez un projet client pour commencer à organiser ses tâches.</p></div>
                ) : (
                    <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {project.childProjects.map((child) => <button key={child.id} onClick={() => router.push(`/manager/projects/${child.id}`)} className="group rounded-xl border border-slate-200 bg-white p-5 text-left transition-all hover:-translate-y-px hover:border-[#9DBDB5] hover:shadow-[0_10px_24px_rgba(19,52,47,0.08)]">
                            <div className="h-1 rounded-full" style={{ backgroundColor: child.color || "#0c3b38" }} />
                            <div className="mt-4 flex items-start justify-between gap-3"><div className="min-w-0"><h3 className="truncate font-bold text-slate-900 group-hover:text-[#0B5A51]">{child.name}</h3><p className="mt-1 truncate text-xs text-slate-500">{child.client?.name || "Client non associé"}</p></div><span className="text-xs font-bold text-[#0B5A51]">{child.taskStats.completionPercent}%</span></div>
                            <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-[#149956]" style={{ width: `${child.taskStats.completionPercent}%` }} /></div>
                            <div className="mt-3 flex items-center justify-between text-xs text-slate-500"><span>{child.taskStats.completed}/{child.taskStats.total} tâches</span>{child.taskStats.overdue > 0 && <span className="font-semibold text-red-600">{child.taskStats.overdue} en retard</span>}</div>
                        </button>)}
                    </div>
                )}
            </div>
        );
    }

    const tabs = [
        { id: "overview", label: "Vue d'ensemble", icon: <LayoutDashboard className="w-3.5 h-3.5" /> },
        { id: "tasks", label: `Tâches (${allTasks.length})`, icon: <Columns3 className="w-3.5 h-3.5" /> },
        { id: "analytics", label: "Analytique", icon: <BarChart3 className="w-3.5 h-3.5" /> },
        { id: "activity", label: "Activité", icon: <Activity className="w-3.5 h-3.5" /> },
        { id: "settings", label: "Paramètres", icon: <Settings className="w-3.5 h-3.5" /> },
    ];

    return (
        <div className="elan-page mx-auto max-w-7xl">
            {/* Back + Header */}
            <div className="mb-6">
                <button
                    onClick={() => router.push("/manager/projects")}
                    className="mb-3 flex items-center gap-1.5 text-sm text-slate-500 transition-colors hover:text-[#0B5A51]"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Projets
                </button>

                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center"
                            style={{ backgroundColor: (project.color || "#6366f1") + "20" }}
                        >
                            <FolderKanban className="w-5 h-5" style={{ color: project.color || "#6366f1" }} />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-slate-900">{project.name}</h1>
                            <div className="flex items-center gap-2 mt-0.5">
                                <Badge variant={project.status === "ACTIVE" ? "primary" : project.status === "COMPLETED" ? "success" : "default"}>
                                    {project.status === "ACTIVE" ? "Actif" : project.status === "COMPLETED" ? "Terminé" : "Archivé"}
                                </Badge>
                                {project.client && (
                                    <span className="text-xs text-slate-500">{project.client.name}</span>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={generateAiReport}
                            disabled={aiReportLoading}
                            className="flex items-center gap-1.5 rounded-lg border border-[#C9DED8] bg-[#EAF5F2] px-3 py-2 text-sm font-medium text-[#0B5A51] transition-colors hover:bg-[#DDEFEA] disabled:opacity-50"
                        >
                            {aiReportLoading ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Sparkles className="w-4 h-4" />
                            )}
                            Rapport IA
                        </button>
                        <button
                            onClick={() => handleAddTask()}
                            className="flex items-center gap-1.5 rounded-lg bg-[#084C45] px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#063E39]"
                        >
                            <Plus className="w-4 h-4" />
                            Nouvelle tâche
                        </button>
                    </div>
                </div>
            </div>

            {/* Progress bar */}
            <div className="mb-6">
                <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-slate-600 font-medium">
                        {project.taskStats?.completionPercent || 0}% terminé
                    </span>
                    <span className="text-slate-500">
                        {project.taskStats?.completed || 0}/{project.taskStats?.total || 0} tâches
                    </span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                        className="h-full rounded-full transition-all"
                        style={{
                            width: `${project.taskStats?.completionPercent || 0}%`,
                            backgroundColor: project.color || "#6366f1",
                        }}
                    />
                </div>
            </div>

            {/* Tabs */}
            <Tabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

            {/* Tab content */}
            <div className="mt-6">
                {/* ---- OVERVIEW ---- */}
                {activeTab === "overview" && (
                    <div className="space-y-6">
                        {/* Stats cards */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            <OverviewStat
                                icon={<FolderKanban className="w-5 h-5 text-blue-600" />}
                                label="Total tâches"
                                value={project.taskStats?.total || 0}
                                color="blue"
                            />
                            <OverviewStat
                                icon={<Clock className="w-5 h-5 text-amber-600" />}
                                label="En cours"
                                value={(project.taskStats?.byStatus?.IN_PROGRESS || 0) + (project.taskStats?.byStatus?.IN_REVIEW || 0)}
                                color="amber"
                            />
                            <OverviewStat
                                icon={<CheckCircle2 className="w-5 h-5 text-emerald-600" />}
                                label="Terminées"
                                value={project.taskStats?.completed || 0}
                                color="emerald"
                            />
                            <OverviewStat
                                icon={<AlertTriangle className="w-5 h-5 text-red-600" />}
                                label="En retard"
                                value={project.taskStats?.overdue || 0}
                                color="red"
                            />
                        </div>

                        {/* Two column layout */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Details */}
                            <div className="lg:col-span-2 space-y-4">
                                {project.description && (
                                    <div className="bg-white border border-slate-200 rounded-xl p-4">
                                        <h3 className="text-sm font-semibold text-slate-700 mb-2">Description</h3>
                                        <p className="text-sm text-slate-600 whitespace-pre-wrap">{project.description}</p>
                                    </div>
                                )}

                                {/* Recent activity */}
                                <div className="bg-white border border-slate-200 rounded-xl p-4">
                                    <h3 className="text-sm font-semibold text-slate-700 mb-3">Activité récente</h3>
                                    <div className="space-y-3 max-h-64 overflow-y-auto">
                                        {project.activities?.slice(0, 10).map((a: any) => (
                                            <div key={a.id} className="flex gap-3">
                                                <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center shrink-0 mt-0.5">
                                                    <Activity className="w-3 h-3 text-slate-400" />
                                                </div>
                                                <div>
                                                    <p className="text-sm text-slate-600">
                                                        <span className="font-medium text-slate-800">{a.user?.name}</span>{" "}
                                                        {formatActivity(a.action, a.details)}
                                                        {a.task && (
                                                            <span className="ml-1 text-[#0B5A51]">
                                                                {a.task.title}
                                                            </span>
                                                        )}
                                                    </p>
                                                    <p className="text-xs text-slate-400">
                                                        {new Date(a.createdAt).toLocaleString("fr-FR", {
                                                            day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
                                                        })}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                        {(!project.activities || project.activities.length === 0) && (
                                            <p className="text-sm text-slate-400 text-center py-4">Aucune activité</p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Sidebar */}
                            <div className="space-y-4">
                                {/* Team */}
                                <div className="bg-white border border-slate-200 rounded-xl p-4">
                                    <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                                        <Users className="w-4 h-4" /> Équipe ({project.members?.length || 0})
                                    </h3>
                                    <div className="space-y-2">
                                        {project.members?.map((m: any) => {
                                            const memberTasks = project.taskStats?.byAssignee?.find(
                                                (a: any) => a.name === m.user.name
                                            );
                                            return (
                                                <div key={m.user.id} className="flex items-center gap-3">
                                                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#E7F3F0] text-xs font-bold text-[#0B5A51]">
                                                        {m.user.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-medium text-slate-700 truncate">{m.user.name}</p>
                                                        <p className="text-xs text-slate-500">{m.role === "owner" ? "Propriétaire" : m.role === "admin" ? "Admin" : "Membre"}</p>
                                                    </div>
                                                    {memberTasks && (
                                                        <span className="text-xs text-slate-400">{memberTasks.completed}/{memberTasks.count}</span>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                    <div className="mt-3 pt-3 border-t border-slate-100">
                                        <select
                                            value={addMemberUserId}
                                            onChange={async (e) => {
                                                const userId = e.target.value;
                                                if (!userId) return;
                                                setAddMemberLoading(true);
                                                try {
                                                    const res = await fetch(`/api/projects/${projectId}/members`, {
                                                        method: "POST",
                                                        headers: { "Content-Type": "application/json" },
                                                        body: JSON.stringify({ userId, role: "member" }),
                                                    });
                                                    const json = await res.json();
                                                    if (json.success) {
                                                        setAddMemberUserId("");
                                                        fetchProject();
                                                    }
                                                } catch (err) {
                                                    console.error(err);
                                                } finally {
                                                    setAddMemberLoading(false);
                                                }
                                            }}
                                            disabled={addMemberLoading}
                                            className="w-full rounded-lg border border-[#DDE4EA] bg-white px-3 py-2 text-sm outline-none focus:border-[#2A7B70] disabled:opacity-50"
                                        >
                                            <option value="">Ajouter un membre...</option>
                                            {allUsers
                                                .filter((u) => !project.members?.some((m: any) => m.user.id === u.id))
                                                .map((u) => (
                                                    <option key={u.id} value={u.id}>{u.name}</option>
                                                ))}
                                        </select>
                                        {addMemberLoading && (
                                            <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                                                <Loader2 className="w-3 h-3 animate-spin" /> Ajout en cours...
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {/* Dates */}
                                <div className="bg-white border border-slate-200 rounded-xl p-4">
                                    <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                                        <Calendar className="w-4 h-4" /> Dates
                                    </h3>
                                    <div className="space-y-2 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-slate-500">Créé le</span>
                                            <span className="text-slate-700">
                                                {new Date(project.createdAt).toLocaleDateString("fr-FR")}
                                            </span>
                                        </div>
                                        {project.startDate && (
                                            <div className="flex justify-between">
                                                <span className="text-slate-500">Début</span>
                                                <span className="text-slate-700">
                                                    {new Date(project.startDate).toLocaleDateString("fr-FR")}
                                                </span>
                                            </div>
                                        )}
                                        {project.endDate && (
                                            <div className="flex justify-between">
                                                <span className="text-slate-500">Fin prévue</span>
                                                <span className="text-slate-700">
                                                    {new Date(project.endDate).toLocaleDateString("fr-FR")}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* ---- TASKS TAB ---- */}
                {activeTab === "tasks" && (
                    <div className="space-y-4">
                        {/* Filters + View toggle */}
                        <div className="flex items-center justify-between gap-4">
                            <TaskFilters
                                onFiltersChange={setFilters}
                                members={members}
                                className="flex-1"
                            />
                            <div className="flex bg-slate-100 border border-slate-200 rounded-lg p-0.5 shrink-0">
                                <button
                                    onClick={() => setTaskView("kanban")}
                                    className={cn(
                                        "p-1.5 rounded transition-colors",
                                        taskView === "kanban" ? "bg-white text-[#0B5A51] shadow-sm" : "text-slate-500"
                                    )}
                                    title="Kanban"
                                >
                                    <Columns3 className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => setTaskView("list")}
                                    className={cn(
                                        "p-1.5 rounded transition-colors",
                                        taskView === "list" ? "bg-white text-[#0B5A51] shadow-sm" : "text-slate-500"
                                    )}
                                    title="Liste"
                                >
                                    <List className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {taskView === "kanban" ? (
                            <KanbanBoard
                                tasks={filteredTasksKanban}
                                onStatusChange={handleStatusChange}
                                onReorder={handleReorder}
                                onTaskClick={handleTaskClick}
                                onAddTask={handleAddTask}
                            />
                        ) : (
                            <div className="space-y-2">
                                {filteredTasksList.length === 0 && (
                                    <p className="text-sm text-slate-400 text-center py-8">Aucune tâche</p>
                                )}
                                {filteredTasksList.map((task: any) => (
                                    <div
                                        key={task.id}
                                        onClick={() => handleTaskClick(task.id)}
                                        className={cn(
                                            "flex cursor-pointer items-center gap-4 rounded-lg border border-[#DDE4EA] bg-white px-4 py-3 transition-all hover:border-[#9DBDB5] hover:bg-[#F8FBFA]",
                                            task.parentTaskId && "ml-4 border-l-2 border-l-[#9DBDB5]"
                                        )}
                                    >
                                        <StatusDot status={task.status} />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-slate-800 truncate">{task.title}</p>
                                        </div>
                                        <PriorityBadge priority={task.priority} />
                                        {task.assignee && (
                                            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#E7F3F0] text-[10px] font-bold text-[#0B5A51]">
                                                {task.assignee.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
                                            </div>
                                        )}
                                        {task.dueDate && (
                                            <span className={cn(
                                                "text-xs",
                                                new Date(task.dueDate) < new Date() && task.status !== "DONE"
                                                    ? "text-red-600 font-medium"
                                                    : "text-slate-500"
                                            )}>
                                                {new Date(task.dueDate).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                                            </span>
                                        )}
                                        {(task._count?.subtasks || 0) > 0 && (
                                            <span className="text-xs text-slate-400">
                                                {task.subtasks?.filter((s: any) => s.status === "DONE").length || 0}/{task._count?.subtasks} st
                                            </span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* ---- ANALYTICS TAB ---- */}
                {activeTab === "analytics" && project.taskStats && (
                    <ProjectAnalytics taskStats={project.taskStats} />
                )}

                {/* ---- ACTIVITY TAB ---- */}
                {activeTab === "activity" && (
                    <div className="space-y-3 max-w-2xl">
                        {project.activities?.map((a: any) => (
                            <div key={a.id} className="flex gap-3 py-2">
                                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                                    <Activity className="w-4 h-4 text-slate-400" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm text-slate-700">
                                        <span className="font-medium">{a.user?.name}</span>{" "}
                                        {formatActivity(a.action, a.details)}
                                        {a.task && (
                                            <button
                                                onClick={() => handleTaskClick(a.task.id)}
                                                className="ml-1 text-[#0B5A51] hover:underline"
                                            >
                                                {a.task.title}
                                            </button>
                                        )}
                                    </p>
                                    <p className="text-xs text-slate-400">
                                        {new Date(a.createdAt).toLocaleString("fr-FR", {
                                            day: "numeric", month: "short", year: "numeric",
                                            hour: "2-digit", minute: "2-digit",
                                        })}
                                    </p>
                                </div>
                            </div>
                        ))}
                        {(!project.activities || project.activities.length === 0) && (
                            <p className="text-sm text-slate-400 text-center py-8">Aucune activité</p>
                        )}
                    </div>
                )}

                {/* ---- SETTINGS TAB ---- */}
                {activeTab === "settings" && (
                    <ProjectSettings
                        project={project}
                        onUpdate={fetchProject}
                    />
                )}
            </div>

            {/* Task Detail Drawer */}
            <TaskDetailDrawer
                taskId={selectedTask}
                isOpen={showTaskDrawer}
                onClose={() => { setShowTaskDrawer(false); setSelectedTask(null); }}
                onUpdate={fetchProject}
                members={members}
            />

            {/* New Task Modal */}
            <NewTaskModal
                isOpen={showNewTask}
                onClose={() => setShowNewTask(false)}
                onSuccess={handleTaskCreated}
                defaultProjectId={projectId}
                lockProject
                defaultStatus={newTaskDefaultStatus}
                members={members}
            />

            {/* AI Report Modal */}
            <Modal isOpen={showAiReport} onClose={() => setShowAiReport(false)} title="Rapport IA du projet" size="lg">
                <div className="prose prose-sm max-w-none">
                    <div className="whitespace-pre-wrap text-sm text-slate-700">{aiReport}</div>
                </div>
                <ModalFooter>
                    <button
                        onClick={() => setShowAiReport(false)}
                        className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded-lg"
                    >
                        Fermer
                    </button>
                </ModalFooter>
            </Modal>
        </div>
    );
}

// ============================================
// SUB-COMPONENTS
// ============================================

function OverviewStat({ icon, label, value, color }: {
    icon: React.ReactNode; label: string; value: number; color: string;
}) {
    return (
        <div className="bg-white border border-slate-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
                {icon}
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">{label}</span>
            </div>
            <p className="text-2xl font-bold text-slate-900">{value}</p>
        </div>
    );
}

function StatusDot({ status }: { status: string }) {
    const colors: Record<string, string> = {
        TODO: "bg-slate-400",
        IN_PROGRESS: "bg-blue-500",
        IN_REVIEW: "bg-amber-500",
        DONE: "bg-emerald-500",
    };
    return <span className={cn("w-2.5 h-2.5 rounded-full shrink-0", colors[status] || "bg-slate-300")} />;
}

function PriorityBadge({ priority }: { priority: string }) {
    const styles: Record<string, string> = {
        URGENT: "bg-red-50 text-red-700",
        HIGH: "bg-orange-50 text-orange-700",
        MEDIUM: "bg-blue-50 text-blue-700",
        LOW: "bg-slate-50 text-slate-600",
    };
    const labels: Record<string, string> = {
        URGENT: "Urgent", HIGH: "Haute", MEDIUM: "Moyenne", LOW: "Basse",
    };
    return (
        <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded", styles[priority])}>
            {labels[priority] || priority}
        </span>
    );
}

function ProjectSettings({ project, onUpdate }: { project: ProjectData; onUpdate: () => void }) {
    const [name, setName] = useState(project.name);
    const [description, setDescription] = useState(project.description || "");
    const [color, setColor] = useState(project.color || "#6366f1");
    const [status, setStatus] = useState(project.status);
    const [saving, setSaving] = useState(false);
    const router = useRouter();

    const save = async () => {
        setSaving(true);
        try {
            const res = await fetch(`/api/projects/${project.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, description, color, status }),
            });
            if ((await res.json()).success) onUpdate();
        } catch (e) {
            console.error(e);
        } finally {
            setSaving(false);
        }
    };

    const saveAsTemplate = async () => {
        try {
            const res = await fetch("/api/projects/templates", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: `Modèle - ${project.name}`,
                    description: project.description,
                    projectId: project.id,
                }),
            });
            if ((await res.json()).success) {
                alert("Modèle créé avec succès !");
            }
        } catch (e) {
            console.error(e);
        }
    };

    const deleteProject = async () => {
        if (!confirm("Supprimer ce projet et toutes ses tâches ? Cette action est irréversible.")) return;
        try {
            await fetch(`/api/projects/${project.id}`, { method: "DELETE" });
            router.push("/manager/projects");
        } catch (e) {
            console.error(e);
        }
    };

    return (
        <div className="max-w-xl space-y-6">
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nom du projet</label>
                <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-lg border border-[#DDE4EA] px-3 py-2 text-sm outline-none focus:border-[#2A7B70]"
                />
            </div>
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                    className="w-full resize-none rounded-lg border border-[#DDE4EA] px-3 py-2 text-sm outline-none focus:border-[#2A7B70]"
                />
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Couleur</label>
                    <input
                        type="color"
                        value={color}
                        onChange={(e) => setColor(e.target.value)}
                        className="w-full h-10 rounded-lg border border-slate-200 cursor-pointer"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Statut</label>
                    <select
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
                    >
                        <option value="ACTIVE">Actif</option>
                        <option value="COMPLETED">Terminé</option>
                        <option value="ARCHIVED">Archivé</option>
                    </select>
                </div>
            </div>

            <div className="flex gap-3">
                <button
                    onClick={save}
                    disabled={saving}
                    className="flex items-center gap-2 rounded-lg bg-[#084C45] px-4 py-2 text-sm font-semibold text-white hover:bg-[#063E39] disabled:opacity-50"
                >
                    {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                    Enregistrer
                </button>
                <button
                    onClick={saveAsTemplate}
                    className="rounded-lg border border-[#C9DED8] bg-[#EAF5F2] px-4 py-2 text-sm font-medium text-[#0B5A51] hover:bg-[#DDEFEA]"
                >
                    Sauvegarder comme modèle
                </button>
            </div>

            <div className="pt-6 border-t border-slate-200">
                <h3 className="text-sm font-semibold text-red-600 mb-2">Zone de danger</h3>
                <button
                    onClick={deleteProject}
                    className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg border border-red-200"
                >
                    Supprimer le projet
                </button>
            </div>
        </div>
    );
}

// ============================================
// HELPERS
// ============================================

function formatActivity(action: string, details: any): string {
    switch (action) {
        case "project_created": return "a créé le projet";
        case "project_updated": return "a mis à jour le projet";
        case "project_duplicated": return "a dupliqué le projet";
        case "task_created": return "a créé la tâche";
        case "task_deleted": return `a supprimé la tâche "${details?.title}"`;
        case "status_changed": return `a changé le statut → ${details?.to}`;
        case "assigned": return "a modifié l'assignation de";
        case "priority_changed": return "a changé la priorité de";
        case "commented": return "a commenté sur";
        case "subtask_created": return "a ajouté une sous-tâche à";
        case "member_added": return "a ajouté un membre au projet";
        case "milestone_created": return `a créé le jalon "${details?.title}"`;
        case "bulk_status_change": return `a mis à jour ${details?.taskCount} tâches`;
        default: return action;
    }
}
