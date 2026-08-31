"use client";

import { useEffect, useState } from "react";
import { Bug, Lightbulb, Paperclip, Zap, Link2, XCircle, CheckCircle2 } from "lucide-react";
import { Drawer, Select, Badge, useToast } from "@/components/ui";
import { cn } from "@/lib/utils";

interface TicketFile {
    id: string;
    originalName: string;
    url: string | null;
}

interface Ticket {
    id: string;
    type: "BUG" | "FEATURE_REQUEST";
    title: string;
    description: string;
    severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
    status: "NEW" | "IN_REVIEW" | "CONVERTED" | "FAST_LANE" | "DUPLICATE" | "REJECTED";
    sourceRoute: string;
    userAgent: string;
    viewport: string | null;
    reportedBy: { id: string; name: string; email: string; role: string };
    files: TicketFile[];
    createdAt: string;
    rejectionReason: string | null;
    convertedTask: { id: string; title: string } | null;
    linkedTask: { id: string; title: string } | null;
}

interface ProjectOption {
    id: string;
    name: string;
}

interface UserOption {
    id: string;
    name: string;
    role: string;
}

interface TaskOption {
    id: string;
    title: string;
}

interface TriageDetailDrawerProps {
    ticket: Ticket | null;
    onClose: () => void;
    onUpdated: (ticket: Ticket) => void;
}

const SEVERITY_VARIANT: Record<string, "default" | "warning" | "danger" | "success"> = {
    LOW: "default",
    MEDIUM: "warning",
    HIGH: "warning",
    CRITICAL: "danger",
};

const STATUS_LABEL: Record<string, string> = {
    NEW: "Nouveau",
    IN_REVIEW: "En revue",
    CONVERTED: "Converti",
    FAST_LANE: "Fast-Lane",
    DUPLICATE: "Doublon",
    REJECTED: "Rejeté",
};

type ActionKey = "convert" | "fast-lane" | "link" | "reject" | null;

