"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Lock, Eye, EyeOff, ArrowLeft, AlertCircle, CheckCircle, Loader2, ShieldCheck } from "lucide-react";

function ResetPasswordForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const token = searchParams.get("token") || "";
    const email = searchParams.get("email") || "";

    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [passFocused, setPassFocused] = useState(false);
    const [confirmFocused, setConfirmFocused] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => { requestAnimationFrame(() => setMounted(true)); }, []);

    const isInvalid = !token || !email;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (password.length < 6) {
            setError("Le mot de passe doit contenir au moins 6 caractères");
            return;
        }

        if (password !== confirmPassword) {
            setError("Les mots de passe ne correspondent pas");
            return;
        }

        setIsLoading(true);

        try {
            const res = await fetch("/api/auth/reset-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token, email, password }),
            });

            const data = await res.json();

            if (!res.ok || !data.success) {
                setError(data.error || "Une erreur est survenue");
                setIsLoading(false);
                return;
            }

            setSuccess(true);
        } catch {
            setError("Une erreur est survenue. Veuillez réessayer.");
            setIsLoading(false);
        }
    };

    return (
        <>
            <style>{`
                .lp {
                    --cp950: #080808; --cp700: #1a1a1a; --cp600: var(--brand-primary-hover);
                    --cp500: var(--brand-primary); --cp400: #5baefc; --cp200: #e6f0fa;
                    --ink: #080808; --ink2: rgba(8,8,8,.65); --ink3: rgba(8,8,8,.45);
                    --ink4: rgba(8,8,8,.25); --ink5: rgba(8,8,8,.10);
                    --t: 0.18s cubic-bezier(.4,0,.2,1);
                    --spring: 0.5s cubic-bezier(.22,1,.36,1);

                    font-family: 'DM Sans', system-ui, -apple-system, sans-serif;
                    -webkit-font-smoothing: antialiased;
                    min-height: 100vh;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    padding: 24px 16px;
                    position: relative;
                    overflow: hidden;

                    background:
                        radial-gradient(55.87% 55.87% at 35.49% -18.37%, rgba(var(--brand-primary-rgb), 0.16) 0%, rgba(255,255,255,0) 100%),
                        radial-gradient(70.81% 48.44% at -24.53% -16.02%, rgba(var(--brand-primary-rgb), 0.12) 0%, rgba(255,255,255,0) 100%),
                        radial-gradient(91.61% 92.58% at 104.86% -43.36%, rgba(8, 8, 8, 0.06) 0%, rgba(255,255,255,0) 100%),
                        #f8f8f8;
                }

                .lp-card {
                    position: relative; z-index: 1;
                    width: 100%; max-width: 380px;
                    padding: 32px 28px 28px;
                    border-radius: 20px;
                    background: rgba(255, 255, 255, 0.95);
                    backdrop-filter: blur(20px) saturate(150%);
                    -webkit-backdrop-filter: blur(20px) saturate(150%);
                    border: 1px solid rgba(8, 8, 8, 0.10);
                    box-shadow:
                        0 20px 45px -12px rgba(8, 8, 8, 0.12),
                        inset 0 1px 0 rgba(255, 255, 255, 0.95);
                    opacity: 0;
                    transform: translateY(16px) scale(.98);
                    transition: opacity .45s var(--spring, ease), transform .45s var(--spring, ease);
                }
                .lp-card.show {
                    opacity: 1;
                    transform: translateY(0) scale(1);
                }

                .lp-inner {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 0;
                }

                .lp-card.show .lp-inner > * {
                    animation: lpUp .45s var(--spring, ease) both;
                }
                .lp-card.show .lp-inner > *:nth-child(1) { animation-delay:.04s }
                .lp-card.show .lp-inner > *:nth-child(2) { animation-delay:.09s }
                .lp-card.show .lp-inner > *:nth-child(3) { animation-delay:.14s }
                .lp-card.show .lp-inner > *:nth-child(4) { animation-delay:.19s }
                .lp-card.show .lp-inner > *:nth-child(5) { animation-delay:.24s }
                .lp-card.show .lp-inner > *:nth-child(6) { animation-delay:.29s }

                .lp-logo {
                    margin-bottom: 20px;
                    height: 38px;
                    width: auto;
                    max-width: 140px;
                    object-fit: contain;
                }

                .lp-head { text-align: center; margin-bottom: 24px; width: 100%; }
                .lp-head h1 {
                    font-weight: 700; font-size: 20px; line-height: 1.25;
                    letter-spacing: -.3px; color: var(--ink); margin: 0;
                }
                .lp-head p {
                    margin: 4px 0 0; font-size: 13px; font-weight: 400;
                    color: var(--ink3);
                }

                .lp-field { width: 100%; margin-bottom: 14px; }
                .lp-label {
                    display: block; font-size: 11px; font-weight: 600;
                    letter-spacing: .05em; text-transform: uppercase;
                    color: var(--ink2); margin-bottom: 6px;
                }

                .lp-wrap {
                    display: flex; align-items: center;
                    height: 46px; border-radius: 12px;
                    border: 1.5px solid var(--ink5);
                    background: #ffffff;
                    transition: border-color var(--t), box-shadow var(--t), background var(--t);
                }
                .lp-wrap:hover { border-color: var(--ink4); }
                .lp-wrap.f {
                    border-color: var(--cp500);
                    box-shadow: 0 0 0 3px rgba(var(--brand-primary-rgb), 0.18);
                    background: #ffffff;
                }
                .lp-wrap.err {
                    border-color: #f87171;
                    box-shadow: 0 0 0 3px rgba(248,113,113,.08);
                }

                .lp-ico {
                    display: flex; align-items: center; justify-content: center;
                    width: 42px; height: 100%; flex-shrink: 0;
                    color: var(--ink3); transition: color var(--t);
                }
                .lp-wrap.f .lp-ico { color: var(--cp500); }

                .lp-in {
                    flex: 1; height: 100%; padding: 0 12px 0 0;
                    font-family: inherit; font-size: 13.5px; font-weight: 400;
                    color: var(--ink); background: transparent; border: none; outline: none;
                }
                .lp-in::placeholder { color: var(--ink4); }

                .lp-trail {
                    display: flex; align-items: center; justify-content: center;
                    width: 38px; height: 100%; flex-shrink: 0;
                }
                .lp-eye {
                    display: flex; align-items: center; justify-content: center;
                    width: 28px; height: 28px; border-radius: 6px;
                    background: transparent; border: none; cursor: pointer;
                    color: var(--ink3); transition: color var(--t), background var(--t);
                }
                .lp-eye:hover { color: var(--ink); background: var(--cp200); }

                .lp-err {
                    width: 100%; display: flex; align-items: center; gap: 8px;
                    padding: 10px 12px; border-radius: 10px; margin-bottom: 14px;
                    background: #fef2f2; border: 1px solid #fecaca;
                    color: #dc2626; font-size: 12.5px; font-weight: 500;
                    animation: lpShake .4s ease;
                }

                .lp-success {
                    width: 100%; display: flex; align-items: flex-start; gap: 10px;
                    padding: 14px 16px; border-radius: 12px; margin-bottom: 14px;
                    background: #f0fdf4; border: 1px solid #bbf7d0;
                    color: #15803d; font-size: 13px; font-weight: 500;
                    line-height: 1.5;
                }

                .lp-btn {
                    width: 100%; height: 46px; border-radius: 12px; border: none;
                    background: linear-gradient(160deg, #4da4fc 0%, var(--cp500) 50%, var(--cp600) 100%);
                    box-shadow: 0 4px 14px rgba(var(--brand-primary-rgb), 0.25);
                    color: #fff; font-family: inherit; font-weight: 600;
                    font-size: 14px; letter-spacing: .01em;
                    cursor: pointer; display: flex; align-items: center;
                    justify-content: center; gap: 7px;
                    transition: filter var(--t), transform var(--t), box-shadow var(--t);
                    margin-bottom: 16px;
                }
                .lp-btn:hover:not(:disabled) {
                    filter: brightness(1.04); transform: translateY(-1px);
                    box-shadow: 0 6px 20px rgba(var(--brand-primary-rgb), 0.35);
                }
                .lp-btn:active:not(:disabled) { filter: brightness(.96); transform: translateY(0); }
                .lp-btn:disabled { opacity: .55; cursor: not-allowed; }

                .lp-back {
                    display: flex; align-items: center; gap: 6px;
                    font-family: inherit; font-size: 13px; font-weight: 500;
                    color: var(--cp500); background: none; border: none;
                    cursor: pointer; padding: 0; transition: color var(--t);
                }
                .lp-back:hover { color: var(--cp600); }

                .lp-footer {
                    position: relative; z-index: 1;
                    font-size: 11px; color: var(--ink4); text-align: center;
                    margin-top: 20px; font-family: inherit;
                }

                @keyframes lpUp {
                    from { opacity: 0; transform: translateY(14px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
                @keyframes lpShake {
                    0%,100% { transform: translateX(0); }
                    20% { transform: translateX(-5px); }
                    40% { transform: translateX(5px); }
                    60% { transform: translateX(-3px); }
                    80% { transform: translateX(3px); }
                }

                @media (max-width: 400px) {
                    .lp-card { padding: 24px 20px 22px; max-width: 100%; }
                    .lp-head h1 { font-size: 18px; }
                }
            `}</style>

            <div className="lp">
                <div className={`lp-card${mounted ? " show" : ""}`}>
                    <div className="lp-inner">

                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src="/brand/ping-logo-blue.png"
                            alt="Ping"
                            className="lp-logo"
                            draggable={false}
                        />

                        {isInvalid ? (
                            <>
                                <div className="lp-head">
                                    <h1>Lien invalide</h1>
                                    <p>Ce lien de réinitialisation est invalide ou a expiré</p>
                                </div>
                                <div className="lp-err" style={{ animation: "none" }}>
                                    <AlertCircle size={14} style={{ flexShrink: 0 }} />
                                    <span>Veuillez refaire une demande de réinitialisation depuis la page de connexion.</span>
                                </div>
                                <div style={{ display: "flex", justifyContent: "center" }}>
                                    <button
                                        type="button"
                                        className="lp-back"
                                        onClick={() => router.push("/forgot-password")}
                                    >
                                        <ArrowLeft size={14} />
                                        Nouvelle demande
                                    </button>
                                </div>
                            </>
                        ) : success ? (
                            <>
                                <div className="lp-head">
                                    <h1>Mot de passe modifié</h1>
                                </div>
                                <div className="lp-success">
                                    <CheckCircle size={18} style={{ flexShrink: 0, marginTop: 1 }} />
                                    <span>Votre mot de passe a été réinitialisé avec succès. Vous pouvez maintenant vous connecter.</span>
                                </div>
                                <button
                                    type="button"
                                    className="lp-btn"
                                    onClick={() => router.push("/login")}
                                >
                                    <ShieldCheck size={15} />
                                    <span>Se connecter</span>
                                </button>
                            </>
                        ) : (
                            <>
                                <div className="lp-head">
                                    <h1>Nouveau mot de passe</h1>
                                    <p>Choisissez un nouveau mot de passe pour votre compte</p>
                                </div>

                                <form onSubmit={handleSubmit} style={{ width: "100%" }} noValidate>
                                    <div className="lp-field">
                                        <label className="lp-label" htmlFor="rp-pass">Nouveau mot de passe</label>
                                        <div className={`lp-wrap${passFocused ? " f" : ""}${error ? " err" : ""}`}>
                                            <div className="lp-ico"><Lock size={15} /></div>
                                            <input
                                                id="rp-pass"
                                                className="lp-in"
                                                type={showPassword ? "text" : "password"}
                                                placeholder="Au moins 6 caractères"
                                                value={password}
                                                onChange={e => setPassword(e.target.value)}
                                                onFocus={() => setPassFocused(true)}
                                                onBlur={() => setPassFocused(false)}
                                                required
                                                autoComplete="new-password"
                                                autoFocus
                                            />
                                            <div className="lp-trail">
                                                <button
                                                    type="button"
                                                    className="lp-eye"
                                                    onClick={() => setShowPassword(!showPassword)}
                                                    tabIndex={-1}
                                                    aria-label={showPassword ? "Masquer" : "Afficher"}
                                                >
                                                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="lp-field" style={{ marginBottom: 18 }}>
                                        <label className="lp-label" htmlFor="rp-confirm">Confirmer le mot de passe</label>
                                        <div className={`lp-wrap${confirmFocused ? " f" : ""}${error ? " err" : ""}`}>
                                            <div className="lp-ico"><Lock size={15} /></div>
                                            <input
                                                id="rp-confirm"
                                                className="lp-in"
                                                type={showConfirm ? "text" : "password"}
                                                placeholder="Retapez le mot de passe"
                                                value={confirmPassword}
                                                onChange={e => setConfirmPassword(e.target.value)}
                                                onFocus={() => setConfirmFocused(true)}
                                                onBlur={() => setConfirmFocused(false)}
                                                required
                                                autoComplete="new-password"
                                            />
                                            <div className="lp-trail">
                                                <button
                                                    type="button"
                                                    className="lp-eye"
                                                    onClick={() => setShowConfirm(!showConfirm)}
                                                    tabIndex={-1}
                                                    aria-label={showConfirm ? "Masquer" : "Afficher"}
                                                >
                                                    {showConfirm ? <EyeOff size={14} /> : <Eye size={14} />}
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {error && (
                                        <div className="lp-err">
                                            <AlertCircle size={14} style={{ flexShrink: 0 }} />
                                            <span>{error}</span>
                                        </div>
                                    )}

                                    <button type="submit" className="lp-btn" disabled={isLoading}>
                                        {isLoading ? (
                                            <>
                                                <Loader2 size={15} className="animate-spin" />
                                                <span>Modification...</span>
                                            </>
                                        ) : (
                                            <>
                                                <ShieldCheck size={15} />
                                                <span>Réinitialiser le mot de passe</span>
                                            </>
                                        )}
                                    </button>

                                    <div style={{ display: "flex", justifyContent: "center" }}>
                                        <button
                                            type="button"
                                            className="lp-back"
                                            onClick={() => router.push("/login")}
                                        >
                                            <ArrowLeft size={14} />
                                            Retour à la connexion
                                        </button>
                                    </div>
                                </form>
                            </>
                        )}
                    </div>
                </div>

                <p className="lp-footer">
                    Ping &copy; {new Date().getFullYear()}
                </p>
            </div>
        </>
    );
}

export default function ResetPasswordPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-pulse text-[var(--elan-slate)]">Chargement...</div>
            </div>
        }>
            <ResetPasswordForm />
        </Suspense>
    );
}
