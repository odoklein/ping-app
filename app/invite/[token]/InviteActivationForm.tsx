"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";
import {
    AlertCircle,
    ArrowRight,
    BadgeCheck,
    CheckCircle2,
    Clock,
    Eye,
    EyeOff,
    Loader2,
    Lock,
    LockKeyhole,
    MailCheck,
    ShieldOff,
    Sparkles,
} from "lucide-react";
import { ElanLogo } from "@/components/brand/ElanLogo";
import { cn } from "@/lib/utils";

// ──────────────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────────────

type VerifyError =
    | "MISSING_TOKEN"
    | "INVALID_TOKEN"
    | "ALREADY_ACCEPTED"
    | "EXPIRED"
    | "REVOKED";

interface VerifiedInvitation {
    email: string;
    name: string | null;
    role: string;
    roleLabel: string;
    clientName: string | null;
    inviterName: string | null;
    expiresAt: string;
    daysRemaining: number;
}

// ──────────────────────────────────────────────────────────────────────────────
// Password strength (mirrors lib/invitations.scorePassword)
// ──────────────────────────────────────────────────────────────────────────────

const MIN_PASSWORD_LENGTH = 8;

const STRENGTH_LEVELS = [
    { label: "Très faible", bar: "bg-rose-500", text: "text-rose-600" },
    { label: "Faible", bar: "bg-rose-500", text: "text-rose-600" },
    { label: "Moyen", bar: "bg-amber-500", text: "text-amber-600" },
    { label: "Robuste", bar: "bg-emerald-500", text: "text-emerald-600" },
    { label: "Excellent", bar: "bg-emerald-600", text: "text-emerald-700" },
];

function scorePassword(password: string) {
    const checks = {
        length: password.length >= MIN_PASSWORD_LENGTH,
        upper: /[A-Z]/.test(password),
        lower: /[a-z]/.test(password),
        digit: /\d/.test(password),
        symbol: /[^A-Za-z0-9]/.test(password),
    };
    const passed = Object.values(checks).filter(Boolean).length;
    const score = checks.length ? Math.max(1, passed - 1) : Math.min(1, passed);
    return { score, checks };
}

// ──────────────────────────────────────────────────────────────────────────────
// Shells
// ──────────────────────────────────────────────────────────────────────────────

function InviteShell({ children }: { children: React.ReactNode }) {
    return (
        <main className="min-h-[100dvh] bg-[#FCFAFF] flex flex-col items-center justify-center px-5 py-10">
            <div className="w-full max-w-[460px]">
                <div className="flex items-center justify-between mb-7">
                    <ElanLogo tone="petrol" className="text-[34px]" />
                    <span className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full bg-blue-50 text-primary border border-blue-100">
                        <LockKeyhole className="w-3 h-3" />
                        Espace Sécurisé
                    </span>
                </div>
                {children}
                <p className="mt-6 flex items-center justify-center gap-2 text-[11px] font-medium text-slate-400">
                    <LockKeyhole className="w-3 h-3" />
                    Connexion chiffrée TLS 256 bits · Suzalink Systems
                </p>
            </div>
        </main>
    );
}

function StateCard({
    icon: Icon,
    tone,
    title,
    description,
    children,
}: {
    icon: React.ElementType;
    tone: "danger" | "warning" | "success";
    title: string;
    description: string;
    children?: React.ReactNode;
}) {
    const tones = {
        danger: "bg-rose-50 text-rose-600 border-rose-100",
        warning: "bg-amber-50 text-amber-600 border-amber-100",
        success: "bg-emerald-50 text-emerald-600 border-emerald-100",
    } as const;

    return (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-8 shadow-xl shadow-slate-900/5 text-center">
            <div
                className={cn(
                    "w-14 h-14 rounded-2xl border flex items-center justify-center mx-auto mb-5",
                    tones[tone],
                )}
            >
                <Icon className="w-7 h-7" />
            </div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">{title}</h1>
            <p className="text-sm text-slate-500 mt-2 leading-relaxed">{description}</p>
            {children && <div className="mt-6">{children}</div>}
        </div>
    );
}

// ──────────────────────────────────────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────────────────────────────────────

