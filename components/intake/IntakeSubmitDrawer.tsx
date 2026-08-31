"use client";

import { useState } from "react";
import { Bug, Lightbulb } from "lucide-react";
import { Drawer, Select, FileUpload, useToast } from "@/components/ui";
import { cn } from "@/lib/utils";
import { useIntakeMetadata } from "./useIntakeMetadata";

interface IntakeSubmitDrawerProps {
    isOpen: boolean;
    onClose: () => void;
}

const SEVERITY_OPTIONS = [
    { value: "LOW", label: "Faible" },
    { value: "MEDIUM", label: "Moyenne" },
    { value: "HIGH", label: "Haute" },
    { value: "CRITICAL", label: "Critique" },
];

export function IntakeSubmitDrawer({ isOpen, onClose }: IntakeSubmitDrawerProps) {
    const { capture } = useIntakeMetadata();
    const { success, error: toastError } = useToast();

    const [type, setType] = useState<"BUG" | "FEATURE_REQUEST">("BUG");
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [severity, setSeverity] = useState("MEDIUM");
    const [pendingFiles, setPendingFiles] = useState<File[]>([]);
    const [submitting, setSubmitting] = useState(false);

    function reset() {
        setType("BUG");
        setTitle("");
        setDescription("");
        setSeverity("MEDIUM");
        setPendingFiles([]);
    }

    async function handleSubmit() {
        if (!title.trim() || !description.trim()) {
            toastError("Champs requis", "Merci de renseigner un titre et une description.");
            return;
        }

        setSubmitting(true);
        try {
            const fileIds: string[] = [];
            for (const file of pendingFiles) {
                const formData = new FormData();
                formData.append("file", file);
                const uploadRes = await fetch("/api/files/upload", { method: "POST", body: formData });
                const uploadJson = await uploadRes.json();
                if (uploadRes.ok && uploadJson.success) {
                    fileIds.push(uploadJson.data.id);
                }
            }

            const metadata = capture();
            const res = await fetch("/api/intake", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    type,
                    title: title.trim(),
                    description: description.trim(),
                    severity,
                    fileIds,
                    ...metadata,
                }),
            });
            const json = await res.json();
            if (!res.ok || !json.success) {
                toastError("Erreur", json.error || "Impossible d'envoyer le signalement");
                return;
            }

            success("Signalement envoyé", "L'équipe technique a été notifiée.");
            reset();
            onClose();
        } catch {
            toastError("Erreur réseau", "Réessayez dans un instant.");
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <Drawer
            isOpen={isOpen}
            onClose={onClose}
            title="Signaler un problème"
            description="Bug ou idée d'amélioration — l'équipe technique triera votre demande."
            size="md"
            footer={
                <div className="flex items-center justify-end gap-2">
                    <button
                        type="button"
                        onClick={onClose}
                        className="h-9 px-4 rounded-lg border border-slate-200 bg-white text-[13px] font-semibold text-slate-600 hover:bg-slate-50"
                    >
                        Annuler
                    </button>
                    <button
                        type="button"
                        onClick={() => void handleSubmit()}
                        disabled={submitting || !title.trim() || !description.trim()}
                        className="h-9 px-4 rounded-lg bg-[#FF9E1B] text-[#15201E] border border-[#E07C00] text-[13px] font-semibold hover:bg-[#F09212] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {submitting ? "Envoi..." : "Envoyer"}
                    </button>
                </div>
            }
        >
            <div className="space-y-4">
                <div>
                    <label className="block text-[12px] font-semibold text-[#12122A] mb-2">
                        Type de signalement
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                        <button
                            type="button"
                            onClick={() => setType("BUG")}
                            className={cn(
                                "flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-[13px] font-semibold transition-colors",
                                type === "BUG"
                                    ? "border-[#E07C00] bg-[#DBE4DF] text-[#12122A]"
                                    : "border-[#E8EBF0] bg-white text-[#5A5A7A] hover:border-[#C5C8D4]",
                            )}
                        >
                            <Bug className="w-4 h-4" /> Bug
                        </button>
                        <button
                            type="button"
                            onClick={() => setType("FEATURE_REQUEST")}
                            className={cn(
                                "flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-[13px] font-semibold transition-colors",
                                type === "FEATURE_REQUEST"
                                    ? "border-[#E07C00] bg-[#DBE4DF] text-[#12122A]"
                                    : "border-[#E8EBF0] bg-white text-[#5A5A7A] hover:border-[#C5C8D4]",
                            )}
                        >
                            <Lightbulb className="w-4 h-4" /> Idée
                        </button>
                    </div>
                </div>

                <div>
                    <label className="block text-[12px] font-semibold text-[#12122A] mb-2">Titre *</label>
                    <input
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Résumez le problème en une phrase"
                        className="w-full h-10 rounded-xl border border-[#E8EBF0] px-3 text-[13px] text-[#12122A] placeholder:text-[#8B8BA7] focus:outline-none focus:ring-2 focus:ring-[#FF9E1B]/25 focus:border-[#E07C00]"
                    />
                </div>

                <div>
                    <label className="block text-[12px] font-semibold text-[#12122A] mb-2">Description *</label>
                    <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Que s'est-il passé ? Étapes pour reproduire, comportement attendu..."
                        className="w-full min-h-[120px] rounded-xl border border-[#E8EBF0] px-3 py-2.5 text-[13px] text-[#12122A] placeholder:text-[#8B8BA7] focus:outline-none focus:ring-2 focus:ring-[#FF9E1B]/25 focus:border-[#E07C00] resize-y"
                    />
                </div>

                <Select
                    label="Sévérité"
                    options={SEVERITY_OPTIONS}
                    value={severity}
                    onChange={setSeverity}
                />

                <div>
                    <FileUpload
                        label="Pièces jointes (captures, logs...)"
                        multiple
                        maxSize={20}
                        onFilesSelected={(files) => setPendingFiles((prev) => [...prev, ...files])}
                    />
                    {pendingFiles.length > 0 && (
                        <ul className="mt-2 space-y-1">
                            {pendingFiles.map((file, i) => (
                                <li key={`${file.name}-${i}`} className="text-[12px] text-[#5A5A7A] truncate">
                                    {file.name}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </Drawer>
    );
}
