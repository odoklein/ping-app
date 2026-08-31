"use client";

import { useState, useEffect, useMemo } from "react";
import { Plus, LayoutGrid, List, CheckSquare } from "lucide-react";
import { KanbanBoard } from "@/components/tasks/KanbanBoard";
import { TaskDetailDrawer } from "@/components/tasks/TaskDetailDrawer";
import { TaskFilters, TaskFilterState } from "@/components/tasks/TaskFilters";
import { NewTaskModal } from "@/components/tasks/NewTaskModal";
import { LoadingState, EmptyState, useToast } from "@/components/ui";
import { cn } from "@/lib/utils";

interface Task {
    id: string;
    title: string;
    description: string | null;
    status: "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE";
    priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
    dueDate: string | null;
    position: number;
    labels: string[];
    parentTaskId?: string | null;
    project: { id: string; name: string };
    assignee: { id: string; name: string; email: string } | null;
    createdBy: { id: string; name: string };
    _count: { comments: number; subtasks?: number };
    createdAt: string;
}

const STATUS_LABELS: Record<string, string> = {
    TODO: "À faire",
    IN_PROGRESS: "En cours",
    IN_REVIEW: "En revue",
    DONE: "Terminé",
};

const PRIORITY_LABELS: Record<string, string> = {
    LOW: "Basse", MEDIUM: "Moyenne", HIGH: "Haute", URGENT: "Urgent",
};

