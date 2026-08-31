"use client";

import { useEffect, useRef, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import {
    AlertCircle,
    ArrowRight,
    ChevronLeft,
    ChevronRight,
    Eye,
    EyeOff,
    Loader2,
    Lock,
    Mail,
    ShieldCheck,
    Trash2,
    UserCircle2,
} from "lucide-react";
import { ElanLogo } from "@/components/brand/ElanLogo";
import { CadenceBars } from "@/components/brand/CadenceBars";
import { trackLogin } from "@/lib/analytics/umami";
import {
    getRecentAccounts,
    removeRecentAccount,
    saveRecentAccount,
    type RecentAccount,
} from "@/lib/auth-recent-accounts";

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────

/** Derive two-letter initials from a display name */
function getInitials(name: string): string {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "?";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Deterministic hue from a string — ensures each user gets a consistent color */
function getAvatarHue(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return Math.abs(hash) % 360;
}

/** Turn "john.doe@acme.fr" into a friendly "John Doe" fallback name */
function prettyNameFromEmail(email: string): string {
    const local = (email.split("@")[0] || email).trim();
    const words = local.split(/[._-]+/).filter(Boolean);
    if (words.length === 0) return email;
    return words.map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

/** Relative time in French, e.g. "il y a 2 h" */
function formatRelativeTime(ts: number): string {
    if (!ts) return "";
    const diff = Date.now() - ts;
    const min = Math.floor(diff / 60000);
    if (min < 1) return "à l'instant";
    if (min < 60) return `il y a ${min} min`;
    const hours = Math.floor(min / 60);
    if (hours < 24) return `il y a ${hours} h`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `il y a ${days} j`;
    return new Date(ts).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Map a NextAuth error code to a human message (FR) */
function mapError(code: string | null | undefined): string {
    if (!code) return "";
    if (code.includes("verrouillé") || code.includes("Trop")) return code;
    if (code === "CredentialsSignin") return "Adresse e-mail ou mot de passe incorrect.";
    return "La connexion a échoué. Réessayez dans un instant.";
}

// ──────────────────────────────────────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────────────────────────────────────

export default function LoginForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";
    const errorCode = searchParams.get("error");

    // ── form state ──────────────────────────────────────────────────────────
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [capsOn, setCapsOn] = useState(false);
    const [error, setError] = useState("");
    const [mounted, setMounted] = useState(false);

    // ── recent accounts ─────────────────────────────────────────────────────
    const [recentAccounts, setRecentAccounts] = useState<RecentAccount[]>([]);
    const [view, setView] = useState<"accounts" | "credentials">("accounts");
    const [selectedAccount, setSelectedAccount] = useState<RecentAccount | null>(null);

    const emailInputRef = useRef<HTMLInputElement>(null);
    const passwordInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const frame = requestAnimationFrame(() => setMounted(true));
        return () => cancelAnimationFrame(frame);
    }, []);

    // Surface URL-provided errors (e.g. expired session) once, in-place.
    useEffect(() => {
        if (errorCode) {
            setError(mapError(errorCode));
            trackLogin(false);
        }
    }, [errorCode]);

    // Load persisted accounts on mount
    useEffect(() => {
        const stored = getRecentAccounts();
        setRecentAccounts(stored);
        if (stored.length === 0) setView("credentials");
    }, []);

    // Focus the right field when entering the credentials view
    useEffect(() => {
        if (view !== "credentials") return;
        requestAnimationFrame(() => {
            if (selectedAccount) passwordInputRef.current?.focus();
            else emailInputRef.current?.focus();
        });
    }, [view, selectedAccount]);

    // ── navigation between views ──────────────────────────────────────────────
    const openAccount = (account: RecentAccount) => {
        setSelectedAccount(account);
        setEmail(account.email);
        setPassword("");
        setError("");
        setView("credentials");
    };

    const openFreshForm = () => {
        setSelectedAccount(null);
        setEmail("");
        setPassword("");
        setError("");
        setView("credentials");
    };

    const backToAccounts = () => {
        setView("accounts");
        setSelectedAccount(null);
        setPassword("");
        setError("");
    };

    // ── forget account ───────────────────────────────────────────────────────
    const handleForgetAccount = (e: React.MouseEvent, targetEmail: string) => {
        e.stopPropagation();
        removeRecentAccount(targetEmail);
        const updated = getRecentAccounts();
        setRecentAccounts(updated);
        if (updated.length === 0) openFreshForm();
    };

    // ── submit (single, clean path) ────────────────────────────────────────────
    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        if (isLoading) return;

        const trimmedEmail = email.trim();
        if (!EMAIL_RE.test(trimmedEmail)) {
            setError("Saisissez une adresse e-mail valide.");
            emailInputRef.current?.focus();
            return;
        }
        if (!password) {
            setError("Saisissez votre mot de passe.");
            passwordInputRef.current?.focus();
            return;
        }

        setIsLoading(true);
        setError("");

        try {
            const result = await signIn("credentials", {
                email: trimmedEmail,
                password,
                callbackUrl,
                redirect: false,
            });

            if (result?.ok && !result?.error) {
                // Resolve the real display name / avatar from the session so the
                // saved account card shows a proper name (not the raw email).
                let name = selectedAccount?.name || prettyNameFromEmail(trimmedEmail);
                let avatarUrl = selectedAccount?.avatarUrl;
                try {
                    const res = await fetch("/api/auth/session");
                    if (res.ok) {
                        const session = await res.json();
                        if (session?.user?.name) name = session.user.name;
                        if (session?.user?.image) avatarUrl = session.user.image;
                    }
                } catch {
                    /* non-fatal: fall back to derived name */
                }

                saveRecentAccount({ email: trimmedEmail, name, avatarUrl });
                trackLogin(true);
                router.push(callbackUrl);
                return; // keep spinner until navigation completes
            }

            // Failure — stay on the page and show a real message.
            setError(mapError(result?.error) || "Adresse e-mail ou mot de passe incorrect.");
            trackLogin(false);
        } catch {
            setError("La connexion a échoué. Réessayez dans un instant.");
            trackLogin(false);
        } finally {
            setIsLoading(false);
        }
    };

    // ── avatar cell ──────────────────────────────────────────────────────────
    // When `size` is omitted, sizing comes from CSS (so responsive rules apply).
    const AvatarCell = ({ account, size }: { account: RecentAccount; size?: number }) => {
        const hue = getAvatarHue(account.email);
        const dims = size ? { width: size, height: size } : undefined;
        if (account.avatarUrl) {
            return (
                <img
                    src={account.avatarUrl}
                    alt=""
                    className="elan-account-avatar-img"
                    style={dims}
                />
            );
        }
        return (
            <div
                className="elan-account-avatar-initials"
                style={{
                    ...(size ? { ...dims, fontSize: size * 0.36 } : {}),
                    background: `hsl(${hue} 42% 88%)`,
                    color: `hsl(${hue} 60% 32%)`,
                }}
            >
                {getInitials(account.name)}
            </div>
        );
    };

    const errorBanner = error ? (
        <div className="elan-login-error" role="alert">
            <AlertCircle size={17} aria-hidden="true" />
            <span>{error}</span>
        </div>
    ) : null;

    // ──────────────────────────────────────────────────────────────────────────
    // Render
    // ──────────────────────────────────────────────────────────────────────────
    return (
        <main className={`elan-login${mounted ? " is-ready" : ""}`}>
            {/* ── Brand panel (left) ── */}
            <aside className="elan-login-brand" aria-label="Présentation Prospecto">
                <div className="elan-login-brand-top">
                    <ElanLogo className="text-[52px]" />
                </div>

                <div className="elan-login-message">
                    <p className="elan-login-kicker">Votre cockpit commercial</p>
                    <h1>La prospection, enfin pilotée.</h1>
                    <p>
                        Pilotez l&apos;activité, gardez le cap et transformez chaque action en résultat mesurable.
                    </p>

                    <ul className="elan-login-highlights">
                        <li><span aria-hidden="true" /> Priorisez chaque appel automatiquement</li>
                        <li><span aria-hidden="true" /> Suivez la cadence de votre plateau</li>
                        <li><span aria-hidden="true" /> Mesurez ce qui transforme vraiment</li>
                    </ul>
                </div>

                <div className="elan-login-signature">
                    <CadenceBars count={46} highlightFrom={0.74} dark />
                    <span>Priorités, cadence, résultats</span>
                </div>
            </aside>

            {/* ── Form panel (right) ── */}
            <section className="elan-login-form-shell">
                <div className="elan-login-form-wrap">
                    <ElanLogo tone="petrol" className="elan-login-mobile-logo text-[38px]" />

                    {view === "accounts" && recentAccounts.length > 0 ? (
                        /* ── Recent accounts view ── */
                        <>
                            <header className="elan-login-heading">
                                <p>Votre espace de travail</p>
                                <h2>Bon retour.</h2>
                                <span>Sélectionnez votre compte pour continuer.</span>
                            </header>

                            {errorBanner}

                            <ul className="elan-recent-accounts" aria-label="Comptes récents">
                                <p className="elan-recent-accounts-label">Comptes récents</p>

                                {recentAccounts.map((account) => (
                                    <li key={account.email} className="elan-account-card">
                                        <button
                                            type="button"
                                            className="elan-account-hit"
                                            onClick={() => openAccount(account)}
                                            aria-label={`Continuer en tant que ${account.name}`}
                                        >
                                            <span className="elan-account-avatar">
                                                <AvatarCell account={account} />
                                            </span>

                                            <span className="elan-account-info">
                                                <span className="elan-account-name">{account.name}</span>
                                                <span className="elan-account-email">{account.email}</span>
                                                {account.lastLoginAt ? (
                                                    <span className="elan-account-meta">
                                                        {formatRelativeTime(account.lastLoginAt)}
                                                    </span>
                                                ) : null}
                                            </span>

                                            <ChevronRight size={18} className="elan-account-chevron" aria-hidden="true" />
                                        </button>

                                        <button
                                            type="button"
                                            className="elan-account-remove"
                                            onClick={(e) => handleForgetAccount(e, account.email)}
                                            aria-label={`Oublier le compte ${account.email}`}
                                            title="Oublier ce compte"
                                        >
                                            <Trash2 size={15} aria-hidden="true" />
                                        </button>
                                    </li>
                                ))}

                                <button type="button" className="elan-account-other" onClick={openFreshForm}>
                                    <UserCircle2 size={18} aria-hidden="true" />
                                    Utiliser un autre compte
                                </button>
                            </ul>

                            <div className="elan-login-security">
                                <ShieldCheck size={18} aria-hidden="true" />
                                <div>
                                    <strong>Accès sécurisé</strong>
                                    <span>Aucun mot de passe n&apos;est stocké sur cet appareil.</span>
                                </div>
                            </div>
                        </>
                    ) : (
                        /* ── Credentials view (welcome-back OR fresh) ── */
                        <>
                            {selectedAccount ? (
                                <>
                                    <button
                                        type="button"
                                        className="elan-login-back-accounts"
                                        onClick={backToAccounts}
                                    >
                                        <ChevronLeft size={15} aria-hidden="true" />
                                        Changer de compte
                                    </button>

                                    <div className="elan-login-identity">
                                        <AvatarCell account={selectedAccount} size={58} />
                                        <div>
                                            <p>Content de vous revoir</p>
                                            <h2>{selectedAccount.name}</h2>
                                            <span>{selectedAccount.email}</span>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <header className="elan-login-heading">
                                        <p>Votre espace de travail</p>
                                        <h2>Reprenez la main.</h2>
                                        <span>Connectez-vous pour retrouver votre plateau.</span>
                                    </header>

                                    {recentAccounts.length > 0 && (
                                        <button
                                            type="button"
                                            className="elan-login-back-accounts"
                                            onClick={backToAccounts}
                                        >
                                            <ChevronLeft size={15} aria-hidden="true" />
                                            Comptes récents
                                        </button>
                                    )}
                                </>
                            )}

                            <form onSubmit={handleSubmit} className="elan-login-form" noValidate>
                                {selectedAccount ? (
                                    // Present for password managers (username association), hidden visually.
                                    <input
                                        type="email"
                                        value={email}
                                        readOnly
                                        tabIndex={-1}
                                        aria-hidden="true"
                                        autoComplete="username"
                                        className="elan-login-hidden-username"
                                    />
                                ) : (
                                    <div className="elan-login-field">
                                        <label htmlFor="login-email">Adresse e-mail</label>
                                        <div className="elan-login-input-wrap">
                                            <Mail size={17} aria-hidden="true" />
                                            <input
                                                ref={emailInputRef}
                                                id="login-email"
                                                type="email"
                                                placeholder="vous@entreprise.fr"
                                                value={email}
                                                onChange={(event) => setEmail(event.target.value)}
                                                required
                                                autoComplete="username"
                                                aria-invalid={!!error && !EMAIL_RE.test(email.trim())}
                                            />
                                        </div>
                                    </div>
                                )}

                                <div className="elan-login-field">
                                    <div className="elan-login-label-row">
                                        <label htmlFor="login-password">Mot de passe</label>
                                        <button type="button" onClick={() => router.push("/forgot-password")}>
                                            Mot de passe oublié ?
                                        </button>
                                    </div>
                                    <div className="elan-login-input-wrap">
                                        <Lock size={17} aria-hidden="true" />
                                        <input
                                            ref={passwordInputRef}
                                            id="login-password"
                                            type={showPassword ? "text" : "password"}
                                            placeholder="Votre mot de passe"
                                            value={password}
                                            onChange={(event) => setPassword(event.target.value)}
                                            onKeyUp={(e) => setCapsOn(e.getModifierState("CapsLock"))}
                                            onKeyDown={(e) => setCapsOn(e.getModifierState("CapsLock"))}
                                            onBlur={() => setCapsOn(false)}
                                            required
                                            autoComplete="current-password"
                                        />
                                        <button
                                            type="button"
                                            className="elan-login-eye"
                                            onClick={() => setShowPassword((visible) => !visible)}
                                            aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                                        >
                                            {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                                        </button>
                                    </div>
                                    {capsOn && (
                                        <p className="elan-login-caps" role="status">
                                            <AlertCircle size={13} aria-hidden="true" />
                                            Verrouillage majuscules activé
                                        </p>
                                    )}
                                </div>

                                {errorBanner}

                                <button type="submit" className="elan-login-submit" disabled={isLoading}>
                                    {isLoading ? (
                                        <>
                                            <Loader2 size={18} className="animate-spin" aria-hidden="true" />
                                            Connexion en cours
                                        </>
                                    ) : (
                                        <>
                                            {selectedAccount ? "Continuer" : "Entrer sur le terrain"}
                                            <ArrowRight size={18} aria-hidden="true" />
                                        </>
                                    )}
                                </button>
                            </form>

                            <div className="elan-login-security">
                                <ShieldCheck size={18} aria-hidden="true" />
                                <div>
                                    <strong>Accès sécurisé</strong>
                                    <span>Connexion chiffrée · aucun mot de passe stocké sur l&apos;appareil.</span>
                                </div>
                            </div>
                        </>
                    )}

                    <p className="elan-login-copyright">
                        Prospecto © {new Date().getFullYear()} · Produit par Suzali
                    </p>
                </div>
            </section>
        </main>
    );
}