export default function InviteActivationForm({ token }: { token: string }) {
    const router = useRouter();

    const [checking, setChecking] = useState(true);
    const [invitation, setInvitation] = useState<VerifiedInvitation | null>(null);
    const [verifyError, setVerifyError] = useState<VerifyError | null>(null);

    const [name, setName] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [formError, setFormError] = useState("");
    const [activated, setActivated] = useState(false);

    const [resendRequested, setResendRequested] = useState(false);
    const [resendLoading, setResendLoading] = useState(false);

    // ── Verify the token before showing anything ──
    useEffect(() => {
        let cancelled = false;

        (async () => {
            try {
                const res = await fetch(
                    `/api/invitations/verify?token=${encodeURIComponent(token)}`,
                    { cache: "no-store" },
                );
                const json = await res.json();
                if (cancelled) return;

                if (json?.success && json.data?.valid) {
                    const inv = json.data.invitation as VerifiedInvitation;
                    setInvitation(inv);
                    setName(inv.name ?? "");
                } else {
                    setVerifyError((json?.data?.error as VerifyError) ?? "INVALID_TOKEN");
                }
            } catch {
                if (!cancelled) setVerifyError("INVALID_TOKEN");
            } finally {
                if (!cancelled) setChecking(false);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [token]);

    const strength = useMemo(() => scorePassword(password), [password]);
    const level = STRENGTH_LEVELS[Math.min(strength.score, STRENGTH_LEVELS.length - 1)];

    const canSubmit =
        !submitting &&
        name.trim().length >= 2 &&
        strength.checks.length &&
        password === confirmPassword;

    const handleRequestResend = useCallback(async () => {
        setResendLoading(true);
        try {
            await fetch("/api/invitations/request-resend", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token }),
            });
            setResendRequested(true);
        } catch {
            setResendRequested(true);
        } finally {
            setResendLoading(false);
        }
    }, [token]);

    const handleActivate = async () => {
        setFormError("");

        if (name.trim().length < 2) {
            setFormError("Renseignez votre nom complet.");
            return;
        }
        if (!strength.checks.length) {
            setFormError(`Le mot de passe doit comporter au moins ${MIN_PASSWORD_LENGTH} caractères.`);
            return;
        }
        if (password !== confirmPassword) {
            setFormError("Les deux mots de passe ne correspondent pas.");
            return;
        }

        setSubmitting(true);
        try {
            const res = await fetch("/api/invitations/accept", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token, password, name: name.trim() }),
            });
            const json = await res.json();

            if (!res.ok || !json?.success) {
                setFormError(json?.error || "L'activation a échoué. Réessayez.");
                setSubmitting(false);
                return;
            }

            setActivated(true);
            const redirectPath: string = json.data?.redirectPath || "/dashboard";

            // Sign the invitee straight in, then hand off to their role dashboard
            // with ?welcome=true so the onboarding wizard opens.
            const signInResult = await signIn("credentials", {
                email: invitation?.email,
                password,
                redirect: false,
            });

            const separator = redirectPath.includes("?") ? "&" : "?";
            if (signInResult?.ok) {
                router.replace(`${redirectPath}${separator}welcome=true`);
            } else {
                router.replace("/login?activated=1");
            }
        } catch {
            setFormError("Une erreur réseau est survenue. Réessayez.");
            setSubmitting(false);
        }
    };

    // ── Loading ──
    if (checking) {
        return (
            <InviteShell>
                <div className="bg-white rounded-3xl border border-slate-200/80 p-10 shadow-xl shadow-slate-900/5 flex flex-col items-center gap-4">
                    <div className="w-9 h-9 rounded-full border-[3px] border-slate-200 border-t-primary animate-spin" />
                    <p className="text-xs font-bold text-slate-500">
                        Vérification de votre invitation…
                    </p>
                </div>
            </InviteShell>
        );
    }

    // ── Error states ──
    if (verifyError === "ALREADY_ACCEPTED") {
        return (
            <InviteShell>
                <StateCard
                    icon={BadgeCheck}
                    tone="success"
                    title="Vous avez déjà activé ce compte"
                    description="Cette invitation a servi à créer votre compte. Connectez-vous avec votre email et votre mot de passe."
                >
                    <Link
                        href="/login"
                        className="inline-flex items-center justify-center gap-2 w-full rounded-2xl bg-primary px-5 py-3.5 text-sm font-bold text-white transition-colors hover:bg-[#1B7BE0]"
                    >
                        Aller à la connexion
                        <ArrowRight className="w-4 h-4" />
                    </Link>
                </StateCard>
            </InviteShell>
        );
    }

    if (verifyError === "EXPIRED") {
        return (
            <InviteShell>
                <StateCard
                    icon={Clock}
                    tone="warning"
                    title="Ce lien d'invitation a expiré"
                    description="Les liens d'activation sont valables 7 jours. Demandez un nouveau lien à la personne qui vous a invité."
                >
                    {resendRequested ? (
                        <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3.5 flex items-center gap-2.5 text-xs font-semibold text-emerald-700">
                            <MailCheck className="w-4 h-4 flex-shrink-0" />
                            Demande envoyée. Votre manager va vous renvoyer un lien.
                        </div>
                    ) : (
                        <button
                            type="button"
                            onClick={handleRequestResend}
                            disabled={resendLoading}
                            className="inline-flex items-center justify-center gap-2 w-full rounded-2xl bg-primary px-5 py-3.5 text-sm font-bold text-white transition-colors hover:bg-[#1B7BE0] disabled:opacity-60"
                        >
                            {resendLoading ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <ArrowRight className="w-4 h-4" />
                            )}
                            Demander un nouveau lien
                        </button>
                    )}
                    <Link
                        href="/login"
                        className="mt-3 inline-block text-xs font-bold text-slate-500 hover:text-primary"
                    >
                        Retour à la connexion
                    </Link>
                </StateCard>
            </InviteShell>
        );
    }

    if (verifyError || !invitation) {
        const revoked = verifyError === "REVOKED";
        return (
            <InviteShell>
                <StateCard
                    icon={revoked ? ShieldOff : AlertCircle}
                    tone="danger"
                    title={revoked ? "Cette invitation a été révoquée" : "Lien d'invitation invalide"}
                    description={
                        revoked
                            ? "L'accès associé à ce lien a été annulé par un manager. Contactez votre équipe si c'est une erreur."
                            : "Ce lien est incomplet ou n'existe pas. Vérifiez que vous avez copié l'URL entière depuis votre email."
                    }
                >
                    <a
                        href="mailto:support@suzaliconseil.com"
                        className="inline-flex items-center justify-center gap-2 w-full rounded-2xl border border-slate-200 bg-white px-5 py-3.5 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50"
                    >
                        Contacter le support
                    </a>
                    <Link
                        href="/login"
                        className="mt-3 inline-block text-xs font-bold text-slate-500 hover:text-primary"
                    >
                        Retour à la connexion
                    </Link>
                </StateCard>
            </InviteShell>
        );
    }

    // ── Success handoff (brief, while signIn resolves) ──
    if (activated) {
        return (
            <InviteShell>
                <StateCard
                    icon={CheckCircle2}
                    tone="success"
                    title="Compte activé"
                    description="Nous vous connectons à votre console…"
                >
                    <div className="flex justify-center">
                        <Loader2 className="w-5 h-5 text-primary animate-spin" />
                    </div>
                </StateCard>
            </InviteShell>
        );
    }

    // ── Activation form ──
    const fieldClass =
        "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-primary focus:ring-2 focus:ring-primary/15";
    const labelClass = "block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5";

    return (
        <InviteShell>
            <div className="bg-white rounded-3xl border border-slate-200/80 p-8 shadow-xl shadow-slate-900/5">
                <div className="mb-6">
                    <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-primary bg-blue-50 px-2.5 py-1 rounded-md">
                        <Sparkles className="w-3 h-3" />
                        Invitation {invitation.roleLabel}
                    </span>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-3">
                        Rejoignez l&apos;équipe sur Ping
                    </h1>
                    <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                        {invitation.inviterName
                            ? `Invité par ${invitation.inviterName}`
                            : "Vous avez été invité"}
                        {invitation.clientName ? ` · Compte ${invitation.clientName}` : ""}
                    </p>
                </div>

                {formError && (
                    <div className="mb-5 p-3 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2 text-xs font-semibold text-red-700">
                        <AlertCircle className="w-4 h-4 flex-shrink-0 mt-px" />
                        <span>{formError}</span>
                    </div>
                )}

                <div className="space-y-4">
                    {/* Email (verified, read-only) */}
                    <div>
                        <label className={labelClass}>Adresse email</label>
                        <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                            <span className="text-sm font-semibold text-slate-700 truncate">
                                {invitation.email}
                            </span>
                            <span className="inline-flex items-center gap-1 flex-shrink-0 text-[10px] font-bold uppercase tracking-wide text-emerald-600">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Vérifié
                            </span>
                        </div>
                    </div>

                    {/* Name */}
                    <div>
                        <label className={labelClass} htmlFor="invite-name">
                            Votre nom complet
                        </label>
                        <input
                            id="invite-name"
                            className={fieldClass}
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Alex Martin"
                            autoComplete="name"
                        />
                    </div>

                    {/* Password */}
                    <div>
                        <label className={labelClass} htmlFor="invite-password">
                            Définir votre mot de passe
                        </label>
                        <div className="relative">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                id="invite-password"
                                className={cn(fieldClass, "pl-11 pr-11")}
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••••••"
                                autoComplete="new-password"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword((v) => !v)}
                                className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
                                aria-label={showPassword ? "Masquer" : "Afficher"}
                            >
                                {showPassword ? (
                                    <EyeOff className="w-4 h-4" />
                                ) : (
                                    <Eye className="w-4 h-4" />
                                )}
                            </button>
                        </div>

                        {/* Strength meter */}
                        {password.length > 0 && (
                            <div className="mt-2.5">
                                <div className="flex items-center gap-1.5">
                                    {[0, 1, 2, 3].map((i) => (
                                        <div
                                            key={i}
                                            className={cn(
                                                "h-1.5 flex-1 rounded-full transition-colors",
                                                i < strength.score ? level.bar : "bg-slate-200",
                                            )}
                                        />
                                    ))}
                                    <span className={cn("ml-1.5 text-[11px] font-bold", level.text)}>
                                        {level.label}
                                    </span>
                                </div>
                                <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
                                    {[
                                        { ok: strength.checks.length, label: `${MIN_PASSWORD_LENGTH} caractères` },
                                        { ok: strength.checks.upper, label: "Majuscule" },
                                        { ok: strength.checks.digit, label: "Chiffre" },
                                        { ok: strength.checks.symbol, label: "Symbole" },
                                    ].map((c) => (
                                        <span
                                            key={c.label}
                                            className={cn(
                                                "inline-flex items-center gap-1 text-[10px] font-semibold",
                                                c.ok ? "text-emerald-600" : "text-slate-400",
                                            )}
                                        >
                                            <CheckCircle2 className="w-3 h-3" />
                                            {c.label}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Confirm */}
                    <div>
                        <label className={labelClass} htmlFor="invite-confirm">
                            Confirmer le mot de passe
                        </label>
                        <input
                            id="invite-confirm"
                            className={cn(
                                fieldClass,
                                confirmPassword.length > 0 &&
                                    password !== confirmPassword &&
                                    "border-rose-300 focus:border-rose-400 focus:ring-rose-400/15",
                            )}
                            type={showPassword ? "text" : "password"}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter" && canSubmit) handleActivate();
                            }}
                            placeholder="••••••••••••"
                            autoComplete="new-password"
                        />
                        {confirmPassword.length > 0 && password !== confirmPassword && (
                            <p className="mt-1.5 text-[11px] font-semibold text-rose-600">
                                Les mots de passe ne correspondent pas.
                            </p>
                        )}
                    </div>

                    <button
                        type="button"
                        onClick={handleActivate}
                        disabled={!canSubmit}
                        className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-3.5 text-sm font-bold text-white transition-colors hover:bg-[#1B7BE0] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {submitting ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Activation…
                            </>
                        ) : (
                            <>
                                Activer mon compte &amp; accéder à la console
                                <ArrowRight className="w-4 h-4" />
                            </>
                        )}
                    </button>
                </div>

                <p className="mt-5 pt-5 border-t border-slate-100 text-[11px] text-slate-400 text-center">
                    Ce lien est personnel et expire dans{" "}
                    <strong className="text-slate-600">
                        {invitation.daysRemaining} jour{invitation.daysRemaining > 1 ? "s" : ""}
                    </strong>
                    .
                </p>
            </div>
        </InviteShell>
    );
}
