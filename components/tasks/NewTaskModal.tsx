"use client";

import { useState, useEffect } from "react";
import { Loader2, Sparkles, Plus, X, AlertTriangle, CheckCircle2, CalendarOff, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Modal, ModalFooter } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { AiOrganizationProposal, type OrganizationProposal } from "@/components/tasks/AiOrganizationProposal";
import type { AvailabilityCheck } from "@/lib/availability";

interface NewTaskModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (task: unknown) => void;
    defaultProjectId?: string;
    lockProject?: boolean;
    defaultStatus?: string;
    members?: { id: string; name: string }[];
}

interface ProjectMemberResponse {
    user: { id: string; name: string };
}

interface TaskCreatePayload {
    projectId: string;
    title: string;
    description: string | null;
    priority: string;
    dueDate: string | null;
    startDate: string | null;
    assigneeId: string | null;
    estimatedHours: string | null;
    labels: string[];
    status?: string;
}

const PRIORITY_OPTIONS = [
    { value: "LOW", label: "Basse", color: "bg-slate-100 text-slate-600 border-slate-200" },
    { value: "MEDIUM", label: "Moyenne", color: "bg-blue-50 text-blue-700 border-blue-200" },
    { value: "HIGH", label: "Haute", color: "bg-orange-50 text-orange-700 border-orange-200" },
    { value: "URGENT", label: "Urgent", color: "bg-red-50 text-red-700 border-red-200" },
];