export default function TasksPage() {
    const { error: toastError } = useToast();
    const [tasks, setTasks] = useState<Task[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [view, setView] = useState<"kanban" | "list">("kanban");
    const [showNewTaskModal, setShowNewTaskModal] = useState(false);
    const [newTaskStatus, setNewTaskStatus] = useState<string | undefined>();
    const [selectedTask, setSelectedTask] = useState<string | null>(null);
    const [showDrawer, setShowDrawer] = useState(false);
    const [filters, setFilters] = useState<TaskFilterState>({
        search: "", statuses: [], priorities: [], assigneeIds: [], labels: [],
    });

    useEffect(() => { loadTasks(); }, []);

    const loadTasks = async () => {
        try {
            const res = await fetch("/api/tasks");
            const json = await res.json();
            if (json.success) {
                setTasks((json.data as Task[]).map((t) => ({
                    ...t,
                    labels: t.labels || [],
                    position: t.position ?? 0,
                })));
            }
        } catch (error) {
            console.error("Failed to load tasks:", error);
            toastError("Erreur", "Impossible de charger les tâches");
        } finally {
            setIsLoading(false);
        }
    };

    const members = useMemo(() => {
        const map = new Map<string, { id: string; name: string }>();
        tasks.forEach((t) => { if (t.assignee) map.set(t.assignee.id, { id: t.assignee.id, name: t.assignee.name }); });
        return Array.from(map.values());
    }, [tasks]);

    const matchesFilter = (t: Task) => {
        if (filters.search && !t.title.toLowerCase().includes(filters.search.toLowerCase()) &&
            !t.project.name.toLowerCase().includes(filters.search.toLowerCase())) return false;
        if (filters.statuses.length && !filters.statuses.includes(t.status)) return false;
        if (filters.priorities.length && !filters.priorities.includes(t.priority)) return false;
        if (filters.assigneeIds.length && (!t.assignee || !filters.assigneeIds.includes(t.assignee.id))) return false;
        return true;
    };

    const filteredKanban = tasks.filter((t) => !t.parentTaskId && matchesFilter(t));
    const filteredList = tasks.filter(matchesFilter);

    const handleStatusChange = async (taskId: string, newStatus: string, newPosition: number) => {
        setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: newStatus as Task["status"], position: newPosition } : t)));
        try {
            await fetch(`/api/tasks/${taskId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: newStatus, position: newPosition }),
            });
        } catch (e) {
            console.error(e);
            toastError("Erreur", "Mise à jour impossible");
            loadTasks();
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

    const formatDate = (date: string) =>
        new Date(date).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
    const isOverdue = (d: string | null) => (d ? new Date(d) < new Date() : false);

    if (isLoading) return <LoadingState message="Chargement des tâches..." />;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                    <h1 className="text-2xl font-bold text-[var(--elan-ink)]">Mes tâches</h1>
                    <p className="text-sm text-[var(--elan-slate)] mt-1">
                        {tasks.length} tâche{tasks.length !== 1 ? "s" : ""} au total
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => handleAddTask()}
                        className="flex items-center gap-2 h-10 px-5 text-sm font-semibold text-[var(--elan-ink)] bg-[var(--elan-amber)] hover:bg-[#f29113] rounded-xl transition-colors shadow-sm"
                    >
                        <Plus className="w-4 h-4" />
                        Nouvelle tâche
                    </button>
                    <div className="flex items-center bg-[var(--elan-paper-2)] rounded-xl p-1 border border-[var(--elan-line)]">
                        {([["kanban", LayoutGrid, "Kanban"], ["list", List, "Liste"]] as const).map(([key, Icon, label]) => (
                            <button
                                key={key}
                                onClick={() => setView(key)}
                                className={cn(
                                    "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
                                    view === key ? "bg-[var(--elan-surface)] text-[var(--elan-ink)] shadow-sm" : "text-[var(--elan-slate)] hover:text-[var(--elan-ink)]"
                                )}
                            >
                                <Icon className="w-4 h-4" />
                                {label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Filters */}
            <TaskFilters onFiltersChange={setFilters} members={members} />

            {/* Kanban */}
            {view === "kanban" && (
                filteredKanban.length === 0 ? (
                    <EmptyState
                        icon={CheckSquare}
                        title="Aucune tâche"
                        description="Créez votre première tâche pour commencer"
                        action={
                            <button
                                onClick={() => handleAddTask()}
                                className="inline-flex items-center gap-2 h-10 px-5 text-sm font-semibold text-[var(--elan-ink)] bg-[var(--elan-amber)] hover:bg-[#f29113] rounded-xl transition-colors"
                            >
                                <Plus className="w-4 h-4" /> Nouvelle tâche
                            </button>
                        }
                    />
                ) : (
                    <KanbanBoard
                        tasks={filteredKanban as any}
                        onStatusChange={handleStatusChange}
                        onReorder={handleReorder}
                        onTaskClick={handleTaskClick}
                        onAddTask={handleAddTask}
                    />
                )
            )}

            {/* List */}
            {view === "list" && (
                <div className="bg-[var(--elan-surface)] border border-[var(--elan-line)] rounded-2xl overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[720px]">
                            <thead className="bg-[var(--elan-paper-2)] border-b border-[var(--elan-line)]">
                                <tr>
                                    {["Tâche", "Projet", "Statut", "Priorité", "Échéance", "Assigné"].map((h) => (
                                        <th key={h} className="text-left text-xs font-semibold text-[var(--elan-slate)] uppercase tracking-wider px-5 py-3.5">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--elan-line)]">
                                {filteredList.map((task) => (
                                    <tr
                                        key={task.id}
                                        onClick={() => handleTaskClick(task.id)}
                                        className="hover:bg-[var(--elan-paper-2)] transition-colors cursor-pointer"
                                    >
                                        <td className="px-5 py-3.5">
                                            <p className="text-sm font-medium text-[var(--elan-ink)]">{task.title}</p>
                                        </td>
                                        <td className="px-5 py-3.5"><span className="text-sm text-[var(--elan-slate)]">{task.project.name}</span></td>
                                        <td className="px-5 py-3.5">
                                            <span className="inline-flex items-center gap-1.5 text-sm text-[var(--elan-ink-soft)]">
                                                <span className={cn("w-1.5 h-1.5 rounded-full",
                                                    task.status === "DONE" ? "bg-emerald-500" : task.status === "IN_PROGRESS" ? "bg-blue-500" : task.status === "IN_REVIEW" ? "bg-amber-500" : "bg-slate-400")} />
                                                {STATUS_LABELS[task.status]}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3.5"><span className="text-sm text-[var(--elan-slate)]">{PRIORITY_LABELS[task.priority]}</span></td>
                                        <td className="px-5 py-3.5">
                                            {task.dueDate ? (
                                                <span className={cn("text-sm", isOverdue(task.dueDate) && task.status !== "DONE" ? "text-red-500 font-medium" : "text-[var(--elan-slate)]")}>
                                                    {formatDate(task.dueDate)}
                                                </span>
                                            ) : <span className="text-sm text-[var(--elan-ink-soft)]">—</span>}
                                        </td>
                                        <td className="px-5 py-3.5">
                                            {task.assignee ? (
                                                <div className="flex items-center gap-2">
                                                    <div className="w-7 h-7 rounded-full bg-[var(--elan-eucalyptus)] flex items-center justify-center text-xs font-bold text-[var(--elan-petrol)]">
                                                        {task.assignee.name.charAt(0).toUpperCase()}
                                                    </div>
                                                    <span className="text-sm text-[var(--elan-slate)]">{task.assignee.name}</span>
                                                </div>
                                            ) : <span className="text-sm text-[var(--elan-ink-soft)]">Non assigné</span>}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {filteredList.length === 0 && (
                        <div className="py-16 text-center">
                            <CheckSquare className="w-12 h-12 mx-auto mb-3 text-[var(--elan-paper-3)]" />
                            <p className="text-sm text-[var(--elan-slate)]">Aucune tâche</p>
                        </div>
                    )}
                </div>
            )}

            <NewTaskModal
                isOpen={showNewTaskModal}
                onClose={() => setShowNewTaskModal(false)}
                defaultStatus={newTaskStatus}
                onSuccess={() => { setShowNewTaskModal(false); loadTasks(); }}
            />

            <TaskDetailDrawer
                taskId={selectedTask}
                isOpen={showDrawer}
                onClose={() => { setShowDrawer(false); setSelectedTask(null); }}
                onUpdate={loadTasks}
                members={members}
            />
        </div>
    );
}
