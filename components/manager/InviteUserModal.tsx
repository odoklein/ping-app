"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertCircle, Check, Copy, Loader2, MailCheck, Send, UserPlus } from "lucide-react";
import { Modal, ModalFooter } from "@/components/ui/Modal";
import { cn } from "@/lib/utils";

// ============================================
// INVITE A COLLABORATOR (MANAGER)
// ============================================
// Replaces the old "create user + manual password" form: the manager only
// declares who and what, the invitee sets their own password from the email.

const ROLE_OPTIONS = [
    { value: "SDR", label: "SDR", hint: "Poste d'appel, listes de prospection" },
    { value: "BOOKER", label: "Booker", hint: "Prise de rendez-vous" },
    { value: "BUSINESS_DEVELOPER", label: "Business Developer", hint: "Portefeuille clients" },
    { value: "MANAGER", label: "Manager", hint: "Accès complet au pilotage" },
    { value: "DEVELOPER", label: "Développeur", hint: "Projets et tickets techniques" },
    { value: "CLIENT", label: "Client", hint: "Portail de suivi (client requis)" },
    { value: "COMMERCIAL", label: "Commercial", hint: "Réception des RDV (client requis)" },
] as const;

const VOIP_ROLES = new Set(["SDR", "BOOKER", "BUSINESS_DEVELOPER"]);
const CLIENT_ROLES = new Set(["CLIENT", "COMMERCIAL"]);
const MISSION_ROLES = new Set(["SDR", "BOOKER"]);

interface ClientOption {
    id: string;
    name: string;
}

interface MissionOption {
    id: string;
    name: string;
    clientId: string;
    clientName?: string;
}

const EMPTY_FORM = {
    name: "",
    email: "",
    role: "SDR" as string,
    clientId: "",
    voipProvider: "ALLO",
    phone: "",
    alloPhoneNumber: "",
    onoffNumber: "",
    onoffUserId: "",
    ringoverNumber: "",
    assignedMissionIds: [] as string[],
};

export interface InviteResult {
    email: string;
    roleLabel: string;
    emailSent: boolean;
    inviteUrl: string;
}

