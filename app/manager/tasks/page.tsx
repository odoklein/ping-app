"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
    AlertTriangle,
    Check,
    CheckSquare2,
    CircleDot,
    Clock3,
    Columns3,
    LayoutList,
    Loader2,
    Plus,
    RefreshCw,
    SearchX,
} from "lucide-react";
import { KanbanBoard } from "@/components/tasks/KanbanBoard";
import { TaskDetailDrawer } from "@/components/tasks/TaskDetailDrawer";
import { TaskFilters, type TaskFilterState } from "@/components/tasks/TaskFilters";
import { NewTaskModal } from "@/components/tasks/NewTaskModal";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui";

interface TeamTask {
    id: string;
    title: string;
    description: string | null;
    status: "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE";
    priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
    dueDate: string | null;
    startDate?: string | null;
    estimatedHours?: number | null;
    position: number;
    labels: string[];
    parentTaskId?: string | null;
    project: { id: string; name: string; color?: string | null };
    assignee: { id: string; name: string; email: string } | null;
    createdBy: { id: string; name: string };
    subtasks?: { id: string; status: string; title: string }[];
    _count: { comments: number; subtasks?: number; files?: number };
    createdAt: string;
}

const EMPTY_FILTERS: TaskFilterState = {
    search: "",
    statuses: [],
    priorities: [],
    assigneeIds: [],
    labels: [],
};

const STATUS_LABELS: Record<TeamTask["status"], string> = {
    TODO: "À faire",
    IN_PROGRESS: "En cours",
    IN_REVIEW: "En revue",
    DONE: "Terminée",
};

const PRIORITY_LABELS: Record<TeamTask["priority"], string> = {
    LOW: "Basse",
    MEDIUM: "Moyenne",
    HIGH: "Haute",
    URGENT: "Urgente",
};

