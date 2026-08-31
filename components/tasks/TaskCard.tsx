"use client";

import { cn } from "@/lib/utils";
import { Calendar, MessageSquare, GitBranch, Clock } from "lucide-react";

interface TaskCardProps {
    task: {
        id: string;
        title: string;
        status: string;
        priority: string;
        dueDate: string | null;
        assignee: { id: string; name: string } | null;
        labels: string[];
        subtasks?: { id: string; status: string }[];
        _count?: { comments: number; subtasks: number };
        estimatedHours?: number | null;
    };
    onClick?: () => void;
    isDragging?: boolean;
}

const PRIORITY_COLORS: Record<string, { line: string; soft: string; text: string }> = {
    URGENT: { line: "border-l-[#E5484D]", soft: "bg-[#FFF0F1]", text: "text-[#CF3D44]" },
    HIGH: { line: "border-l-[#F08B21]", soft: "bg-[#FFF4E9]", text: "text-[#C96808]" },
    MEDIUM: { line: "border-l-[#3381E8]", soft: "bg-[#EDF4FF]", text: "text-[#276BC8]" },
    LOW: { line: "border-l-[#9AA8B5]", soft: "bg-[#F1F4F6]", text: "text-[#647688]" },
};

const PRIORITY_LABELS: Record<string, string> = {
    URGENT: "Urgent",
    HIGH: "Haute",
    MEDIUM: "Moyenne",
    LOW: "Basse",
};

export function TaskCard({ task, onClick, isDragging }: TaskCardProps) {
    const isOverdue =
        task.dueDate &&
        new Date(task.dueDate) < new Date() &&
        task.status !== "DONE";

    const subtasksDone = task.subtasks?.filter((s) => s.status === "DONE").length || 0;
    const subtasksTotal = task.subtasks?.length || task._count?.subtasks || 0;
    const commentCount = task._count?.comments || 0;
    const priority = PRIORITY_COLORS[task.priority] ?? PRIORITY_COLORS.MEDIUM;

    return (
        <div
            onClick={onClick}
            className={cn(
                "group cursor-pointer rounded-lg border border-[#DDE4EA] border-l-[3px] bg-white p-3 transition-all duration-150",
                "hover:-translate-y-px hover:border-[#AFC7C2] hover:shadow-[0_7px_18px_rgba(15,46,43,0.08)]",
                priority.line,
                isDragging && "border-[#6FA69D] opacity-80 shadow-lg"
            )}
        >
            {/* Labels */}
            {task.labels.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2">
                    {task.labels.slice(0, 3).map((label) => (
                        <span
                            key={label}
                            className="rounded bg-[#EAF4F1] px-1.5 py-0.5 text-[9px] font-semibold text-[#17665C]"
                        >
                            {label}
                        </span>
                    ))}
                </div>
            )}

            {/* Title */}
            <div className="mb-2 flex items-start justify-between gap-2">
                <p className="line-clamp-2 text-[12px] font-bold leading-[1.4] text-[#203448]">{task.title}</p>
                <span className={cn("shrink-0 rounded px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-[0.06em]", priority.soft, priority.text)}>
                    {PRIORITY_LABELS[task.priority]}
                </span>
            </div>

            {/* Meta row */}
            <div className="flex items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2 text-[9px] font-medium text-[#65778A]">
                    {/* Due date */}
                    {task.dueDate && (
                        <span
                            className={cn(
                                "flex items-center gap-1",
                                isOverdue && "font-bold text-[#D43F46]"
                            )}
                        >
                            <Calendar className="w-3 h-3" />
                            {new Date(task.dueDate).toLocaleDateString("fr-FR", {
                                day: "numeric",
                                month: "short",
                            })}
                        </span>
                    )}

                    {/* Estimated hours */}
                    {task.estimatedHours && (
                        <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {task.estimatedHours}h
                        </span>
                    )}

                    {/* Subtasks */}
                    {subtasksTotal > 0 && (
                        <span className="flex items-center gap-1">
                            <GitBranch className="w-3 h-3" />
                            {subtasksDone}/{subtasksTotal}
                        </span>
                    )}

                    {/* Comments */}
                    {commentCount > 0 && (
                        <span className="flex items-center gap-1">
                            <MessageSquare className="w-3 h-3" />
                            {commentCount}
                        </span>
                    )}
                </div>

                {/* Assignee avatar */}
                {task.assignee && (
                    <div
                        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#E7F3F0] text-[9px] font-bold text-[#0B5A51]"
                        title={task.assignee.name}
                    >
                        {task.assignee.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .slice(0, 2)
                            .toUpperCase()}
                    </div>
                )}
            </div>

            {/* Subtask progress bar */}
            {subtasksTotal > 0 && (
                <div className="mt-2 h-1 overflow-hidden rounded-full bg-[#E7ECEF]">
                    <div
                        className="h-full rounded-full bg-[#12A765] transition-all"
                        style={{ width: `${(subtasksDone / subtasksTotal) * 100}%` }}
                    />
                </div>
            )}
        </div>
    );
}
