"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    AlertTriangle,
    CheckCircle2,
    Headphones,
    Keyboard,
    Mic,
    MicOff,
    Phone,
    PhoneOff,
    Rocket,
    Target,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { OnboardingWizard, InfoTile, type WizardStep } from "./OnboardingWizard";
import type { OnboardingContext } from "./types";

const PROVIDER_LABELS: Record<string, string> = {
    ALLO: "WithAllo",
    ONOFF: "Onoff Business",
    RINGOVER: "Ringover",
    NONE: "Aucun (composition manuelle)",
};

const SHORTCUTS = [
    { keys: "Espace", action: "Lancer / raccrocher l'appel courant" },
    { keys: "R", action: "Qualifier en RDV obtenu" },
    { keys: "B", action: "Barrage standard" },
    { keys: "I", action: "Injoignable / pas de réponse" },
    { keys: "N", action: "Ouvrir la zone de notes" },
];

const QUALIFICATIONS = [
    {
        label: "RDV obtenu",
        tone: "bg-emerald-50 text-emerald-700 border-emerald-200",
        detail: "Le prospect a accepté un créneau. Renseignez la date et le commercial destinataire.",
    },
    {
        label: "Barrage standard",
        tone: "bg-amber-50 text-amber-700 border-amber-200",
        detail: "Le standard refuse de transmettre. Le contact repart en cadence automatiquement.",
    },
    {
        label: "Injoignable",
        tone: "bg-slate-100 text-slate-600 border-slate-200",
        detail: "Pas de réponse. Programmez un rappel plutôt que de brûler le contact.",
    },
    {
        label: "Numéro KO",
        tone: "bg-rose-50 text-rose-700 border-rose-200",
        detail: "Numéro invalide : le contact sort de la file et remonte pour enrichissement.",
    },
];

// ──────────────────────────────────────────────────────────────────────────────
// Live microphone level meter
// ──────────────────────────────────────────────────────────────────────────────

type MicState = "idle" | "requesting" | "live" | "denied" | "unsupported";

function MicrophoneTest({ onPass }: { onPass: () => void }) {
    const [state, setState] = useState<MicState>("idle");
    const [level, setLevel] = useState(0);
    const [peaked, setPeaked] = useState(false);

    const streamRef = useRef<MediaStream | null>(null);
    const audioCtxRef = useRef<AudioContext | null>(null);
    const rafRef = useRef<number | null>(null);

    const stop = useCallback(() => {
        if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        audioCtxRef.current?.close().catch(() => {});
        audioCtxRef.current = null;
    }, []);

    useEffect(() => stop, [stop]);

    const start = useCallback(async () => {
        if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
            setState("unsupported");
            return;
        }

        setState("requesting");
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;

            const AudioCtx =
                window.AudioContext ||
                (window as unknown as { webkitAudioContext: typeof AudioContext })
                    .webkitAudioContext;
            const ctx = new AudioCtx();
            audioCtxRef.current = ctx;

            const source = ctx.createMediaStreamSource(stream);
            const analyser = ctx.createAnalyser();
            analyser.fftSize = 512;
            source.connect(analyser);

            const buffer = new Uint8Array(analyser.frequencyBinCount);
            setState("live");

            const tick = () => {
                analyser.getByteTimeDomainData(buffer);
                let sum = 0;
                for (let i = 0; i < buffer.length; i++) {
                    const deviation = (buffer[i] - 128) / 128;
                    sum += deviation * deviation;
                }
                const rms = Math.sqrt(sum / buffer.length);
                const normalized = Math.min(1, rms * 4);
                setLevel(normalized);
                if (normalized > 0.12) {
                    setPeaked(true);
                    onPass();
                }
                rafRef.current = requestAnimationFrame(tick);
            };
            rafRef.current = requestAnimationFrame(tick);
        } catch {
            setState("denied");
            stop();
        }
    }, [onPass, stop]);

    const bars = 16;
    const activeBars = Math.round(level * bars);

    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                    <div
                        className={cn(
                            "w-9 h-9 rounded-xl flex items-center justify-center",
                            state === "live"
                                ? "bg-emerald-50 text-emerald-600"
                                : state === "denied" || state === "unsupported"
                                  ? "bg-rose-50 text-rose-600"
                                  : "bg-slate-100 text-slate-500",
                        )}
                    >
                        {state === "denied" || state === "unsupported" ? (
                            <MicOff className="w-4 h-4" />
                        ) : (
                            <Mic className="w-4 h-4" />
                        )}
                    </div>
                    <div>
                        <p className="text-sm font-bold text-slate-900">Microphone</p>
                        <p className="text-[11px] text-slate-500">
                            {state === "live"
                                ? peaked
                                    ? "Signal détecté — votre micro fonctionne."
                                    : "Parlez normalement pour voir le niveau bouger."
                                : state === "denied"
                                  ? "Accès refusé par le navigateur."
                                  : state === "unsupported"
                                    ? "Ce navigateur ne permet pas le test audio."
                                    : "Test non démarré."}
                        </p>
                    </div>
                </div>

                {state !== "live" && (
                    <button
                        type="button"
                        onClick={start}
                        disabled={state === "requesting"}
                        className="flex-shrink-0 rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-bold text-white transition-colors hover:bg-slate-700 disabled:opacity-60"
                    >
                        {state === "requesting" ? "Autorisation…" : "Tester"}
                    </button>
                )}
                {peaked && (
                    <span className="flex-shrink-0 inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Validé
                    </span>
                )}
            </div>

            {/* Level meter */}
            <div className="mt-4 flex items-center gap-1">
                {Array.from({ length: bars }).map((_, i) => (
                    <div
                        key={i}
                        className={cn(
                            "h-6 flex-1 rounded-[3px] transition-colors duration-75",
                            i < activeBars
                                ? i > bars * 0.8
                                    ? "bg-rose-400"
                                    : i > bars * 0.6
                                      ? "bg-amber-400"
                                      : "bg-emerald-400"
                                : "bg-slate-100",
                        )}
                    />
                ))}
            </div>

            {(state === "denied" || state === "unsupported") && (
                <p className="mt-3 flex items-start gap-2 text-[11px] font-semibold text-amber-600">
                    <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-px" />
                    Autorisez le micro dans les paramètres du navigateur, puis relancez le test. Vous
                    pouvez continuer et le refaire plus tard depuis vos paramètres.
                </p>
            )}
        </div>
    );
}