export default function ManagerTasksPage() {
    const { success, error: showError } = useToast();
    const [tasks, setTasks] = useState<TeamTask[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [view, setView] = useState<"kanban" | "list">("kanban");
    const [filters, setFilters] = useState<TaskFilterState>(EMPTY_FILTERS);
    const [showNewTask, setShowNewTask] = useState(false);
    const [newTaskStatus, setNewTaskStatus] = useState<string | undefined>();
    const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
    const [showTaskDrawer, setShowTaskDrawer] = useState(false);

    const loadTasks = useCallback(async (quiet = false) => {
        if (quiet) setRefreshing(true);
        else setLoading(true);
        setLoadError(null);

        try {
            const response = await fetch("/api/tasks?sortBy=dueDate&sortOrder=asc");
            const json = await response.json();
            if (!response.ok || !json.success) {
                throw new Error(json.error || "Impossible de charger les tâches.");
            }
            setTasks(
                (json.data as TeamTask[]).map((task) => ({
                    ...task,
                    labels: task.labels ?? [],
                    position: task.position ?? 0,
                })),
            );
        } catch (error) {
            const message = error instanceof Error ? error.message : "Une erreur est survenue.";
            setLoadError(message);
            showError("Tâches indisponibles", message);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [showError]);

    useEffect(() => {
        void loadTasks();
    }, [loadTasks]);

    const members = useMemo(() => {
        const byId = new Map<string, { id: string; name: string }>();
        for (const task of tasks) {
            if (task.assignee) byId.set(task.assignee.id, { id: task.assignee.id, name: task.assignee.name });
        }
        return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name));
    }, [tasks]);

    const filteredTasks = useMemo(() => {
        const query = filters.search.trim().toLocaleLowerCase("fr-FR");
        return tasks.filter((task) => {
            if (
                query &&
                !`${task.title} ${task.description ?? ""} ${task.project.name}`
                    .toLocaleLowerCase("fr-FR")
                    .includes(query)
            ) return false;
            if (filters.statuses.length > 0 && !filters.statuses.includes(task.status)) return false;
            if (filters.priorities.length > 0 && !filters.priorities.includes(task.priority)) return false;
            if (filters.assigneeIds.length > 0) {
                if (!task.assignee && filters.assigneeIds.includes("unassigned")) return true;
                if (!task.assignee || !filters.assigneeIds.includes(task.assignee.id)) return false;
            }
            return true;
        });
    }, [filters, tasks]);

    const stats = useMemo(() => {
        const today = startOfToday();
        return {
            total: tasks.length,
            todo: tasks.filter((task) => task.status === "TODO").length,
            inProgress: tasks.filter((task) => task.status === "IN_PROGRESS").length,
            inReview: tasks.filter((task) => task.status === "IN_REVIEW").length,
            done: tasks.filter((task) => task.status === "DONE").length,
            overdue: tasks.filter(
                (task) => task.dueDate && new Date(task.dueDate) < today && task.status !== "DONE",
            ).length,
        };
    }, [tasks]);

    const kanbanTasks = filteredTasks.filter((task) => !task.parentTaskId);

    async function handleStatusChange(taskId: string, newStatus: string, newPosition: number) {
        const previousTasks = tasks;
        setTasks((current) =>
            current.map((task) =>
                task.id === taskId
                    ? { ...task, status: newStatus as TeamTask["status"], position: newPosition }
                    : task,
            ),
        );

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
            setTasks(previousTasks);
            showError(
                "Déplacement annulé",
                error instanceof Error ? error.message : "Une erreur est survenue.",
            );
        }
    }

    async function handleReorder(updates: { id: string; position: number; status?: string }[]) {
        const previousTasks = tasks;
        setTasks((current) =>
            current.map((task) => {
                const update = updates.find((item) => item.id === task.id);
                if (!update) return task;
                return {
                    ...task,
                    position: update.position,
                    ...(update.status ? { status: update.status as TeamTask["status"] } : {}),
                };
            }),
        );
        try {
            const response = await fetch("/api/tasks/reorder", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ updates }),
            });
            const json = await response.json();
            if (!response.ok || !json.success) throw new Error(json.error || "Réorganisation impossible.");
        } catch (error) {
            setTasks(previousTasks);
            showError("Réorganisation annulée", error instanceof Error ? error.message : "Une erreur est survenue.");
        }
    }

    function openNewTask(status?: string) {
        setNewTaskStatus(status);
        setShowNewTask(true);
    }

    function openTask(taskId: string) {
        setSelectedTaskId(taskId);
        setShowTaskDrawer(true);
    }

    if (loading) return <TasksSkeleton />;

    return (
        <div className="elan-page manager-team-tasks">
            <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                    <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#748396]">Projets</p>
                    <h1 className="text-[26px] font-bold tracking-[-0.035em] text-[#0F1D2E]">Tâches équipe</h1>
                    <p className="mt-1 text-[12px] text-[#65778A]">
                        Pilotez les tâches de tous les projets et collaborateurs.
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <button
                        type="button"
                        onClick={() => void loadTasks(true)}
                        disabled={refreshing}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[#DDE4EA] bg-white text-[#526476] hover:border-[#BAC7D2] hover:text-[#0B5A51] disabled:opacity-50"
                        title="Actualiser"
                    >
                        {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                    </button>
                    <ViewToggle view={view} onChange={setView} />
                    <button
                        type="button"
                        onClick={() => openNewTask()}
                        className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#063E39] bg-[#084C45] px-4 text-[12px] font-bold text-white shadow-[0_5px_14px_rgba(8,76,69,0.18)] hover:bg-[#063E39] active:translate-y-px"
                    >
                        <Plus className="h-4 w-4" />
                        Nouvelle tâche
                    </button>
                </div>
            </header>

            <section className="grid grid-cols-2 gap-3 lg:grid-cols-5">
                <TaskMetric icon={CheckSquare2} value={stats.total} label="Tâches" tone="blue" />
                <TaskMetric icon={CircleDot} value={stats.inProgress} label="En cours" tone="green" />
                <TaskMetric icon={Clock3} value={stats.inReview} label="En revue" tone="orange" />
                <TaskMetric icon={Check} value={stats.done} label="Terminées" tone="green" />
                <TaskMetric icon={AlertTriangle} value={stats.overdue} label="En retard" tone="red" />
            </section>

            <TaskFilters onFiltersChange={setFilters} members={members} />

            {loadError ? (
                <ErrorState message={loadError} onRetry={() => void loadTasks()} />
            ) : view === "kanban" ? (
                kanbanTasks.length > 0 ? (
                    <KanbanBoard
                        tasks={kanbanTasks}
                        onStatusChange={handleStatusChange}
                        onReorder={handleReorder}
                        onTaskClick={openTask}
                        onAddTask={openNewTask}
                    />
                ) : (
                    <EmptyTasks filtered={tasks.length > 0} onCreate={() => openNewTask()} />
                )
            ) : (
                <TaskList tasks={filteredTasks} onTaskClick={openTask} />
            )}

            <NewTaskModal
                isOpen={showNewTask}
                onClose={() => setShowNewTask(false)}
                defaultStatus={newTaskStatus}
                onSuccess={() => {
                    setShowNewTask(false);
                    success("Tâche créée", "Le tableau a été mis à jour.");
                    void loadTasks(true);
                }}
            />

            <TaskDetailDrawer
                taskId={selectedTaskId}
                isOpen={showTaskDrawer}
                onClose={() => {
                    setShowTaskDrawer(false);
                    setSelectedTaskId(null);
                }}
                onUpdate={() => void loadTasks(true)}
                members={members}
            />
        </div>
    );
}

function ViewToggle({
    view,
    onChange,
}: {
    view: "kanban" | "list";
    onChange: (view: "kanban" | "list") => void;
}) {
    return (
        <div className="flex h-10 items-center rounded-lg border border-[#DDE4EA] bg-[#F2F5F6] p-1">
            {([
                ["kanban", Columns3, "Kanban"],
                ["list", LayoutList, "Liste"],
            ] as const).map(([key, Icon, label]) => (
                <button
                    key={key}
                    type="button"
                    onClick={() => onChange(key)}
                    className={cn(
                        "inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-[11px] font-bold transition-colors",
                        view === key ? "bg-white text-[#0B5A51] shadow-sm" : "text-[#65778A] hover:text-[#233548]",
                    )}
                >
                    <Icon className="h-3.5 w-3.5" />
                    {label}
                </button>
            ))}
        </div>
    );
}

function TaskMetric({
    icon: Icon,
    value,
    label,
    tone,
}: {
    icon: typeof CheckSquare2;
    value: number;
    label: string;
    tone: "blue" | "green" | "orange" | "red";
}) {
    const tones = {
        blue: "bg-[#EDF4FF] text-[#367CE7]",
        green: "bg-[#EAF8F0] text-[#149956]",
        orange: "bg-[#FFF4E9] text-[#EB790A]",
        red: "bg-[#FFF0F1] text-[#E5484D]",
    };
    return (
        <div className="flex min-h-[82px] items-center gap-3 rounded-xl border border-[#DDE4EA] bg-white px-4 shadow-[0_1px_3px_rgba(20,40,60,0.03)]">
            <span className={cn("flex h-10 w-10 items-center justify-center rounded-xl", tones[tone])}>
                <Icon className="h-5 w-5" />
            </span>
            <div>
                <p className="text-[19px] font-bold leading-none tracking-[-0.03em] text-[#102033]">{value}</p>
                <p className="mt-1.5 text-[10px] font-medium text-[#607387]">{label}</p>
            </div>
        </div>
    );
}

function TaskList({ tasks, onTaskClick }: { tasks: TeamTask[]; onTaskClick: (id: string) => void }) {
    if (tasks.length === 0) return <EmptyTasks filtered onCreate={() => undefined} />;

    return (
        <div className="overflow-x-auto rounded-xl border border-[#D8E0E7] bg-white">
            <table className="w-full min-w-[900px]">
                <thead className="border-b border-[#DDE4EA] bg-[#F8FAFB]">
                    <tr>
                        {["Tâche", "Projet", "Statut", "Priorité", "Échéance", "Assignée à"].map((heading) => (
                            <th key={heading} className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-[0.08em] text-[#607387]">
                                {heading}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="divide-y divide-[#E5EAEE]">
                    {tasks.map((task) => {
                        const overdue = task.dueDate && new Date(task.dueDate) < startOfToday() && task.status !== "DONE";
                        return (
                            <tr
                                key={task.id}
                                onClick={() => onTaskClick(task.id)}
                                className="cursor-pointer transition-colors hover:bg-[#F6F9F9]"
                            >
                                <td className="px-4 py-3">
                                    <p className="max-w-[330px] truncate text-[12px] font-bold text-[#203448]">{task.title}</p>
                                    {task.labels.length > 0 && (
                                        <p className="mt-1 max-w-[300px] truncate text-[9px] text-[#7B8B9A]">{task.labels.join(" · ")}</p>
                                    )}
                                </td>
                                <td className="px-4 py-3 text-[11px] font-medium text-[#53677A]">{task.project.name}</td>
                                <td className="px-4 py-3">
                                    <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#415568]">
                                        <StatusDot status={task.status} />
                                        {STATUS_LABELS[task.status]}
                                    </span>
                                </td>
                                <td className="px-4 py-3 text-[11px] font-medium text-[#53677A]">{PRIORITY_LABELS[task.priority]}</td>
                                <td className={cn("px-4 py-3 text-[11px] font-medium", overdue ? "text-[#D43F46]" : "text-[#53677A]")}>
                                    {task.dueDate ? formatDate(task.dueDate) : "Non définie"}
                                </td>
                                <td className="px-4 py-3">
                                    {task.assignee ? (
                                        <span className="inline-flex items-center gap-2 text-[11px] font-medium text-[#415568]">
                                            <span className="grid h-7 w-7 place-items-center rounded-full bg-[#E7F3F0] text-[10px] font-bold text-[#0B5A51]">
                                                {initials(task.assignee.name)}
                                            </span>
                                            {task.assignee.name}
                                        </span>
                                    ) : (
                                        <span className="text-[11px] text-[#8794A1]">Non assignée</span>
                                    )}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}

function StatusDot({ status }: { status: TeamTask["status"] }) {
    return (
        <span
            className={cn(
                "h-2 w-2 rounded-full",
                status === "DONE"
                    ? "bg-[#12A765]"
                    : status === "IN_PROGRESS"
                        ? "bg-[#3381E8]"
                        : status === "IN_REVIEW"
                            ? "bg-[#F08B21]"
                            : "bg-[#9AA8B5]",
            )}
        />
    );
}

function EmptyTasks({ filtered, onCreate }: { filtered: boolean; onCreate: () => void }) {
    return (
        <div className="flex min-h-[340px] flex-col items-center justify-center rounded-xl border border-[#DDE4EA] bg-white px-6 text-center">
            <span className="mb-4 grid h-12 w-12 place-items-center rounded-xl bg-[#EEF4F4] text-[#0B5A51]">
                {filtered ? <SearchX className="h-5 w-5" /> : <CheckSquare2 className="h-5 w-5" />}
            </span>
            <h2 className="text-[14px] font-bold text-[#203448]">{filtered ? "Aucune tâche trouvée" : "Aucune tâche"}</h2>
            <p className="mt-1 max-w-sm text-[11px] leading-5 text-[#718294]">
                {filtered ? "Ajustez les filtres pour retrouver une tâche." : "Créez la première tâche pour organiser le travail de l'équipe."}
            </p>
            {!filtered && (
                <button
                    type="button"
                    onClick={onCreate}
                    className="mt-4 inline-flex h-9 items-center gap-2 rounded-lg bg-[#084C45] px-4 text-[11px] font-bold text-white hover:bg-[#063E39]"
                >
                    <Plus className="h-3.5 w-3.5" />
                    Nouvelle tâche
                </button>
            )}
        </div>
    );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
    return (
        <div className="flex min-h-[320px] flex-col items-center justify-center rounded-xl border border-[#F0C8CA] bg-[#FFF9F9] px-6 text-center">
            <AlertTriangle className="mb-3 h-7 w-7 text-[#D43F46]" />
            <h2 className="text-sm font-bold text-[#3C2A2B]">Impossible de charger les tâches</h2>
            <p className="mt-1 max-w-md text-xs text-[#7A6264]">{message}</p>
            <button type="button" onClick={onRetry} className="mt-4 h-9 rounded-lg border border-[#E0B5B8] bg-white px-4 text-[11px] font-bold text-[#B3363C]">
                Réessayer
            </button>
        </div>
    );
}

function TasksSkeleton() {
    return (
        <div className="elan-page animate-pulse">
            <div className="h-8 w-52 rounded-lg bg-[#E3E9ED]" />
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
                {Array.from({ length: 5 }).map((_, index) => <div key={index} className="h-20 rounded-xl bg-[#E3E9ED]" />)}
            </div>
            <div className="h-10 rounded-lg bg-[#E3E9ED]" />
            <div className="grid min-h-[420px] grid-cols-4 gap-3">
                {Array.from({ length: 4 }).map((_, index) => <div key={index} className="rounded-xl bg-[#E3E9ED]" />)}
            </div>
        </div>
    );
}

function formatDate(value: string) {
    return new Date(value).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
}

function initials(value: string) {
    return value
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join("");
}

function startOfToday() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
}
