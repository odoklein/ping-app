"use client";

import { useState, useEffect } from "react";
import { Loader2, Plus, Trash2, CalendarOff, Clock } from "lucide-react";
import { Modal, ModalFooter, useToast } from "@/components/ui";
import { DEFAULT_AVAILABILITY, type UserAvailability, type TimeOffBlock } from "@/lib/availability";
import { cn } from "@/lib/utils";

const WEEKDAYS: { key: string; label: string }[] = [
    { key: "1", label: "Lundi" },
    { key: "2", label: "Mardi" },
    { key: "3", label: "Mercredi" },
    { key: "4", label: "Jeudi" },
    { key: "5", label: "Vendredi" },
    { key: "6", label: "Samedi" },
    { key: "7", label: "Dimanche" },
];

interface AvailabilityEditorProps {
    isOpen: boolean;
    onClose: () => void;
    onSaved?: (availability: UserAvailability) => void;
}

export function AvailabilityEditor({ isOpen, onClose, onSaved }: AvailabilityEditorProps) {
    const { success: toastSuccess, error: toastError } = useToast();
    const [availability, setAvailability] = useState<UserAvailability>({ ...DEFAULT_AVAILABILITY });
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [newOff, setNewOff] = useState<{ from: string; to: string; reason: string }>({ from: "", to: "", reason: "" });

    useEffect(() => {
        if (!isOpen) return;
        setLoading(true);
        fetch("/api/user/availability")
            .then((res) => res.json())
            .then((json) => { if (json.success) setAvailability(json.data); })
            .catch(() => toastError("Erreur", "Impossible de charger vos disponibilités"))
            .finally(() => setLoading(false));
    }, [isOpen]);

    const setHours = (key: string, value: number) => {
        setAvailability((prev) => ({
            ...prev,
            weeklyHours: { ...prev.weeklyHours, [key]: Math.max(0, Math.min(24, value)) },
        }));
    };

    const addTimeOff = () => {
        if (!newOff.from || !newOff.to || newOff.from > newOff.to) {
            toastError("Dates invalides", "Vérifiez la période d'absence");
            return;
        }
        const block: TimeOffBlock = {
            id: crypto.randomUUID(),
            from: newOff.from,
            to: newOff.to,
            reason: newOff.reason.trim() || undefined,
        };
        setAvailability((prev) => ({ ...prev, timeOff: [...prev.timeOff, block].sort((a, b) => a.from.localeCompare(b.from)) }));
        setNewOff({ from: "", to: "", reason: "" });
    };

    const removeTimeOff = (id: string) => {
        setAvailability((prev) => ({ ...prev, timeOff: prev.timeOff.filter((b) => b.id !== id) }));
    };

    const totalWeekly = WEEKDAYS.reduce((sum, d) => sum + (availability.weeklyHours[d.key] || 0), 0);

    const handleSave = async () => {
        setSaving(true);
        try {
            const res = await fetch("/api/user/availability", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(availability),
            });
            const json = await res.json();
            if (json.success) {
                toastSuccess("Disponibilités enregistrées", `${totalWeekly}h / semaine`);
                onSaved?.(json.data);
                onClose();
            } else {
                toastError("Erreur", json.error || "Enregistrement impossible");
            }
        } catch {
            toastError("Erreur", "Enregistrement impossible");
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Mes disponibilités" description="Définissez vos heures de travail et vos absences" size="lg">
            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin text-[var(--elan-petrol)]" />
                </div>
            ) : (
                <div className="space-y-6">
                    {/* Weekly hours */}
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="flex items-center gap-2 text-sm font-semibold text-[var(--elan-ink)]">
                                <Clock className="w-4 h-4 text-[var(--elan-petrol)]" /> Heures hebdomadaires
                            </h3>
                            <span className="text-xs font-mono font-bold text-[var(--elan-petrol)] bg-[var(--elan-eucalyptus)] px-2 py-0.5 rounded-full">
                                {totalWeekly}h / semaine
                            </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {WEEKDAYS.map((d) => {
                                const val = availability.weeklyHours[d.key] || 0;
                                const isWeekend = d.key === "6" || d.key === "7";
                                return (
                                    <div key={d.key} className={cn(
                                        "flex items-center justify-between gap-3 px-3 py-2 rounded-xl border",
                                        val > 0 ? "bg-[var(--elan-surface)] border-[var(--elan-line)]" : "bg-[var(--elan-paper-2)] border-transparent"
                                    )}>
                                        <span className={cn("text-sm font-medium", isWeekend ? "text-[var(--elan-slate)]" : "text-[var(--elan-ink)]")}>{d.label}</span>
                                        <div className="flex items-center gap-1.5">
                                            <input
                                                type="number"
                                                min={0}
                                                max={24}
                                                step={0.5}
                                                value={val}
                                                onChange={(e) => setHours(d.key, Number(e.target.value))}
                                                className="w-16 px-2 py-1 text-sm text-right border border-[var(--elan-line)] rounded-lg bg-[var(--elan-surface)] text-[var(--elan-ink)] focus:outline-none focus:border-[var(--elan-petrol)]"
                                            />
                                            <span className="text-xs text-[var(--elan-slate)]">h</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Time off */}
                    <div>
                        <h3 className="flex items-center gap-2 text-sm font-semibold text-[var(--elan-ink)] mb-3">
                            <CalendarOff className="w-4 h-4 text-[var(--elan-petrol)]" /> Absences & congés
                        </h3>

                        {availability.timeOff.length > 0 && (
                            <div className="space-y-2 mb-3">
                                {availability.timeOff.map((b) => (
                                    <div key={b.id} className="flex items-center justify-between gap-3 px-3 py-2 rounded-xl bg-red-50 border border-red-100">
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium text-red-700">
                                                {new Date(b.from).toLocaleDateString("fr-FR")} → {new Date(b.to).toLocaleDateString("fr-FR")}
                                            </p>
                                            {b.reason && <p className="text-xs text-red-500 truncate">{b.reason}</p>}
                                        </div>
                                        <button onClick={() => removeTimeOff(b.id)} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-100 rounded-lg transition-colors">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-2 p-3 rounded-xl bg-[var(--elan-paper-2)] border border-[var(--elan-line)]">
                            <div className="flex-1">
                                <label className="block text-xs font-medium text-[var(--elan-slate)] mb-1">Du</label>
                                <input type="date" value={newOff.from} onChange={(e) => setNewOff({ ...newOff, from: e.target.value })}
                                    className="w-full px-2.5 py-1.5 text-sm border border-[var(--elan-line)] rounded-lg bg-[var(--elan-surface)] text-[var(--elan-ink)] focus:outline-none focus:border-[var(--elan-petrol)]" />
                            </div>
                            <div className="flex-1">
                                <label className="block text-xs font-medium text-[var(--elan-slate)] mb-1">Au</label>
                                <input type="date" value={newOff.to} min={newOff.from} onChange={(e) => setNewOff({ ...newOff, to: e.target.value })}
                                    className="w-full px-2.5 py-1.5 text-sm border border-[var(--elan-line)] rounded-lg bg-[var(--elan-surface)] text-[var(--elan-ink)] focus:outline-none focus:border-[var(--elan-petrol)]" />
                            </div>
                            <div className="flex-1">
                                <label className="block text-xs font-medium text-[var(--elan-slate)] mb-1">Motif (optionnel)</label>
                                <input type="text" value={newOff.reason} placeholder="Congés..." onChange={(e) => setNewOff({ ...newOff, reason: e.target.value })}
                                    className="w-full px-2.5 py-1.5 text-sm border border-[var(--elan-line)] rounded-lg bg-[var(--elan-surface)] text-[var(--elan-ink)] focus:outline-none focus:border-[var(--elan-petrol)]" />
                            </div>
                            <button onClick={addTimeOff}
                                className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-sm font-medium text-[var(--elan-petrol)] bg-[var(--elan-eucalyptus)] hover:bg-[var(--elan-eucalyptus)]/70 rounded-lg transition-colors whitespace-nowrap">
                                <Plus className="w-4 h-4" /> Ajouter
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <ModalFooter>
                <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-[var(--elan-slate)] hover:text-[var(--elan-ink)] hover:bg-[var(--elan-paper-2)] rounded-lg transition-colors">
                    Annuler
                </button>
                <button onClick={handleSave} disabled={saving || loading}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-[var(--elan-ink)] bg-[var(--elan-amber)] hover:bg-[#f29113] rounded-lg transition-colors disabled:opacity-50">
                    {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                    Enregistrer
                </button>
            </ModalFooter>
        </Modal>
    );
}

export default AvailabilityEditor;