export function NewTaskModal({
    isOpen,
    onClose,
    onSuccess,
    defaultProjectId = "",
    lockProject = false,
    defaultStatus,
    members: propMembers,
}: NewTaskModalProps) {
    const { error: showError } = useToast();
    const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
    const [members, setMembers] = useState<{ id: string; name: string }[]>(propMembers || []);
    const [isLoading, setIsLoading] = useState(false);
    const [aiLoading, setAiLoading] = useState(false);
    const [organizationProposal, setOrganizationProposal] = useState<OrganizationProposal | null>(null);
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [labelInput, setLabelInput] = useState("");
    const [availCheck, setAvailCheck] = useState<(AvailabilityCheck & { userName?: string }) | null>(null);
    const [availLoading, setAvailLoading] = useState(false);
    const [overrideBooking, setOverrideBooking] = useState(false);

    const [form, setForm] = useState({
        title: "",
        description: "",
        projectId: defaultProjectId,
        priority: "MEDIUM",
        dueDate: "",
        startDate: "",
        assigneeId: "",
        estimatedHours: "",
        labels: [] as string[],
    });

    useEffect(() => {
        if (isOpen) {
            setForm((prev) => ({
                ...prev,
                projectId: defaultProjectId || prev.projectId,
                title: "",
                description: "",
                priority: "MEDIUM",
                dueDate: "",
                startDate: "",
                assigneeId: "",
                estimatedHours: "",
                labels: [],
            }));
            setShowAdvanced(false);
            setLabelInput("");
            setOrganizationProposal(null);

            if (!lockProject) {
                fetch("/api/projects")
                    .then((res) => res.json())
                    .then((json) => {
                        if (json.success) setProjects(json.data);
                    })
                    .catch(console.error);
            }
        }
    }, [isOpen, defaultProjectId, lockProject]);

    // Load members when project changes
    useEffect(() => {
        if (propMembers) {
            setMembers(propMembers);
            return;
        }
        if (form.projectId) {
            fetch(`/api/projects/${form.projectId}`)
                .then((res) => res.json())
                .then((json) => {
                    if (json.success && json.data?.members) {
                        setMembers(
                            (json.data.members as ProjectMemberResponse[]).map((m) => ({
                                id: m.user.id,
                                name: m.user.name,
                            }))
                        );
                    }
                })
                .catch(console.error);
        }
    }, [form.projectId, propMembers]);

    // Block-booking: check assignee availability when assignee + due date are set
    useEffect(() => {
        setOverrideBooking(false);
        if (!form.assigneeId || !form.dueDate) {
            setAvailCheck(null);
            return;
        }
        let cancelled = false;
        setAvailLoading(true);
        const handle = setTimeout(() => {
            fetch("/api/availability/check", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    userId: form.assigneeId,
                    date: form.dueDate,
                    addedHours: form.estimatedHours ? Number(form.estimatedHours) : 2,
                }),
            })
                .then((res) => res.json())
                .then((json) => { if (!cancelled && json.success) setAvailCheck(json.data); })
                .catch(() => { if (!cancelled) setAvailCheck(null); })
                .finally(() => { if (!cancelled) setAvailLoading(false); });
        }, 350);
        return () => { cancelled = true; clearTimeout(handle); };
    }, [form.assigneeId, form.dueDate, form.estimatedHours]);

    const isBlocked = availCheck && (availCheck.status === "off" || availCheck.status === "overbooked") && !overrideBooking;

    const handleSubmit = async (proposal?: OrganizationProposal) => {
        if (!form.title.trim() || !form.projectId) return;
        if (isBlocked) return;

        setIsLoading(true);
        try {
            const proposedItem = proposal?.item;
            const payload: TaskCreatePayload = {
                projectId: form.projectId,
                title: (proposedItem?.title || form.title).trim(),
                description: (proposedItem?.description || form.description).trim() || null,
                priority: proposedItem?.priority || form.priority,
                dueDate: form.dueDate || null,
                startDate: form.startDate || null,
                assigneeId: form.assigneeId || null,
                estimatedHours: proposedItem?.estimatedHours?.toString() || form.estimatedHours || null,
                labels: proposedItem?.labels || form.labels,
            };

            if (defaultStatus) {
                payload.status = defaultStatus;
            }

            const res = await fetch("/api/tasks", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            const json = await res.json();
            if (!res.ok || !json.success) throw new Error(json.error || "Impossible de créer la tâche.");
            for (const child of proposal?.children || []) {
                await fetch(`/api/tasks/${json.data.id}/subtasks`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ title: child.title, description: child.description, priority: child.priority, estimatedHours: child.estimatedHours }),
                });
            }
            onSuccess(json.data);
            onClose();
        } catch (error) {
            console.error("Failed to create task:", error);
            showError("Création impossible", error instanceof Error ? error.message : "Une erreur est survenue.");
        } finally {
            setIsLoading(false);
        }
    };

    const addLabel = () => {
        const val = labelInput.trim();
        if (val && !form.labels.includes(val)) {
            setForm({ ...form, labels: [...form.labels, val] });
        }
        setLabelInput("");
    };

    const removeLabel = (label: string) => {
        setForm({ ...form, labels: form.labels.filter((l) => l !== label) });
    };

    const requestOrganization = async () => {
        if (!form.title.trim()) return;
        setAiLoading(true);
        try {
            const project = projects.find((p) => p.id === form.projectId);
            const res = await fetch("/api/ai/mistral/organize-work", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title: form.title,
                    description: form.description,
                    kind: "TASK",
                    projectName: project?.name || "",
                    existingItems: [],
                }),
            });
            const json = await res.json();
            if (!res.ok || !json.success) throw new Error(json.error || "Organisation indisponible");
            setOrganizationProposal(json.data);
        } catch (error) {
            showError("Organisation IA indisponible", error instanceof Error ? error.message : "Réessayez dans un instant.");
        } finally {
            setAiLoading(false);
        }
    };

    const applyProposalToForm = () => {
        const item = organizationProposal?.item;
        if (!item) return;
        setForm((current) => ({ ...current, title: item.title || current.title, description: item.description || current.description, priority: item.priority || current.priority, labels: item.labels || current.labels, estimatedHours: item.estimatedHours?.toString() || current.estimatedHours }));
        setShowAdvanced(true);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Nouvelle tâche" size="lg">
            <div className="space-y-4">
                {/* Title + AI Enhance */}
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Titre *</label>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={form.title}
                            onChange={(e) => setForm({ ...form, title: e.target.value })}
                            className="h-10 flex-1 rounded-lg border border-[#DDE4EA] px-3 text-sm outline-none focus:border-[#5D9C92] focus:ring-2 focus:ring-[#0B5A51]/10"
                            placeholder="Titre de la tâche"
                            autoFocus
                        />
                        <button
                            onClick={requestOrganization}
                            disabled={!form.title.trim() || aiLoading}
                            className="flex h-10 items-center gap-1.5 whitespace-nowrap rounded-lg border border-[#B9D4CE] bg-[#EAF5F2] px-3 text-sm font-medium text-[#0B5A51] transition-colors hover:bg-[#DDEEEA] disabled:opacity-50"
                            title="Organiser avec Mistral"
                        >
                            {aiLoading ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Sparkles className="w-4 h-4" />
                            )}
                            Organiser
                        </button>
                    </div>
                </div>

                {organizationProposal && <AiOrganizationProposal
                    proposal={organizationProposal}
                    onAccept={() => { applyProposalToForm(); handleSubmit(organizationProposal); }}
                    onEdit={() => { applyProposalToForm(); setOrganizationProposal(null); }}
                    onReject={() => setOrganizationProposal(null)}
                    accepting={isLoading}
                />}

                {/* Project selector */}
                {!lockProject && (
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Projet *</label>
                        <select
                            value={form.projectId}
                            onChange={(e) => setForm({ ...form, projectId: e.target.value })}
                            className="h-10 w-full rounded-lg border border-[#DDE4EA] bg-white px-3 text-sm outline-none focus:border-[#5D9C92]"
                        >
                            <option value="">Sélectionner un projet</option>
                            {projects.map((p) => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </select>
                    </div>
                )}

                {/* Assignee */}
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Assigné à</label>
                    <select
                        value={form.assigneeId}
                        onChange={(e) => setForm({ ...form, assigneeId: e.target.value })}
                        className="h-10 w-full rounded-lg border border-[#DDE4EA] bg-white px-3 text-sm outline-none focus:border-[#5D9C92]"
                    >
                        <option value="">Non assigné</option>
                        {members.map((m) => (
                            <option key={m.id} value={m.id}>{m.name}</option>
                        ))}
                    </select>
                </div>

                {/* Priority */}
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Priorité</label>
                    <div className="flex gap-2">
                        {PRIORITY_OPTIONS.map((p) => (
                            <button
                                key={p.value}
                                onClick={() => setForm({ ...form, priority: p.value })}
                                className={cn(
                                    "px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors",
                                    form.priority === p.value ? p.color : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
                                )}
                            >
                                {p.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Due date */}
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Échéance</label>
                    <input
                        type="date"
                        value={form.dueDate}
                        onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                        className="h-10 w-full rounded-lg border border-[#DDE4EA] px-3 text-sm outline-none focus:border-[#5D9C92]"
                    />

                    {/* Block-booking availability banner */}
                    {form.assigneeId && form.dueDate && (
                        <div className="mt-2">
                            {availLoading ? (
                                <div className="flex items-center gap-2 text-xs text-slate-400">
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Vérification de la disponibilité...
                                </div>
                            ) : availCheck ? (
                                <AvailabilityBanner
                                    check={availCheck}
                                    override={overrideBooking}
                                    onOverride={() => setOverrideBooking(true)}
                                />
                            ) : null}
                        </div>
                    )}
                </div>

                {/* Description */}
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                    <textarea
                        value={form.description}
                        onChange={(e) => setForm({ ...form, description: e.target.value })}
                        rows={3}
                        className="w-full resize-none rounded-lg border border-[#DDE4EA] px-3 py-2 text-sm outline-none focus:border-[#5D9C92]"
                        placeholder="Description détaillée..."
                    />
                </div>

                {/* Toggle advanced */}
                <button
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="text-sm font-medium text-[#0B5A51] hover:text-[#063E39]"
                >
                    {showAdvanced ? "Masquer les options avancées" : "Options avancées"}
                </button>

                {/* Advanced fields */}
                {showAdvanced && (
                    <div className="space-y-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
                        {/* Start date */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Date de début</label>
                            <input
                                type="date"
                                value={form.startDate}
                                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                                className="h-10 w-full rounded-lg border border-[#DDE4EA] bg-white px-3 text-sm outline-none focus:border-[#5D9C92]"
                            />
                        </div>

                        {/* Estimated hours */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Estimation (heures)</label>
                            <input
                                type="number"
                                step="0.5"
                                min="0"
                                value={form.estimatedHours}
                                onChange={(e) => setForm({ ...form, estimatedHours: e.target.value })}
                                className="h-10 w-full rounded-lg border border-[#DDE4EA] bg-white px-3 text-sm outline-none focus:border-[#5D9C92]"
                                placeholder="Ex: 4"
                            />
                        </div>

                        {/* Labels */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Labels</label>
                            <div className="flex flex-wrap gap-1 mb-2">
                                {form.labels.map((l) => (
                                    <span key={l} className="flex items-center gap-1 rounded-md bg-[#EAF5F2] px-2 py-0.5 text-xs text-[#0B5A51]">
                                        {l}
                                        <button onClick={() => removeLabel(l)}>
                                            <X className="w-3 h-3" />
                                        </button>
                                    </span>
                                ))}
                            </div>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={labelInput}
                                    onChange={(e) => setLabelInput(e.target.value)}
                                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addLabel())}
                                    className="flex-1 rounded-lg border border-[#DDE4EA] bg-white px-3 py-1.5 text-sm outline-none focus:border-[#5D9C92]"
                                    placeholder="Ajouter un label..."
                                />
                                <button
                                    onClick={addLabel}
                                    className="rounded-lg px-2 py-1.5 text-slate-500 hover:bg-[#EAF5F2] hover:text-[#0B5A51]"
                                >
                                    <Plus className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <ModalFooter>
                <button
                    onClick={onClose}
                    className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded-lg transition-colors"
                >
                    Annuler
                </button>
                <button
                    onClick={() => handleSubmit()}
                    disabled={!form.title.trim() || !form.projectId || isLoading || !!isBlocked}
                    title={isBlocked ? "Membre indisponible : confirmez la réservation forcée pour continuer" : undefined}
                    className="flex items-center gap-2 rounded-lg bg-[#084C45] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#063E39] disabled:cursor-not-allowed disabled:opacity-50"
                >
                    {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                    Créer
                </button>
            </ModalFooter>
        </Modal>
    );
}

// ============================================
// AVAILABILITY BANNER (block-booking feedback)
// ============================================

function AvailabilityBanner({
    check,
    override,
    onOverride,
}: {
    check: AvailabilityCheck & { userName?: string; conflictingTasks?: { id: string; title: string; hours: number }[] };
    override: boolean;
    onOverride: () => void;
}) {
    const STYLE: Record<string, { bg: string; border: string; text: string; icon: React.ReactNode }> = {
        available: { bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-700", icon: <CheckCircle2 className="w-4 h-4" /> },
        tight: { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700", icon: <Clock className="w-4 h-4" /> },
        overbooked: { bg: "bg-red-50", border: "border-red-200", text: "text-red-700", icon: <AlertTriangle className="w-4 h-4" /> },
        off: { bg: "bg-red-50", border: "border-red-200", text: "text-red-700", icon: <CalendarOff className="w-4 h-4" /> },
    };
    const s = STYLE[check.status] || STYLE.available;
    const blocking = (check.status === "off" || check.status === "overbooked") && !override;

    return (
        <div className={cn("rounded-lg border px-3 py-2 text-xs", s.bg, s.border, s.text)}>
            <div className="flex items-start gap-2">
                <span className="mt-0.5 flex-shrink-0">{s.icon}</span>
                <div className="flex-1 min-w-0">
                    <p className="font-semibold">{check.message}</p>
                    {check.conflictingTasks && check.conflictingTasks.length > 0 && (
                        <p className="mt-0.5 opacity-80">
                            {check.conflictingTasks.length} tâche{check.conflictingTasks.length > 1 ? "s" : ""} déjà prévue{check.conflictingTasks.length > 1 ? "s" : ""} ce jour
                        </p>
                    )}
                    {blocking && (
                        <button
                            type="button"
                            onClick={onOverride}
                            className="mt-1.5 font-semibold underline hover:no-underline"
                        >
                            Réserver quand même
                        </button>
                    )}
                    {override && (check.status === "off" || check.status === "overbooked") && (
                        <p className="mt-1 font-medium opacity-90">⚠ Réservation forcée activée</p>
                    )}
                </div>
            </div>
        </div>
    );
}