export function InviteUserModal({
    isOpen,
    onClose,
    onInvited,
    clients,
}: {
    isOpen: boolean;
    onClose: () => void;
    onInvited: (result: InviteResult) => void;
    clients: ClientOption[];
}) {
    const [form, setForm] = useState(EMPTY_FORM);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(false);
    const [missions, setMissions] = useState<MissionOption[]>([]);
    const [result, setResult] = useState<InviteResult | null>(null);
    const [copied, setCopied] = useState(false);

    const needsClient = CLIENT_ROLES.has(form.role);
    const needsVoip = VOIP_ROLES.has(form.role);
    const needsMissions = MISSION_ROLES.has(form.role);

    // Reset each time the modal opens.
    useEffect(() => {
        if (isOpen) {
            setForm(EMPTY_FORM);
            setErrors({});
            setResult(null);
            setCopied(false);
        }
    }, [isOpen]);

    // Missions are only needed for the SDR / Booker branch.
    useEffect(() => {
        if (!isOpen || !needsMissions || missions.length > 0) return;
        fetch("/api/missions?statuses=ACTIVE&limit=200")
            .then((r) => r.json())
            .then((j) => {
                const list = Array.isArray(j?.data) ? j.data : (j?.data?.missions ?? []);
                setMissions(
                    list.map((m: { id: string; name: string; clientId: string; client?: { name?: string } }) => ({
                        id: m.id,
                        name: m.name,
                        clientId: m.clientId,
                        clientName: m.client?.name,
                    })),
                );
            })
            .catch(() => {});
    }, [isOpen, needsMissions, missions.length]);

    const patch = (p: Partial<typeof form>) => setForm((f) => ({ ...f, ...p }));

    const missionsForDisplay = useMemo(
        () => missions.slice().sort((a, b) => a.name.localeCompare(b.name)),
        [missions],
    );

    const handleSubmit = async () => {
        setErrors({});

        const nextErrors: Record<string, string> = {};
        if (form.name.trim().length < 2) nextErrors.name = "Nom requis (2 caractères minimum)";
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()))
            nextErrors.email = "Adresse email invalide";
        if (needsClient && !form.clientId) nextErrors.clientId = "Sélectionnez un client";
        if (Object.keys(nextErrors).length > 0) {
            setErrors(nextErrors);
            return;
        }

        setLoading(true);
        try {
            const payload: Record<string, unknown> = {
                name: form.name.trim(),
                email: form.email.trim().toLowerCase(),
                role: form.role,
            };
            if (needsClient) payload.clientId = form.clientId;
            if (needsVoip) {
                payload.voipProvider = form.voipProvider;
                if (form.phone.trim()) payload.phone = form.phone.trim();
                if (form.alloPhoneNumber.trim()) payload.alloPhoneNumber = form.alloPhoneNumber.trim();
                if (form.onoffNumber.trim()) payload.onoffNumber = form.onoffNumber.trim();
                if (form.onoffUserId.trim()) payload.onoffUserId = form.onoffUserId.trim();
                if (form.ringoverNumber.trim()) payload.ringoverNumber = form.ringoverNumber.trim();
            }
            if (needsMissions && form.assignedMissionIds.length > 0) {
                payload.assignedMissionIds = form.assignedMissionIds;
            }

            const res = await fetch("/api/invitations", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            const json = await res.json();

            if (!res.ok || !json?.success) {
                setErrors({ general: json?.error || "L'envoi de l'invitation a échoué." });
                return;
            }

            const invited: InviteResult = {
                email: payload.email as string,
                roleLabel: json.data.roleLabel ?? form.role,
                emailSent: Boolean(json.data.emailSent),
                inviteUrl: json.data.inviteUrl ?? "",
            };
            setResult(invited);
            onInvited(invited);
        } catch {
            setErrors({ general: "Erreur réseau lors de l'envoi de l'invitation." });
        } finally {
            setLoading(false);
        }
    };

    const copyLink = async () => {
        if (!result?.inviteUrl) return;
        try {
            await navigator.clipboard.writeText(result.inviteUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            /* clipboard unavailable — the link stays selectable in the field */
        }
    };

    const fieldClass =
        "w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 text-slate-900 placeholder:text-slate-400";
    const labelClass =
        "block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5";

    // ── Confirmation view ──
    if (result) {
        return (
            <Modal isOpen={isOpen} onClose={onClose} title="Invitation envoyée" size="md">
                <div className="space-y-4">
                    <div
                        className={cn(
                            "flex items-start gap-3 rounded-2xl border px-4 py-3.5",
                            result.emailSent
                                ? "border-emerald-200 bg-emerald-50"
                                : "border-amber-200 bg-amber-50",
                        )}
                    >
                        <MailCheck
                            className={cn(
                                "w-5 h-5 flex-shrink-0 mt-0.5",
                                result.emailSent ? "text-emerald-600" : "text-amber-600",
                            )}
                        />
                        <div>
                            <p className="text-sm font-bold text-slate-900">
                                {result.emailSent
                                    ? `Email envoyé à ${result.email}`
                                    : "Email non envoyé (SMTP indisponible)"}
                            </p>
                            <p className="mt-0.5 text-xs text-slate-600 leading-relaxed">
                                {result.emailSent
                                    ? `Rôle ${result.roleLabel}. Le lien d'activation expire dans 7 jours.`
                                    : "L'invitation est bien créée : transmettez le lien ci-dessous manuellement."}
                            </p>
                        </div>
                    </div>

                    <div>
                        <label className={labelClass}>Lien d&apos;activation</label>
                        <div className="flex items-center gap-2">
                            <input
                                readOnly
                                value={result.inviteUrl}
                                onFocus={(e) => e.currentTarget.select()}
                                className={cn(fieldClass, "font-mono text-[11px]")}
                            />
                            <button
                                type="button"
                                onClick={copyLink}
                                className="flex-shrink-0 inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-50"
                            >
                                {copied ? (
                                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                                ) : (
                                    <Copy className="w-3.5 h-3.5" />
                                )}
                                {copied ? "Copié" : "Copier"}
                            </button>
                        </div>
                        <p className="mt-1.5 text-[11px] text-slate-500">
                            Ce lien ne sera plus affiché. Pour en obtenir un nouveau, utilisez
                            « Copier le lien » depuis l&apos;onglet Invitations.
                        </p>
                    </div>
                </div>

                <ModalFooter>
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-semibold bg-primary hover:bg-primary-hover text-white rounded-lg transition-colors"
                    >
                        Terminé
                    </button>
                </ModalFooter>
            </Modal>
        );
    }

    // ── Form view ──
    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Inviter un collaborateur" size="md">
            <div className="space-y-4">
                {errors.general && (
                    <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm font-semibold">
                        <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                        {errors.general}
                    </div>
                )}

                <p className="flex items-start gap-2.5 rounded-xl border border-blue-100 bg-blue-50/70 px-3.5 py-3 text-xs text-slate-600 leading-relaxed">
                    <UserPlus className="w-4 h-4 flex-shrink-0 mt-px text-primary" />
                    Le collaborateur reçoit un lien personnel valable 7 jours et définit lui-même son
                    mot de passe. Aucun mot de passe n&apos;est créé ni transmis par vous.
                </p>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className={labelClass}>Nom complet</label>
                        <input
                            className={cn(fieldClass, errors.name && "border-red-300")}
                            value={form.name}
                            onChange={(e) => patch({ name: e.target.value })}
                            placeholder="Alex Martin"
                        />
                        {errors.name && (
                            <p className="text-red-500 text-xs mt-1">{errors.name}</p>
                        )}
                    </div>
                    <div>
                        <label className={labelClass}>Email professionnel</label>
                        <input
                            className={cn(fieldClass, errors.email && "border-red-300")}
                            type="email"
                            value={form.email}
                            onChange={(e) => patch({ email: e.target.value })}
                            placeholder="alex@entreprise.com"
                        />
                        {errors.email && (
                            <p className="text-red-500 text-xs mt-1">{errors.email}</p>
                        )}
                    </div>
                </div>

                <div>
                    <label className={labelClass}>Rôle</label>
                    <select
                        className={fieldClass}
                        value={form.role}
                        onChange={(e) =>
                            patch({
                                role: e.target.value,
                                clientId: CLIENT_ROLES.has(e.target.value) ? form.clientId : "",
                                assignedMissionIds: MISSION_ROLES.has(e.target.value)
                                    ? form.assignedMissionIds
                                    : [],
                            })
                        }
                    >
                        {ROLE_OPTIONS.map((r) => (
                            <option key={r.value} value={r.value}>
                                {r.label}
                            </option>
                        ))}
                    </select>
                    <p className="mt-1.5 text-[11px] text-slate-500">
                        {ROLE_OPTIONS.find((r) => r.value === form.role)?.hint}
                    </p>
                </div>

                {needsClient && (
                    <div>
                        <label className={labelClass}>
                            Client associé <span className="text-red-500">*</span>
                        </label>
                        <select
                            className={cn(fieldClass, errors.clientId && "border-red-300")}
                            value={form.clientId}
                            onChange={(e) => patch({ clientId: e.target.value })}
                        >
                            <option value="">Sélectionner un client</option>
                            {clients.map((c) => (
                                <option key={c.id} value={c.id}>
                                    {c.name}
                                </option>
                            ))}
                        </select>
                        {errors.clientId && (
                            <p className="text-red-500 text-xs mt-1">{errors.clientId}</p>
                        )}
                    </div>
                )}

                {needsVoip && (
                    <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 space-y-3">
                        <p className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
                            Ligne téléphonique (pré-configurée)
                        </p>
                        <div>
                            <label className={labelClass}>Fournisseur VoIP</label>
                            <select
                                className={fieldClass}
                                value={form.voipProvider}
                                onChange={(e) => patch({ voipProvider: e.target.value })}
                            >
                                <option value="ALLO">WithAllo (Allo)</option>
                                <option value="ONOFF">Onoff Business</option>
                                <option value="RINGOVER">Ringover</option>
                                <option value="NONE">Aucun / Manuel</option>
                            </select>
                        </div>

                        {form.voipProvider === "ALLO" && (
                            <div>
                                <label className={labelClass}>
                                    Numéro Allo{" "}
                                    <span className="text-slate-400 normal-case font-normal">
                                        (optionnel)
                                    </span>
                                </label>
                                <input
                                    className={fieldClass}
                                    value={form.alloPhoneNumber}
                                    onChange={(e) => patch({ alloPhoneNumber: e.target.value })}
                                    placeholder="+33612345678"
                                />
                            </div>
                        )}

                        {form.voipProvider === "ONOFF" && (
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className={labelClass}>Numéro Onoff</label>
                                    <input
                                        className={fieldClass}
                                        value={form.onoffNumber}
                                        onChange={(e) => patch({ onoffNumber: e.target.value })}
                                        placeholder="+33612345678"
                                    />
                                </div>
                                <div>
                                    <label className={labelClass}>ID Membre Onoff</label>
                                    <input
                                        className={fieldClass}
                                        value={form.onoffUserId}
                                        onChange={(e) => patch({ onoffUserId: e.target.value })}
                                        placeholder="user_12345"
                                    />
                                </div>
                            </div>
                        )}

                        {form.voipProvider === "RINGOVER" && (
                            <div>
                                <label className={labelClass}>Numéro Ringover</label>
                                <input
                                    className={fieldClass}
                                    value={form.ringoverNumber}
                                    onChange={(e) => patch({ ringoverNumber: e.target.value })}
                                    placeholder="+33123456789"
                                />
                            </div>
                        )}
                    </div>
                )}

                {needsMissions && missionsForDisplay.length > 0 && (
                    <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5">
                        <p className="text-xs font-semibold text-slate-700 uppercase tracking-wide mb-2.5">
                            Missions à assigner{" "}
                            <span className="text-slate-400 normal-case font-normal">
                                (optionnel)
                            </span>
                        </p>
                        <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                            {missionsForDisplay.map((m) => {
                                const checked = form.assignedMissionIds.includes(m.id);
                                return (
                                    <label
                                        key={m.id}
                                        className="flex items-start gap-2.5 rounded-lg bg-white border border-slate-200 px-3 py-2 cursor-pointer hover:border-slate-300"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={checked}
                                            onChange={() =>
                                                patch({
                                                    assignedMissionIds: checked
                                                        ? form.assignedMissionIds.filter(
                                                              (id) => id !== m.id,
                                                          )
                                                        : [...form.assignedMissionIds, m.id],
                                                })
                                            }
                                            className="mt-0.5 rounded border-slate-300 text-primary focus:ring-primary"
                                        />
                                        <span className="min-w-0">
                                            <span className="block text-xs font-bold text-slate-800 truncate">
                                                {m.name}
                                            </span>
                                            {m.clientName && (
                                                <span className="block text-[11px] text-slate-500 truncate">
                                                    {m.clientName}
                                                </span>
                                            )}
                                        </span>
                                    </label>
                                );
                            })}
                        </div>
                        <p className="mt-2 text-[11px] text-slate-500">
                            Les missions cochées seront assignées automatiquement à l&apos;activation
                            du compte.
                        </p>
                    </div>
                )}
            </div>

            <ModalFooter>
                <button
                    onClick={onClose}
                    className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                    Annuler
                </button>
                <button
                    onClick={handleSubmit}
                    disabled={loading}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-primary hover:bg-primary-hover text-white rounded-lg transition-colors disabled:opacity-50"
                >
                    {loading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                        <Send className="w-4 h-4" />
                    )}
                    {loading ? "Envoi…" : "Envoyer l'invitation"}
                </button>
            </ModalFooter>
        </Modal>
    );
}