// ──────────────────────────────────────────────────────────────────────────────
// Wizard
// ──────────────────────────────────────────────────────────────────────────────

export function SdrOnboardingModal({
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
    const [micPassed, setMicPassed] = useState(false);
    const handleMicPass = useCallback(() => setMicPassed(true), []);

    const telephony = context?.telephony;
    const missions = useMemo(() => context?.missions ?? [], [context?.missions]);
    const firstList = context?.firstList ?? null;

    const hasLine = Boolean(telephony?.assignedNumber);
    const providerLabel = PROVIDER_LABELS[telephony?.provider ?? "NONE"] ?? "Non configuré";

    const steps: WizardStep[] = useMemo(
        () => [
            {
                label: "Téléphonie",
                title: "Votre ligne d'appel",
                subtitle: hasLine
                    ? "Votre numéro est déjà rattaché. Vous pouvez appeler dès maintenant depuis le poste d'appel."
                    : "Aucun numéro n'est encore rattaché à votre compte. Vous pourrez composer manuellement en attendant.",
                icon: hasLine ? Phone : PhoneOff,
                accent: hasLine ? "bg-blue-100 text-blue-600" : "bg-amber-100 text-amber-600",
                content: (
                    <div className="space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <InfoTile label="Fournisseur VoIP" value={providerLabel} />
                            <InfoTile
                                label="Numéro assigné"
                                value={telephony?.assignedNumber ?? "À rattacher"}
                                tone={hasLine ? "success" : "warning"}
                                hint={
                                    hasLine
                                        ? "Les appels sortants partiront de ce numéro."
                                        : "Demandez le rattachement à votre manager."
                                }
                            />
                        </div>
                        {!hasLine && (
                            <p className="flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-700">
                                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-px" />
                                Votre manager doit rattacher une ligne VoIP à votre compte. Ce n&apos;est
                                pas bloquant : vous pouvez explorer le poste d&apos;appel dès maintenant.
                            </p>
                        )}
                    </div>
                ),
            },
            {
                label: "Audio",
                title: "Test audio & périphériques",
                subtitle:
                    "Un micro mal configuré est la première cause d'appels perdus. Vérifions-le maintenant.",
                icon: Headphones,
                accent: "bg-violet-100 text-violet-600",
                content: (
                    <div className="space-y-3">
                        <MicrophoneTest onPass={handleMicPass} />
                        <p className="text-xs text-slate-500 leading-relaxed">
                            Conseil : utilisez un casque filaire avec micro. Le Bluetooth introduit
                            une latence qui coupe les premières syllabes de votre accroche.
                        </p>
                    </div>
                ),
            },
            {
                label: "Poste d'appel",
                title: "Le poste d'appel",
                subtitle:
                    "Tout se pilote au clavier : la file de contacts avance sans que vous quittiez les mains du clavier.",
                icon: Keyboard,
                accent: "bg-indigo-100 text-indigo-600",
                content: (
                    <div className="space-y-5">
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2.5">
                                Raccourcis clavier
                            </p>
                            <div className="rounded-2xl border border-slate-200 divide-y divide-slate-100 overflow-hidden">
                                {SHORTCUTS.map((s) => (
                                    <div
                                        key={s.keys}
                                        className="flex items-center gap-3 px-4 py-2.5 bg-white"
                                    >
                                        <kbd className="flex-shrink-0 min-w-[54px] text-center rounded-lg border border-slate-300 bg-slate-50 px-2 py-1 text-[11px] font-bold text-slate-700">
                                            {s.keys}
                                        </kbd>
                                        <span className="text-xs text-slate-600">{s.action}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2.5">
                                Statuts de qualification
                            </p>
                            <div className="space-y-2">
                                {QUALIFICATIONS.map((q) => (
                                    <div
                                        key={q.label}
                                        className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3"
                                    >
                                        <span
                                            className={cn(
                                                "flex-shrink-0 rounded-lg border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                                                q.tone,
                                            )}
                                        >
                                            {q.label}
                                        </span>
                                        <span className="text-xs text-slate-600 leading-relaxed">
                                            {q.detail}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <p className="rounded-2xl border border-blue-100 bg-blue-50/70 px-4 py-3 text-xs text-slate-600 leading-relaxed">
                            <strong className="text-slate-900">Fiches objections IA :</strong> pendant
                            l&apos;appel, le panneau latéral propose des réponses adaptées au script de
                            la mission. Elles sont là pour vous appuyer, pas pour être lues mot à mot.
                        </p>
                    </div>
                ),
            },
            {
                label: "Départ",
                title: "C'est parti",
                subtitle: missions.length
                    ? "Vos missions sont assignées. Votre première liste de prospection vous attend."
                    : "Aucune mission ne vous est encore assignée — votre manager s'en occupe.",
                icon: Rocket,
                accent: "bg-emerald-100 text-emerald-600",
                content: (
                    <div className="space-y-4">
                        {missions.length > 0 ? (
                            <div className="space-y-2">
                                {missions.slice(0, 4).map((m) => (
                                    <div
                                        key={m.id}
                                        className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3"
                                    >
                                        <Target className="w-4 h-4 flex-shrink-0 mt-0.5 text-primary" />
                                        <div className="min-w-0">
                                            <p className="text-sm font-bold text-slate-900 truncate">
                                                {m.name}
                                            </p>
                                            <p className="text-[11px] text-slate-500 truncate">
                                                {m.clientName}
                                                {m.objective ? ` · ${m.objective}` : ""}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                                {missions.length > 4 && (
                                    <p className="text-[11px] font-semibold text-slate-400">
                                        + {missions.length - 4} autre
                                        {missions.length - 4 > 1 ? "s" : ""} mission
                                        {missions.length - 4 > 1 ? "s" : ""}
                                    </p>
                                )}
                            </div>
                        ) : (
                            <p className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
                                Vous verrez vos listes apparaître dès qu&apos;une mission vous sera
                                assignée. Le poste d&apos;appel reste accessible pour vous familiariser
                                avec l&apos;interface.
                            </p>
                        )}

                        {!micPassed && (
                            <p className="text-[11px] font-semibold text-amber-600">
                                Rappel : le test micro n&apos;a pas été validé. Vous pourrez le refaire
                                depuis vos paramètres.
                            </p>
                        )}
                    </div>
                ),
            },
        ],
        [hasLine, providerLabel, telephony?.assignedNumber, handleMicPass, missions, micPassed],
    );

    return (
        <OnboardingWizard
            isOpen={isOpen}
            badge="Onboarding SDR"
            heading="Bienvenue dans la force de frappe commerciale"
            steps={steps}
            completeLabel={firstList ? "Ouvrir ma première liste" : "Accéder au poste d'appel"}
            onComplete={() => onComplete("/sdr/action")}
            onSkip={onSkip}
        />
    );
}
