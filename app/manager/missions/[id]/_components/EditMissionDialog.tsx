"use client";

import { useState, useEffect } from "react";
import { useToast } from "@/components/ui";
import { Save, Loader2, X, Building2, Phone, Mail, Linkedin, Calendar, Check, AlertCircle } from "lucide-react";
import { MISSION_STATUS_TABS } from "@/lib/constants/missionStatus";
import type { MissionStatusValue } from "@/lib/constants/missionStatus";
import { cn } from "@/lib/utils";

interface Client {
    id: string;
    name: string;
}

interface MissionData {
    id: string;
    name: string;
    objective?: string;
    channel: "CALL" | "EMAIL" | "LINKEDIN";
    channels?: ("CALL" | "EMAIL" | "LINKEDIN")[];
    status: MissionStatusValue;
    startDate?: string;
    endDate?: string;
    client?: { id: string; name: string };
}

interface FormData {
    name: string;
    objective: string;
    channel: string;
    channels: string[];
    clientId: string;
    startDate: string;
    endDate: string;
    status: MissionStatusValue;
}

interface EditMissionDialogProps {
    isOpen: boolean;
    onClose: () => void;
    mission: MissionData | null;
    onSaved: () => void;
}

const CHANNELS = [
    { value: "CALL", label: "📞 Appel téléphonique", color: "blue" },
    { value: "EMAIL", label: "📧 Email", color: "violet" },
    { value: "LINKEDIN", label: "💼 LinkedIn", color: "sky" },
];