export function TriageDetailDrawer({ ticket, onClose, onUpdated }: TriageDetailDrawerProps) {
    const { success, error: toastError } = useToast();
    const [activeAction, setActiveAction] = useState<ActionKey>(null);
    const [projects, setProjects] = useState<ProjectOption[]>([]);
    const [users, setUsers] = useState<UserOption[]>([]);
    const [tasks, setTasks] = useState<TaskOption[]>([]);
    const [submitting, setSubmitting] = useState(false);

    const [projectId, setProjectId] = useState("");
    const [assigneeId, setAssigneeId] = useState("");
    const [priority, setPriority] = useState("MEDIUM");
    const [linkedTaskId, setLinkedTaskId] = useState("");
    const [rejectionReason, setRejectionReason] = useState("");

    const isTriaged = ticket ? ticket.status !== "NEW" && ticket.status !== "IN_REVIEW" : false;

    useEffect(() => {
        if (!ticket) return;
        setActiveAction(null);
        setProjectId("");
        setAssigneeId("");
        setPriority("MEDIUM");
        setLinkedTaskId("");
        setRejectionReason("");

        void fetch("/api/projects?status=ACTIVE&limit=200")
            .then((res) => res.json())
            .then((json) => {
                if (json.success) {
                    setProjects(json.data.map((p: any) => ({ id: p.id, name: p.name })));
                }
            });

        // Any active user, any role — this org assigns tasks to managers and everyone else too.
        // /api/users returns a paginated shape: { data: { users, total, page, ... } }.
        void fetch("/api/users?status=active&excludeSelf=false&limit=500")
            .then((res) => res.json())
            .then((json) => {
                if (json.success) {
                    setUsers(json.data.users.map((u: any) => ({ id: u.id, name: u.name, role: u.role })));
                }
            });

        void fetch("/api/tasks?parentOnly=true")
            .then((res) => res.json())
            .then((json) => {
                if (json.success) {
                    setTasks(json.data.map((t: any) => ({ id: t.id, title: t.title })));
                }
            });
    }, [ticket?.id]);

    if (!ticket) return null;

    async function runAction(url: string, body: object, successMessage: string) {
        setSubmitting(true);
        try {
            const res = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });
            const json = await res.json();
            if (!res.ok || !json.success) {
                toastError("Action impossible", json.error || "Erreur serveur");
                return;
            }
            success(successMessage);
            onUpdated(json.data);
            setActiveAction(null);
        } catch {
            toastError("Erreur réseau", "Réessayez dans un instant.");
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <Drawer
            isOpen={!!ticket}
            onClose={onClose}
            title={ticket.title}
            description={`${ticket.type === "BUG" ? "Bug" : "Idée"} · signalé par ${ticket.reportedBy.name}`}
            size="lg"
        >
            <div className="space-y-5">
                <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={ticket.type === "BUG" ? "danger" : "primary"}>
                        {ticket.type === "BUG" ? <Bug className="w-3 h-3" /> : <Lightbulb className="w-3 h-3" />}
                        {ticket.type === "BUG" ? "Bug" : "Feature request"}
                    </Badge>
                    <Badge variant={SEVERITY_VARIANT[ticket.severity]}>{ticket.severity}</Badge>
                    <Badge variant="outline">{STATUS_LABEL[ticket.status]}</Badge>
                </div>

                <div>
                    <p className="text-[12px] font-semibold text-[#12122A] mb-1">Description</p>
                    <p className="text-[13px] text-[#5A5A7A] whitespace-pre-wrap">{ticket.description}</p>
                </div>

                <div className="grid grid-cols-2 gap-3 text-[12px]">
                    <div>
                        <p className="font-semibold text-[#12122A]">Route</p>
                        <p className="text-[#5A5A7A] truncate">{ticket.sourceRoute}</p>
                    </div>
                    <div>
                        <p className="font-semibold text-[#12122A]">Reporter</p>
                        <p className="text-[#5A5A7A] truncate">{ticket.reportedBy.email} ({ticket.reportedBy.role})</p>
                    </div>
                    <div>
                        <p className="font-semibold text-[#12122A]">Viewport</p>
                        <p className="text-[#5A5A7A]">{ticket.viewport || "—"}</p>
                    </div>
                    <div>
                        <p className="font-semibold text-[#12122A]">Navigateur</p>
                        <p className="text-[#5A5A7A] truncate" title={ticket.userAgent}>{ticket.userAgent}</p>
                    </div>
                </div>

                {ticket.files.length > 0 && (
                    <div>
                        <p className="text-[12px] font-semibold text-[#12122A] mb-2">Pièces jointes</p>
                        <ul className="space-y-1">
                            {ticket.files.map((file) => (
                                <li key={file.id}>
                                    <a
                                        href={file.url || "#"}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="inline-flex items-center gap-1.5 text-[12px] text-[#E07C00] hover:underline"
                                    >
                                        <Paperclip className="w-3 h-3" /> {file.originalName}
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {isTriaged ? (
                    <div className="rounded-xl border border-[#E8EBF0] bg-[#F9FAFB] p-3 text-[12px] text-[#5A5A7A]">
                        {ticket.status === "REJECTED" && (
                            <>Rejeté — motif : {ticket.rejectionReason}</>
                        )}
                        {(ticket.status === "CONVERTED" || ticket.status === "FAST_LANE") && ticket.convertedTask && (
                            <>Converti en tâche : {ticket.convertedTask.title}</>
                        )}
                        {ticket.status === "DUPLICATE" && ticket.linkedTask && (
                            <>Doublon de : {ticket.linkedTask.title}</>
                        )}
                    </div>
                ) : (
                    <div className="space-y-3 pt-2 border-t border-[#EEF1F6]">
                        <p className="text-[12px] font-semibold text-[#12122A]">Actions de triage</p>
                        <div className="grid grid-cols-2 gap-2">
                            <ActionButton
                                active={activeAction === "convert"}
                                icon={<CheckCircle2 className="w-4 h-4" />}
                                label="Convertir en tâche"
                                onClick={() => setActiveAction(activeAction === "convert" ? null : "convert")}
                            />
                            <ActionButton
                                active={activeAction === "fast-lane"}
                                icon={<Zap className="w-4 h-4" />}
                                label="Fast-Lane"
                                onClick={() => setActiveAction(activeAction === "fast-lane" ? null : "fast-lane")}
                            />
                            <ActionButton
                                active={activeAction === "link"}
                                icon={<Link2 className="w-4 h-4" />}
                                label="Lier à une tâche"
                                onClick={() => setActiveAction(activeAction === "link" ? null : "link")}
                            />
                            <ActionButton
                                active={activeAction === "reject"}
                                icon={<XCircle className="w-4 h-4" />}
                                label="Rejeter"
                                onClick={() => setActiveAction(activeAction === "reject" ? null : "reject")}
                            />
                        </div>

                        {(activeAction === "convert" || activeAction === "fast-lane") && (
                            <div className="space-y-3 rounded-xl border border-[#E8EBF0] p-3">
                                <Select
                                    label="Projet"
                                    options={projects.map((p) => ({ value: p.id, label: p.name }))}
                                    value={projectId}
                                    onChange={setProjectId}
                                    searchable
                                />
                                <Select
                                    label="Assigné à"
                                    options={users.map((u) => ({ value: u.id, label: `${u.name} (${u.role})` }))}
                                    value={assigneeId}
                                    onChange={setAssigneeId}
                                    searchable
                                />
                                {activeAction === "convert" && (
                                    <Select
                                        label="Priorité"
                                        options={[
                                            { value: "LOW", label: "Faible" },
                                            { value: "MEDIUM", label: "Moyenne" },
                                            { value: "HIGH", label: "Haute" },
                                            { value: "URGENT", label: "Urgente" },
                                        ]}
                                        value={priority}
                                        onChange={setPriority}
                                    />
                                )}
                                <button
                                    type="button"
                                    disabled={submitting || !projectId || !assigneeId}
                                    onClick={() =>
                                        activeAction === "convert"
                                            ? void runAction(
                                                  `/api/intake/${ticket.id}/convert`,
                                                  { projectId, assigneeId, priority },
                                                  "Ticket converti en tâche",
                                              )
                                            : void runAction(
                                                  `/api/intake/${ticket.id}/fast-lane`,
                                                  { projectId, assigneeId },
                                                  "Ticket dispatché en Fast-Lane",
                                              )
                                    }
                                    className="w-full h-9 rounded-lg bg-[#FF9E1B] text-[#15201E] border border-[#E07C00] text-[13px] font-semibold hover:bg-[#F09212] disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {submitting ? "Envoi..." : "Confirmer"}
                                </button>
                            </div>
                        )}

                        {activeAction === "link" && (
                            <div className="space-y-3 rounded-xl border border-[#E8EBF0] p-3">
                                <Select
                                    label="Tâche existante (doublon)"
                                    options={tasks.map((t) => ({ value: t.id, label: t.title }))}
                                    value={linkedTaskId}
                                    onChange={setLinkedTaskId}
                                    searchable
                                />
                                <button
                                    type="button"
                                    disabled={submitting || !linkedTaskId}
                                    onClick={() =>
                                        void runAction(
                                            `/api/intake/${ticket.id}/link`,
                                            { taskId: linkedTaskId },
                                            "Ticket marqué comme doublon",
                                        )
                                    }
                                    className="w-full h-9 rounded-lg bg-[#FF9E1B] text-[#15201E] border border-[#E07C00] text-[13px] font-semibold hover:bg-[#F09212] disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {submitting ? "Envoi..." : "Confirmer"}
                                </button>
                            </div>
                        )}

                        {activeAction === "reject" && (
                            <div className="space-y-3 rounded-xl border border-[#E8EBF0] p-3">
                                <textarea
                                    value={rejectionReason}
                                    onChange={(e) => setRejectionReason(e.target.value)}
                                    placeholder="Motif du rejet (requis)"
                                    className="w-full min-h-[80px] rounded-xl border border-[#E8EBF0] px-3 py-2.5 text-[13px] text-[#12122A] placeholder:text-[#8B8BA7] focus:outline-none focus:ring-2 focus:ring-[#FF9E1B]/25 focus:border-[#E07C00] resize-y"
                                />
                                <button
                                    type="button"
                                    disabled={submitting || !rejectionReason.trim()}
                                    onClick={() =>
                                        void runAction(
                                            `/api/intake/${ticket.id}/reject`,
                                            { rejectionReason },
                                            "Ticket rejeté",
                                        )
                                    }
                                    className="w-full h-9 rounded-lg bg-red-600 text-white text-[13px] font-semibold hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {submitting ? "Envoi..." : "Confirmer le rejet"}
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </Drawer>
    );
}

function ActionButton({
    active,
    icon,
    label,
    onClick,
}: {
    active: boolean;
    icon: React.ReactNode;
    label: string;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={cn(
                "flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-[12px] font-semibold transition-colors",
                active
                    ? "border-[#E07C00] bg-[#DBE4DF] text-[#12122A]"
                    : "border-[#E8EBF0] bg-white text-[#5A5A7A] hover:border-[#C5C8D4]",
            )}
        >
            {icon} {label}
        </button>
    );
}
