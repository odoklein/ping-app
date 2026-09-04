"use client";

import { useMemo, useState } from "react";
import {
    AlertCircle,
    CalendarClock,
    CheckCircle2,
    Loader2,
    Plus,
    Target,
    UserRound,
    Users,
} from "lucide-react";
import { OnboardingWizard, BulletList, type WizardStep } from "./OnboardingWizard";
import type { OnboardingContext, OnboardingInterlocuteur } from "./types";

const BANT_CRITERIA = [
    "Budget : le prospect a un budget identifié ou la capacité de le débloquer.",
    "Autorité : l'interlocuteur décide ou influence directement la décision.",
    "Besoin : un besoin explicite que votre offre adresse, pas une curiosité polie.",
    "Timing : un horizon de décision réaliste, généralement sous 6 mois.",
];

// ──────────────────────────────────────────────────────────────────────────────
// Step 3 — the client declares its own sales reps
// ──────────────────────────────────────────────────────────────────────────────

const EMPTY_REP = {
    firstName: "",
    lastName: "",
    title: "",
    email: "",
    phone: "",
    bookingUrl: "",
};

function CommercialsStep({
    initial,
    onAdded,
}: {
    initial: OnboardingInterlocuteur[];
    onAdded: (rep: OnboardingInterlocuteur) => void;
}) {
    const [reps, setReps] = useState<OnboardingInterlocuteur[]>(initial);
    const [form, setForm] = useState(EMPTY_REP);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [showForm, setShowForm] = useState(initial.length === 0);

    const fieldClass =
        "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-primary focus:ring-2 focus:ring-primary/15";
    const labelClass = "block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5";

    const handleAdd = async () => {
        setError("");
        if (!form.firstName.trim() || !form.lastName.trim()) {
            setError("Prénom et nom sont requis.");
            return;
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
            setError("Renseignez une adresse email valide.");
            return;
        }

        setSaving(true);
        try {
            const res = await fetch("/api/client/interlocuteurs", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    firstName: form.firstName.trim(),
                    lastName: form.lastName.trim(),
                    title: form.title.trim() || undefined,
                    email: form.email.trim(),
                    phone: form.phone.trim() || undefined,
                    bookingUrl: form.bookingUrl.trim() || undefined,
                }),
            });
            const json = await res.json();
            if (!res.ok || !json?.success) {
                setError(json?.error || "Impossible d'enregistrer ce commercial.");
                return;
            }
            const created = json.data as OnboardingInterlocuteur;
            setReps((prev) => [...prev, created]);
            onAdded(created);
            setForm(EMPTY_REP);
            setShowForm(false);
        } catch {
            setError("Erreur réseau. Réessayez.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-4">
            {reps.length > 0 && (
                <div className="space-y-2">
                    {reps.map((rep) => (
                        <div
                            key={rep.id}
                            className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/60 px-4 py-3"
                        >
                            <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600" />
                            <div className="min-w-0">
                                <p className="text-sm font-bold text-slate-900 truncate">
                                    {rep.firstName} {rep.lastName}
                                </p>
                                {rep.title && (
                                    <p className="text-[11px] text-slate-500 truncate">{rep.title}</p>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {showForm ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
                    {error && (
                        <p className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
                            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-px" />
                            {error}
                        </p>
                    )}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className={labelClass}>Prénom</label>
                            <input
                                className={fieldClass}
                                value={form.firstName}
                                onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
                                placeholder="Camille"
                            />
                        </div>
                        <div>
                            <label className={labelClass}>Nom</label>
                            <input
                                className={fieldClass}
                                value={form.lastName}
                                onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
                                placeholder="Rousseau"
                            />
                        </div>
                    </div>
                    <div>
                        <label className={labelClass}>Email professionnel</label>
                        <input
                            className={fieldClass}
                            type="email"
                            value={form.email}
                            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                            placeholder="camille@votre-entreprise.com"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className={labelClass}>
                                Fonction <span className="font-normal normal-case">(optionnel)</span>
                            </label>
                            <input
                                className={fieldClass}
                                value={form.title}
                                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                                placeholder="Account Executive"
                            />
                        </div>
                        <div>
                            <label className={labelClass}>
                                Téléphone <span className="font-normal normal-case">(optionnel)</span>
                            </label>
                            <input
                                className={fieldClass}
                                value={form.phone}
                                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                                placeholder="+33 6 12 34 56 78"
                            />
                        </div>
                    </div>
                    <div>
                        <label className={labelClass}>
                            Lien de visio / agenda{" "}
                            <span className="font-normal normal-case">(Calendly, Cal.com, Meet)</span>
                        </label>
                        <input
                            className={fieldClass}
                            value={form.bookingUrl}
                            onChange={(e) => setForm((f) => ({ ...f, bookingUrl: e.target.value }))}
                            placeholder="https://calendly.com/camille/30min"
                        />
                        <p className="mt-1.5 text-[11px] text-slate-500">
                            Les SDR proposeront directement ce créneau au prospect pendant l&apos;appel.
                        </p>
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                        <button
                            type="button"
                            onClick={handleAdd}
                            disabled={saving}
                            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white transition-colors hover:bg-slate-700 disabled:opacity-60"
                        >
                            {saving ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                                <Plus className="w-3.5 h-3.5" />
                            )}
                            Enregistrer ce commercial
                        </button>
                        {reps.length > 0 && (
                            <button
                                type="button"
                                onClick={() => {
                                    setShowForm(false);
                                    setError("");
                                }}
                                className="rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-500 hover:bg-slate-200/70"
                            >
                                Annuler
                            </button>
                        )}
                    </div>
                </div>
            ) : (
                <button
                    type="button"
                    onClick={() => setShowForm(true)}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 px-4 py-3.5 text-xs font-bold text-slate-600 transition-colors hover:border-slate-400 hover:bg-slate-50"
                >
                    <Plus className="w-4 h-4" />
                    Ajouter un autre commercial
                </button>
            )}

            <p className="text-[11px] text-slate-500 leading-relaxed">
                Vous pourrez ajouter, modifier ou retirer des commerciaux à tout moment depuis votre
                portail.
            </p>
        </div>
    );
}

// ──────────────────────────────────────────────────────────────────────────────
// Wizard
// ──────────────────────────────────────────────────────────────────────────────

export function ClientOnboardingModal({
    isOpen,
    context,
    onComplete,
    onSkip,
}: {
    isOpen: boolean;
    context: OnboardingContext | null;
    onComplete: (redirectTo?: string) => Promise<void> | void;
    onSkip?: () => Promise<void> | void;
}) {
    const [repCount, setRepCount] = useState(context?.interlocuteurs?.length ?? 0);

    const manager = context?.team?.manager ?? null;
    const sdrs = useMemo(() => context?.team?.sdrs ?? [], [context?.team?.sdrs]);
    const missions = useMemo(() => context?.missions ?? [], [context?.missions]);
    const playbook = context?.playbook;
    const clientName = context?.client?.name ?? "votre compte";

    const steps: WizardStep[] = useMemo(
        () => [
            {
                label: "Votre équipe",
                title: "Rencontrez votre équipe dédiée",
                subtitle: `Voici les personnes qui portent la prospection de ${clientName} au quotidien.`,
                icon: Users,
                accent: "bg-indigo-100 text-indigo-600",
                content: (
                    <div className="space-y-4">
                        {manager ? (
                            <div className="rounded-2xl border border-indigo-200 bg-indigo-50/60 px-4 py-3.5 flex items-center gap-3">
                                <div className="w-10 h-10 flex-shrink-0 rounded-xl bg-indigo-600 text-white flex items-center justify-center text-xs font-black">
                                    {initials(manager.name)}
                                </div>
                                <div className="min-w-0">
                                    <p className="text-sm font-bold text-slate-900 truncate">
                                        {manager.name}
                                    </p>
                                    <p className="text-[11px] font-semibold text-indigo-700">
                                        Manager dédié · votre point de contact principal
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <p className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
                                Votre manager dédié vous sera présenté sous peu.
                            </p>
                        )}

                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2.5">
                                SDR affectés à vos missions
                            </p>
                            {sdrs.length > 0 ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {sdrs.map((sdr) => (
                                        <div
                                            key={sdr.id}
                                            className="flex items-center gap-2.5 rounded-2xl border border-slate-200 bg-white px-3.5 py-2.5"
                                        >
                                            <div className="w-8 h-8 flex-shrink-0 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center text-[10px] font-black">
                                                {initials(sdr.name)}
                                            </div>
                                            <span className="text-xs font-bold text-slate-800 truncate">
                                                {sdr.name}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
                                    L&apos;affectation des SDR est en cours de finalisation.
                                </p>
                            )}
                        </div>

                        {missions.length > 0 && (
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2.5">
                                    Missions actives
                                </p>
                                <div className="space-y-2">
                                    {missions.slice(0, 3).map((m) => (
                                        <div
                                            key={m.id}
                                            className="flex items-start gap-2.5 rounded-2xl border border-slate-200 bg-white px-4 py-3"
                                        >
                                            <Target className="w-4 h-4 flex-shrink-0 mt-0.5 text-primary" />
                                            <div className="min-w-0">
                                                <p className="text-sm font-bold text-slate-900 truncate">
                                                    {m.name}
                                                </p>
                                                {m.objective && (
                                                    <p className="text-[11px] text-slate-500">
                                                        {m.objective}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                ),
            },
            {
                label: "Playbook",
                title: "Validez le playbook commercial",
                subtitle:
                    "C'est le discours que nos SDR porteront en votre nom, et la définition de ce qui compte comme lead qualifié.",
                icon: UserRound,
                accent: "bg-amber-100 text-amber-600",
                content: (
                    <div className="space-y-4">
                        <div className="rounded-2xl border border-slate-200 bg-white p-4">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">
                                Pitch commercial
                            </p>
                            <p className="text-sm text-slate-700 leading-relaxed">
                                {playbook?.pitch ??
                                    "Votre pitch sera construit avec votre manager lors de la session de cadrage, puis affiché ici."}
                            </p>
                        </div>

                        {playbook?.icp && (
                            <div className="rounded-2xl border border-slate-200 bg-white p-4">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">
                                    Profil ciblé (ICP)
                                </p>
                                <p className="text-sm text-slate-700 leading-relaxed">
                                    {playbook.icp}
                                </p>
                            </div>
                        )}

                        <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-3">
                                Ce qui compte comme lead qualifié (BANT)
                            </p>
                            <BulletList items={BANT_CRITERIA} />
                        </div>

                        <p className="text-[11px] text-slate-500 leading-relaxed">
                            Un désaccord sur ces critères ? Signalez-le à votre manager depuis la
                            messagerie du portail avant le lancement des appels.
                        </p>
                    </div>
                ),
            },
            {
                label: "Commerciaux",
                title: "Qui reçoit les rendez-vous ?",
                subtitle:
                    "Déclarez les commerciaux de votre entreprise. Les SDR leur transmettront directement les RDV qualifiés.",
                icon: CalendarClock,
                accent: "bg-emerald-100 text-emerald-600",
                content: (
                    <CommercialsStep
                        initial={context?.interlocuteurs ?? []}
                        onAdded={() => setRepCount((c) => c + 1)}
                    />
                ),
                canAdvance: repCount > 0,
                blockedHint: "Ajoutez au moins un commercial destinataire des rendez-vous.",
            },
        ],
        [clientName, manager, sdrs, missions, playbook, context?.interlocuteurs, repCount],
    );

    return (
        <OnboardingWizard
            isOpen={isOpen}
            badge="Onboarding Client"
            heading="Votre portail de prospection est prêt"
            steps={steps}
            completeLabel="Accéder à mon portail"
            onComplete={() => onComplete("/client/portal")}
            onSkip={onSkip}
        />
    );
}

function initials(name: string): string {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "?";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