export function EditMissionDialog({ isOpen, onClose, mission, onSaved }: EditMissionDialogProps) {
    const { success, error: showError } = useToast();
    const [clients, setClients] = useState<Client[]>([]);
    const [isLoadingClients, setIsLoadingClients] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [formData, setFormData] = useState<FormData>({
        name: "",
        objective: "",
        channel: "CALL",
        channels: ["CALL"],
        clientId: "",
        startDate: "",
        endDate: "",
        status: "DRAFT",
    });
    const [errors, setErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        if (isOpen && mission) {
            const channels = mission.channels?.length ? mission.channels : [mission.channel || "CALL"];
            setFormData({
                name: mission.name || "",
                objective: mission.objective || "",
                channel: channels[0] || "CALL",
                channels: [...channels],
                clientId: mission.client?.id || "",
                startDate: mission.startDate ? mission.startDate.toString().split("T")[0] : "",
                endDate: mission.endDate ? mission.endDate.toString().split("T")[0] : "",
                status: mission.status ?? "ACTIVE",
            });
            setErrors({});
        }
    }, [isOpen, mission]);

    useEffect(() => {
        if (isOpen) {
            setIsLoadingClients(true);
            fetch("/api/clients")
                .then((res) => res.json())
                .then((json) => {
                    if (json.success) setClients(json.data || []);
                })
                .finally(() => setIsLoadingClients(false));
        }
    }, [isOpen]);

    const validate = (): boolean => {
        const newErrors: Record<string, string> = {};
        if (!formData.name.trim()) newErrors.name = "Le nom est requis";
        if (!formData.clientId) newErrors.clientId = "Le client est requis";
        if (!formData.channels?.length) newErrors.channels = "Sélectionnez au moins un canal";
        if (formData.startDate && formData.endDate && new Date(formData.endDate) < new Date(formData.startDate)) {
            newErrors.endDate = "La date de fin doit être après la date de début";
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!mission || !validate()) return;
        setIsSaving(true);
        try {
            const res = await fetch(`/api/missions/${mission.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: formData.name,
                    objective: formData.objective || null,
                    channel: formData.channels[0] ?? formData.channel,
                    channels: formData.channels,
                    clientId: formData.clientId,
                    startDate: formData.startDate || null,
                    endDate: formData.endDate || null,
                    status: formData.status,
                }),
            });
            const json = await res.json();
            if (json.success) {
                success("Mission modifiée", `${formData.name} a été mise à jour`);
                onSaved();
                onClose();
            } else {
                showError("Erreur", json.error || "Impossible de modifier la mission");
            }
        } catch {
            showError("Erreur", "Impossible de modifier la mission");
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen || !mission) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop - Soft focus without darkening the entire screen */}
            <div
                className="absolute inset-0 bg-slate-900/20 backdrop-blur-[2px] transition-opacity"
                onClick={onClose}
            />

            {/* Dialog Container with #FCFAFF soft background */}
            <div className="relative w-full max-w-2xl max-h-[92vh] flex flex-col bg-[#FCFAFF] rounded-3xl shadow-2xl shadow-slate-900/10 overflow-hidden border border-slate-200/80 animate-in fade-in zoom-in-95 duration-200">
                
                {/* ── Top Header ── */}
                <div className="relative overflow-hidden bg-gradient-to-br from-[#0B0F19] via-[#0D1527] to-[#04060A] px-6 sm:px-8 py-5 border-b border-slate-800 flex-shrink-0">
                    <div className="relative z-10 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-[#2890F8]/20 border border-[#2890F8]/30 flex items-center justify-center text-[#2890F8] shadow-md shadow-blue-500/20">
                                <Building2 className="w-5 h-5" />
                            </div>
                            <div>
                                <h2 className="text-lg font-black text-white tracking-tight">
                                    Modifier la Mission
                                </h2>
                                <p className="text-xs text-slate-400 mt-0.5">
                                    {formData.name || "Configuration générale de la mission"}
                                </p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={onClose}
                            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors text-white/70 hover:text-white"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* ── Form Body ── */}
                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-5">
                    
                    {/* Client & Name */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1.5">
                                Compte Client <span className="text-red-500">*</span>
                            </label>
                            {isLoadingClients ? (
                                <div className="h-11 bg-slate-100 rounded-xl animate-pulse" />
                            ) : (
                                <select
                                    value={formData.clientId}
                                    onChange={(e) => setFormData((prev) => ({ ...prev, clientId: e.target.value }))}
                                    className="w-full h-11 px-3.5 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#2890F8] cursor-pointer"
                                >
                                    <option value="">Sélectionner un client...</option>
                                    {clients.map((c) => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                            )}
                            {errors.clientId && <p className="text-[11px] text-red-500 font-semibold mt-1">{errors.clientId}</p>}
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1.5">
                                Nom de la mission <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                                placeholder="Ex: Prospection SaaS Q1 2026"
                                className={cn(
                                    "w-full h-11 px-3.5 border rounded-xl text-xs font-medium text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#2890F8]",
                                    errors.name ? "border-red-400 bg-red-50/20" : "border-slate-200"
                                )}
                            />
                            {errors.name && <p className="text-[11px] text-red-500 font-semibold mt-1">{errors.name}</p>}
                        </div>
                    </div>

                    {/* Objective */}
                    <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">Objectif</label>
                        <textarea
                            value={formData.objective}
                            onChange={(e) => setFormData((prev) => ({ ...prev, objective: e.target.value }))}
                            placeholder="Ex: Générer 50 rendez-vous qualifiés..."
                            rows={2}
                            className="w-full p-3.5 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#2890F8] resize-none"
                        />
                    </div>

                    {/* Channels */}
                    <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">
                            Canaux activés <span className="text-red-500">*</span>
                        </label>
                        <div className="flex flex-wrap gap-2.5">
                            {CHANNELS.map((opt) => {
                                const isSelected = formData.channels.includes(opt.value);
                                return (
                                    <button
                                        type="button"
                                        key={opt.value}
                                        onClick={() => {
                                            const next = isSelected
                                                ? formData.channels.filter((c) => c !== opt.value)
                                                : [...formData.channels, opt.value];
                                            if (next.length === 0) return;
                                            setFormData((prev) => ({
                                                ...prev,
                                                channels: next,
                                                channel: next[0],
                                            }));
                                        }}
                                        className={cn(
                                            "flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs font-bold transition-all",
                                            isSelected
                                                ? "border-[#2890F8] bg-blue-50 text-blue-800 shadow-2xs"
                                                : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                                        )}
                                    >
                                        <div className={cn(
                                            "w-4 h-4 rounded-md flex items-center justify-center text-white",
                                            isSelected ? "bg-[#2890F8]" : "bg-slate-200"
                                        )}>
                                            {isSelected && <Check className="w-3 h-3" />}
                                        </div>
                                        {opt.label}
                                    </button>
                                );
                            })}
                        </div>
                        {errors.channels && <p className="text-[11px] text-red-500 font-semibold mt-1">{errors.channels}</p>}
                    </div>

                    {/* Status */}
                    <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">Statut de la mission</label>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {[
                                { val: "ACTIVE", label: "🟢 Active" },
                                { val: "PAUSED", label: "🟡 En pause" },
                                { val: "DRAFT", label: "⚪ Brouillon" },
                                { val: "COMPLETED", label: "🟣 Terminée" },
                            ].map(s => (
                                <button
                                    type="button"
                                    key={s.val}
                                    onClick={() => setFormData(prev => ({ ...prev, status: s.val as MissionStatusValue }))}
                                    className={cn(
                                        "h-10 px-3 rounded-xl border text-xs font-bold transition-all",
                                        formData.status === s.val
                                            ? "border-[#2890F8] bg-blue-50 text-blue-900 shadow-2xs"
                                            : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                                    )}
                                >
                                    {s.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Dates */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1.5">Date de début</label>
                            <input
                                type="date"
                                value={formData.startDate}
                                onChange={(e) => setFormData((prev) => ({ ...prev, startDate: e.target.value }))}
                                className="w-full h-11 px-3.5 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 bg-white focus:outline-none focus:border-[#2890F8] cursor-pointer"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1.5">Date de fin</label>
                            <input
                                type="date"
                                value={formData.endDate}
                                onChange={(e) => setFormData((prev) => ({ ...prev, endDate: e.target.value }))}
                                className={cn(
                                    "w-full h-11 px-3.5 border rounded-xl text-xs font-medium text-slate-900 bg-white focus:outline-none focus:border-[#2890F8] cursor-pointer",
                                    errors.endDate ? "border-red-400" : "border-slate-200"
                                )}
                            />
                            {errors.endDate && <p className="text-[11px] text-red-500 font-semibold mt-1">{errors.endDate}</p>}
                        </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-200">
                        <button
                            type="button"
                            onClick={onClose}
                            className="h-10 px-4 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all"
                        >
                            Annuler
                        </button>
                        <button
                            type="submit"
                            disabled={isSaving}
                            className="flex items-center gap-2 h-10 px-5 rounded-xl bg-[#0B0F19] hover:bg-slate-800 text-white text-xs font-bold shadow-md shadow-black/10 transition-all disabled:opacity-50"
                        >
                            {isSaving ? (
                                <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Enregistrement...</>
                            ) : (
                                <><Save className="w-3.5 h-3.5" /> Enregistrer les modifications</>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
