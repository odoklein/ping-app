"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import {
    Mail,
    Plus,
    Trash2,
    RefreshCw,
    CheckCircle,
    AlertCircle,
    Loader2,
    ArrowRight,
    Server,
    X,
    PenLine,
    Save,
    Bold,
    Italic,
    Underline,
    Link2,
    Code2,
    Eye,
    Monitor,
    ClipboardPaste,
} from "lucide-react";

// ============================================
// TYPES
// ============================================

interface Mailbox {
    id: string;
    provider: "GMAIL" | "OUTLOOK" | "CUSTOM";
    email: string;
    displayName: string | null;
    type: string;
    syncStatus: string;
    warmupStatus: string;
    healthScore: number;
    dailySendLimit: number;
    sentToday: number;
    signature: string | null;
    signatureHtml: string | null;
    lastSyncAt: string | null;
    lastError: string | null;
    isActive: boolean;
    createdAt: string;
    _count: {
        threads: number;
        emails: number;
    };
}

// ============================================
// ADD MAILBOX VIEW
// ============================================

interface AddMailboxViewProps {
    onCancel: () => void;
    onSuccess: () => void;
    onMailboxAdded?: () => void;
}

function AddMailboxView({ onCancel, onSuccess, onMailboxAdded }: AddMailboxViewProps) {
    const [step, setStep] = useState<'select' | 'imap'>('select');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [connectionResult, setConnectionResult] = useState<{ imapOk: boolean; smtpOk: boolean } | null>(null);
    const [imapForm, setImapForm] = useState({
        email: '',
        password: '',
        displayName: '',
        imapHost: '',
        imapPort: '993',
        smtpHost: '',
        smtpPort: '587',
    });

    const providers = [
        {
            id: 'gmail',
            name: 'Gmail',
            description: 'Connexion sécurisée via Google OAuth',
            color: 'from-red-500 to-orange-500',
            bgColor: 'bg-red-50 hover:bg-red-100',
            borderColor: 'border-red-200',
        },
        {
            id: 'outlook',
            name: 'Outlook / Microsoft 365',
            description: 'Connexion sécurisée via Microsoft OAuth',
            color: 'from-blue-500 to-cyan-500',
            bgColor: 'bg-blue-50 hover:bg-blue-100',
            borderColor: 'border-blue-200',
        },
        {
            id: 'imap',
            name: 'IMAP / SMTP',
            description: 'Configuration manuelle pour tout fournisseur',
            color: 'from-slate-500 to-slate-600',
            bgColor: 'bg-slate-50 hover:bg-slate-100',
            borderColor: 'border-slate-200',
        },
    ];

    const handleProviderSelect = (providerId: string) => {
        if (providerId === 'gmail') {
            window.location.href = '/api/email/oauth/gmail/connect';
        } else if (providerId === 'outlook') {
            window.location.href = '/api/email/oauth/outlook/connect';
        } else if (providerId === 'imap') {
            setStep('imap');
        }
    };

    const handleImapSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);
        setConnectionResult(null);

        try {
            const response = await fetch('/api/email/mailboxes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    provider: 'CUSTOM',
                    email: imapForm.email,
                    displayName: imapForm.displayName || imapForm.email.split('@')[0],
                    password: imapForm.password,
                    imapHost: imapForm.imapHost,
                    imapPort: parseInt(imapForm.imapPort),
                    smtpHost: imapForm.smtpHost,
                    smtpPort: parseInt(imapForm.smtpPort),
                }),
            });

            const result = await response.json();

            setConnectionResult({
                imapOk: result.connection?.imapOk ?? result.imapOk ?? false,
                smtpOk: result.connection?.smtpOk ?? result.smtpOk ?? false,
            });

            if (!result.success) {
                const failedProtocols = [
                    result.imapOk === false ? 'IMAP' : null,
                    result.smtpOk === false ? 'SMTP' : null,
                ].filter(Boolean).join(' et ');
                throw new Error(
                    failedProtocols
                        ? `${failedProtocols}: ${result.error || 'connexion impossible'}`
                        : (result.error || 'Erreur lors de la connexion')
                );
            }

            onMailboxAdded?.();
            onSuccess();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Erreur lors de la connexion');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-5">
            <div className="flex items-center gap-3 mb-4">
                {step === 'imap' && (
                    <button
                        onClick={() => setStep('select')}
                        className="p-2 hover:bg-[#F1F4F3] rounded-lg transition-colors"
                        aria-label="Retour au choix du fournisseur"
                    >
                        <ArrowRight className="w-4 h-4 rotate-180 text-slate-500" />
                    </button>
                )}
                <h2 className="text-lg font-semibold text-slate-900">
                    {step === 'select' ? 'Ajouter une boîte mail' : 'Configuration IMAP/SMTP'}
                </h2>
            </div>

            {step === 'select' ? (
                <div className="grid gap-3 md:grid-cols-3">
                    {providers.map((provider) => (
                        <button
                            key={provider.id}
                            onClick={() => handleProviderSelect(provider.id)}
                            className={cn(
                                "w-full flex items-center md:items-start gap-3 p-4 rounded-xl border text-left transition-all active:translate-y-px",
                                provider.bgColor,
                                provider.borderColor,
                                "hover:border-[#B9C9C5] hover:shadow-sm"
                            )}
                        >
                            <div className={cn(
                                "w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br shadow-lg",
                                provider.color
                            )}>
                                {provider.id === 'imap' ? (
                                    <Server className="w-6 h-6 text-white" />
                                ) : (
                                    <Mail className="w-6 h-6 text-white" />
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="font-semibold text-slate-900">{provider.name}</h3>
                                <p className="text-sm text-slate-500">{provider.description}</p>
                            </div>
                            <ArrowRight className="w-4 h-4 text-slate-400 md:hidden" />
                        </button>
                    ))}
                    <button
                        onClick={onCancel}
                        className="md:col-span-3 w-full h-10 text-sm font-medium text-slate-600 hover:bg-[#F1F4F3] rounded-lg"
                    >
                        Annuler
                    </button>
                </div>
            ) : (
                <form onSubmit={handleImapSubmit} className="space-y-4">
                    {error && (
                        <div className="p-3 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2">
                            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                            <p className="text-sm text-red-700">{error}</p>
                        </div>
                    )}

                    {connectionResult && (
                        <div className="grid grid-cols-2 gap-2" aria-live="polite">
                            {([
                                ['IMAP', connectionResult.imapOk],
                                ['SMTP', connectionResult.smtpOk],
                            ] as const).map(([label, ok]) => (
                                <div
                                    key={label}
                                    className={cn(
                                        "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold",
                                        ok
                                            ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                                            : "border-red-200 bg-red-50 text-red-800"
                                    )}
                                >
                                    {ok ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                                    {label} {ok ? 'connect\u00e9' : '\u00e9chou\u00e9'}
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="sm:col-span-2">
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Adresse email *
                            </label>
                            <input
                                type="email"
                                required
                                value={imapForm.email}
                                onChange={(e) => setImapForm({ ...imapForm, email: e.target.value })}
                                className="w-full px-3 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:border-[#E07C00] focus:ring-2 focus:ring-[#FF9E1B]/20 outline-none transition-all text-sm"
                                placeholder="vous@example.com"
                            />
                        </div>

                        <div className="sm:col-span-2">
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Nom d&apos;affichage
                            </label>
                            <input
                                type="text"
                                value={imapForm.displayName}
                                onChange={(e) => setImapForm({ ...imapForm, displayName: e.target.value })}
                                className="w-full px-3 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:border-[#E07C00] focus:ring-2 focus:ring-[#FF9E1B]/20 outline-none transition-all text-sm"
                                placeholder="John Doe"
                            />
                        </div>

                        <div className="sm:col-span-2">
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Mot de passe / App Password *
                            </label>
                            <input
                                type="password"
                                required
                                value={imapForm.password}
                                onChange={(e) => setImapForm({ ...imapForm, password: e.target.value })}
                                className="w-full px-3 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:border-[#E07C00] focus:ring-2 focus:ring-[#FF9E1B]/20 outline-none transition-all text-sm"
                                placeholder="••••••••"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Serveur IMAP *
                            </label>
                            <input
                                type="text"
                                required
                                value={imapForm.imapHost}
                                onChange={(e) => setImapForm({ ...imapForm, imapHost: e.target.value })}
                                className="w-full px-3 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:border-[#E07C00] focus:ring-2 focus:ring-[#FF9E1B]/20 outline-none transition-all text-sm"
                                placeholder="imap.example.com"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Port IMAP *
                            </label>
                            <input
                                type="number"
                                min="1"
                                max="65535"
                                required
                                value={imapForm.imapPort}
                                onChange={(e) => setImapForm({ ...imapForm, imapPort: e.target.value })}
                                className="w-full px-3 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:border-[#E07C00] focus:ring-2 focus:ring-[#FF9E1B]/20 outline-none transition-all text-sm"
                                placeholder="993"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Serveur SMTP *
                            </label>
                            <input
                                type="text"
                                required
                                value={imapForm.smtpHost}
                                onChange={(e) => setImapForm({ ...imapForm, smtpHost: e.target.value })}
                                className="w-full px-3 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:border-[#E07C00] focus:ring-2 focus:ring-[#FF9E1B]/20 outline-none transition-all text-sm"
                                placeholder="smtp.example.com"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Port SMTP *
                            </label>
                            <input
                                type="number"
                                min="1"
                                max="65535"
                                required
                                value={imapForm.smtpPort}
                                onChange={(e) => setImapForm({ ...imapForm, smtpPort: e.target.value })}
                                className="w-full px-3 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:border-[#E07C00] focus:ring-2 focus:ring-[#FF9E1B]/20 outline-none transition-all text-sm"
                                placeholder="587"
                            />
                        </div>
                    </div>

                    <div className="flex items-start gap-2 rounded-lg border border-[#D7E1DE] bg-[#EEF3F1] px-3 py-2.5 text-xs leading-relaxed text-[#3F625D]">
                        <Server className="mt-0.5 h-4 w-4 shrink-0" />
                        <p>Ports habituels: IMAP 993, SMTP 587 (STARTTLS) ou 465 (TLS). Gmail, Outlook et iCloud exigent généralement un mot de passe d&apos;application.</p>
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onCancel}
                            disabled={isLoading}
                            className="flex-1 px-4 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-[#F1F4F3] font-semibold text-sm transition-colors disabled:opacity-50 active:translate-y-px"
                        >
                            Annuler
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="flex-[1.4] flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-[#E07C00] bg-[#FF9E1B] text-[#15201E] font-bold text-sm hover:bg-[#F09212] transition-colors disabled:opacity-50 active:translate-y-px"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Test IMAP/SMTP...
                                </>
                            ) : (
                                'Tester et connecter'
                            )}
                        </button>
                    </div>
                </form>
            )}
        </div>
    );
}

// ============================================
// MAILBOX MANAGER DIALOG
// ============================================

interface MailboxManagerDialogProps {
    isOpen?: boolean;
    onClose?: () => void;
    onMailboxAdded?: () => void;
    variant?: 'dialog' | 'page';
}

// ============================================
// SIGNATURE EDITOR
// ============================================

type SignatureEditorMode = "visual" | "html" | "preview";

const SIGNATURE_STARTER_HTML = `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="font-family:Arial,sans-serif;color:#24312f;line-height:1.45">
  <tr>
    <td style="padding-right:16px;vertical-align:top">
      <img src="https://example.com/logo.png" alt="Logo" width="72" style="display:block;width:72px;max-width:72px;height:auto">
    </td>
    <td style="padding-left:16px;border-left:2px solid #ff9e1b;vertical-align:top">
      <div style="font-size:16px;font-weight:700;color:#173f3a">Prénom Nom</div>
      <div style="font-size:13px;color:#60706c;margin-top:2px">Fonction · Société</div>
      <div style="font-size:12px;margin-top:10px">
        <a href="mailto:prenom@entreprise.com" style="color:#1f4d47;text-decoration:none">prenom@entreprise.com</a><br>
        <a href="tel:+33102030405" style="color:#1f4d47;text-decoration:none">+33 1 02 03 04 05</a><br>
        <a href="https://entreprise.com" style="color:#1f4d47;text-decoration:underline">entreprise.com</a>
      </div>
    </td>
  </tr>
</table>`;

function sanitizeSignatureForClient(html: string): string {
    if (!html || typeof DOMParser === "undefined") return "";
    const documentNode = new DOMParser().parseFromString(html, "text/html");
    documentNode.querySelectorAll("script, style, iframe, object, embed, form, input, button, textarea, select, meta, link, base").forEach((node) => node.remove());

    documentNode.body.querySelectorAll("*").forEach((element) => {
        Array.from(element.attributes).forEach((attribute) => {
            const name = attribute.name.toLowerCase();
            const value = attribute.value.trim().toLowerCase();
            if (name.startsWith("on") || name === "srcdoc" || name === "contenteditable") {
                element.removeAttribute(attribute.name);
                return;
            }
            if (name === "href" && !/^(https?:|mailto:|tel:)/i.test(value)) element.removeAttribute(attribute.name);
            if (name === "src" && !/^(https?:|data:image\/)/i.test(value)) element.removeAttribute(attribute.name);
            if (name === "style" && /(?:url\s*\(|expression\s*\(|javascript:|@import|behavior\s*:|-moz-binding)/i.test(value)) {
                element.removeAttribute("style");
            }
        });
    });

    return documentNode.body.innerHTML.trim();
}

function signatureHasContent(html: string): boolean {
    if (!html) return false;
    if (/<(?:img|table|hr)\b/i.test(html)) return true;
    return html.replace(/<[^>]*>/g, "").replace(/&nbsp;/gi, " ").trim().length > 0;
}

function buildSignaturePreviewDocument(signatureHtml: string): string {
    const safeHtml = sanitizeSignatureForClient(signatureHtml);
    return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src https: data:; style-src 'unsafe-inline'; font-src data:"><meta name="viewport" content="width=device-width, initial-scale=1"><style>html,body{margin:0;background:#fff;color:#27312f;font-family:Arial,sans-serif;font-size:14px}body{padding:24px;overflow-wrap:anywhere}.message{line-height:1.6;color:#384441}.signature{margin-top:22px}img{max-width:100%;height:auto}table{max-width:100%}a{cursor:default}</style></head><body><div class="message">Bonjour Camille,<br><br>Merci pour notre échange. Vous trouverez ci-dessous mes coordonnées.</div><div class="signature">${safeHtml || '<span style="color:#94a3b8">Votre signature apparaîtra ici.</span>'}</div></body></html>`;
}

function SignatureEditorDialog({
    mailbox,
    onClose,
    onSaved,
}: {
    mailbox: Mailbox;
    onClose: () => void;
    onSaved: (mailbox: Mailbox) => void;
}) {
    const editorRef = useRef<HTMLDivElement>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [mode, setMode] = useState<SignatureEditorMode>("visual");
    const [signatureHtml, setSignatureHtml] = useState(mailbox.signatureHtml || "");
    const isEmpty = !signatureHasContent(signatureHtml);
    const previewDocument = useMemo(() => buildSignaturePreviewDocument(signatureHtml), [signatureHtml]);

    useEffect(() => {
        const nextHtml = mailbox.signatureHtml || "";
        setSignatureHtml(nextHtml);
        setMode("visual");
        if (editorRef.current) {
            editorRef.current.innerHTML = sanitizeSignatureForClient(nextHtml);
        }
    }, [mailbox.id, mailbox.signatureHtml]);

    useEffect(() => {
        if (mode === "visual" && editorRef.current) {
            editorRef.current.innerHTML = sanitizeSignatureForClient(signatureHtml);
        }
        // Hydrate only when entering the visual tab to avoid resetting the caret.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mode]);

    const syncFromVisualEditor = () => {
        setSignatureHtml(editorRef.current?.innerHTML.trim() || "");
    };

    const changeMode = (nextMode: SignatureEditorMode) => {
        if (mode === "visual") syncFromVisualEditor();
        setMode(nextMode);
        setError(null);
    };

    const runCommand = (command: string, value?: string) => {
        editorRef.current?.focus();
        document.execCommand(command, false, value);
        syncFromVisualEditor();
    };

    const handleSave = async () => {
        setIsSaving(true);
        setError(null);
        try {
            const htmlToSave = mode === "visual"
                ? editorRef.current?.innerHTML.trim() || null
                : signatureHtml.trim() || null;
            const response = await fetch(`/api/email/mailboxes/${mailbox.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ signatureHtml: htmlToSave }),
            });
            const result = await response.json();
            if (!response.ok || !result.success) {
                throw new Error(result.error || "Impossible d'enregistrer la signature");
            }
            onSaved({ ...mailbox, ...result.data });
            onClose();
        } catch (saveError) {
            setError(saveError instanceof Error ? saveError.message : "Impossible d'enregistrer la signature");
        } finally {
            setIsSaving(false);
        }
    };

    return createPortal(
        <>
            <div className="fixed inset-0 z-[110] bg-[#15201E]/45 backdrop-blur-[2px]" onClick={onClose} />
            <div
                className="fixed inset-0 z-[111] flex flex-col overflow-hidden border border-[#DDE5E2] bg-white shadow-[0_24px_70px_rgba(21,32,30,0.24)] sm:inset-auto sm:left-1/2 sm:top-1/2 sm:h-[min(780px,calc(100dvh-2rem))] sm:max-h-[calc(100dvh-2rem)] sm:w-[min(920px,calc(100vw-2rem))] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-xl"
                role="dialog"
                aria-modal="true"
                aria-labelledby="signature-editor-title"
            >
                <div className="flex items-start justify-between border-b border-[#E1E7E5] px-5 py-4">
                    <div>
                        <h2 id="signature-editor-title" className="text-lg font-bold text-[#15201E]">
                            Signature email
                        </h2>
                        <p className="mt-0.5 text-sm text-slate-500">
                            {mailbox.displayName || mailbox.email} · {mailbox.email}
                        </p>
                    </div>
                    <button onClick={onClose} className="rounded-lg p-2 text-slate-500 hover:bg-[#F1F4F3]" aria-label="Fermer">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="flex min-h-0 flex-1 flex-col bg-[#F7F9F8] p-4 sm:p-5">
                    <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <p className="text-sm font-semibold text-slate-700">Conception de la signature</p>
                            <p className="mt-0.5 text-xs text-slate-500">Collez une signature mise en forme ou utilisez directement votre code HTML.</p>
                        </div>
                        <div className="grid grid-cols-3 rounded-lg border border-[#CBD8D4] bg-white p-1" role="tablist" aria-label="Mode d'édition">
                            {[
                                { id: "visual" as const, label: "Visuel", icon: PenLine },
                                { id: "html" as const, label: "HTML", icon: Code2 },
                                { id: "preview" as const, label: "Aperçu", icon: Eye },
                            ].map(({ id, label, icon: Icon }) => (
                                <button
                                    key={id}
                                    type="button"
                                    role="tab"
                                    aria-selected={mode === id}
                                    onClick={() => changeMode(id)}
                                    className={cn(
                                        "inline-flex h-9 items-center justify-center gap-1.5 rounded-md px-3 text-xs font-bold transition-colors",
                                        mode === id ? "bg-[#1F4D47] text-white" : "text-slate-500 hover:bg-[#EEF3F1] hover:text-[#1F4D47]",
                                    )}
                                >
                                    <Icon className="h-3.5 w-3.5" />
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-[#CBD8D4] bg-white focus-within:border-[#E07C00] focus-within:ring-2 focus-within:ring-[#FF9E1B]/20">
                        {mode === "visual" && (
                            <div className="flex items-center gap-1 border-b border-[#E1E7E5] bg-[#F7F9F8] px-2 py-1.5">
                                {[
                                    { command: "bold", label: "Gras", icon: Bold },
                                    { command: "italic", label: "Italique", icon: Italic },
                                    { command: "underline", label: "Souligné", icon: Underline },
                                ].map(({ command, label, icon: Icon }) => (
                                    <button key={command} type="button" onClick={() => runCommand(command)} className="rounded-lg p-2 text-slate-500 hover:bg-white hover:text-[#1F4D47]" title={label} aria-label={label}>
                                        <Icon className="h-4 w-4" />
                                    </button>
                                ))}
                                <div className="mx-1 h-5 w-px bg-[#DDE5E2]" />
                                <button
                                    type="button"
                                    onClick={() => {
                                        const url = window.prompt("Adresse du lien (https://, mailto: ou tel:)");
                                        if (url) runCommand("createLink", url);
                                    }}
                                    className="rounded-lg p-2 text-slate-500 hover:bg-white hover:text-[#1F4D47]"
                                    title="Ajouter un lien"
                                    aria-label="Ajouter un lien"
                                >
                                    <Link2 className="h-4 w-4" />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (editorRef.current) editorRef.current.innerHTML = "";
                                        setSignatureHtml("");
                                    }}
                                    className="ml-auto rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-500 hover:bg-red-50 hover:text-red-600"
                                >
                                    Effacer
                                </button>
                            </div>
                        )}

                        {mode === "html" && (
                            <div className="flex items-center justify-between border-b border-[#E1E7E5] bg-[#F7F9F8] px-3 py-2">
                                <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                                    <Code2 className="h-4 w-4 text-[#1F4D47]" />
                                    Source HTML
                                </div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (isEmpty || window.confirm("Remplacer la signature actuelle par le modèle ?")) setSignatureHtml(SIGNATURE_STARTER_HTML);
                                    }}
                                    className="inline-flex items-center gap-1.5 rounded-md border border-[#CBD8D4] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#1F4D47] hover:bg-[#EEF3F1]"
                                >
                                    <ClipboardPaste className="h-3.5 w-3.5" />
                                    Charger un modèle
                                </button>
                            </div>
                        )}

                        <div
                            ref={editorRef}
                            contentEditable
                            suppressContentEditableWarning
                            role="textbox"
                            aria-multiline="true"
                            aria-label="Contenu de la signature"
                            data-placeholder="Nom, fonction, téléphone, site web..."
                            onInput={syncFromVisualEditor}
                            onPaste={(event) => {
                                event.preventDefault();
                                const richHtml = event.clipboardData.getData("text/html");
                                if (richHtml) document.execCommand("insertHTML", false, sanitizeSignatureForClient(richHtml));
                                else document.execCommand("insertText", false, event.clipboardData.getData("text/plain"));
                                window.requestAnimationFrame(syncFromVisualEditor);
                            }}
                            className={cn(
                                "min-h-0 flex-1 overflow-auto px-4 py-4 text-sm leading-relaxed text-slate-800 outline-none empty:before:pointer-events-none empty:before:text-slate-400 empty:before:content-[attr(data-placeholder)] [&_a]:text-[#1F4D47] [&_a]:underline [&_img]:max-w-full",
                                mode !== "visual" && "hidden",
                            )}
                        />

                        {mode === "html" && (
                            <textarea
                                value={signatureHtml}
                                onChange={(event) => setSignatureHtml(event.target.value)}
                                spellCheck={false}
                                aria-label="Code HTML de la signature"
                                placeholder={'<table style="font-family:Arial,sans-serif">...</table>'}
                                className="min-h-0 flex-1 resize-none overflow-auto bg-[#FCFDFD] p-4 font-mono text-[12px] leading-6 text-slate-800 outline-none selection:bg-[#FF9E1B]/25"
                            />
                        )}

                        {mode === "preview" && (
                            <div className="flex min-h-0 flex-1 flex-col bg-[#E9EFED]">
                                <div className="flex h-10 shrink-0 items-center gap-2 border-b border-[#D7E1DE] bg-[#F7F9F8] px-3 text-xs font-semibold text-slate-500">
                                    <Monitor className="h-4 w-4 text-[#1F4D47]" />
                                    Aperçu dans un email
                                    <span className="ml-auto rounded-md border border-[#D7E1DE] bg-white px-2 py-1 text-[10px] text-slate-400">Sandbox sécurisé</span>
                                </div>
                                <div className="min-h-0 flex-1 p-3 sm:p-5">
                                    <iframe title="Aperçu de la signature email" sandbox="" srcDoc={previewDocument} className="h-full min-h-[300px] w-full rounded-lg border border-[#CBD8D4] bg-white shadow-[0_8px_24px_rgba(31,77,71,0.08)]" />
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="mt-3 flex items-start gap-2 rounded-lg border border-[#D7E1DE] bg-[#EEF3F1] px-3 py-2.5 text-xs leading-relaxed text-[#3F625D]">
                        <CheckCircle className="mt-0.5 h-4 w-4 shrink-0" />
                        <p>Le HTML est nettoyé à l&apos;enregistrement. Les styles inline, tableaux, liens et logos HTTPS sont conservés. Les scripts et événements sont supprimés.</p>
                    </div>
                    {error && (
                        <div className="mt-3 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700" role="alert">
                            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}
                </div>

                <div className="flex items-center justify-between gap-3 border-t border-[#E1E7E5] bg-white px-5 py-4">
                    <span className="text-xs text-slate-400">{isEmpty ? "Aucune signature" : `${signatureHtml.length.toLocaleString("fr-FR")} / 100 000 caractères`}</span>
                    <div className="flex gap-2">
                        <button onClick={onClose} disabled={isSaving} className="h-10 rounded-lg border border-[#CBD8D4] px-4 text-sm font-semibold text-slate-700 hover:bg-[#F1F4F3] disabled:opacity-50">
                            Annuler
                        </button>
                        <button onClick={handleSave} disabled={isSaving} className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#E07C00] bg-[#FF9E1B] px-4 text-sm font-bold text-[#15201E] hover:bg-[#F09212] active:translate-y-px disabled:opacity-50">
                            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                            {isSaving ? "Enregistrement..." : "Enregistrer"}
                        </button>
                    </div>
                </div>
            </div>
        </>,
        document.body,
    );
}

export function MailboxManagerDialog({ isOpen = false, onClose = () => undefined, onMailboxAdded, variant = 'dialog' }: MailboxManagerDialogProps) {
    const isPage = variant === 'page';
    const isVisible = isPage || isOpen;
    const [view, setView] = useState<'list' | 'add'>('list');
    const [mailboxes, setMailboxes] = useState<Mailbox[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [syncingMailboxes, setSyncingMailboxes] = useState<Set<string>>(new Set());
    const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [signatureMailbox, setSignatureMailbox] = useState<Mailbox | null>(null);

    const fetchMailboxes = async () => {
        setIsLoading(true);
        setActionMessage(null);
        try {
            const res = await fetch("/api/email/mailboxes?includeShared=true&includeInactive=true", { cache: "no-store" });
            const json = await res.json();
            if (json.success) {
                setMailboxes(json.data);
            } else {
                setActionMessage({ type: 'error', text: json.error || 'Impossible de charger les bo\u00eetes mail' });
            }
        } catch (error) {
            console.error("Failed to fetch mailboxes:", error);
            setActionMessage({ type: 'error', text: 'Connexion au serveur impossible' });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (isVisible) {
            fetchMailboxes();
            setView('list');
        }
    }, [isVisible]);

    const handleSync = async (mailboxId: string) => {
        setSyncingMailboxes(prev => new Set([...prev, mailboxId]));
        setActionMessage(null);
        try {
            const res = await fetch(`/api/email/mailboxes/${mailboxId}/sync`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ maxThreads: 100 }),
            });
            const json = await res.json();

            if (!json.success) throw new Error(json.error || 'Synchronisation impossible');
            await fetchMailboxes();
            setActionMessage({
                type: 'success',
                text: `${json.data?.messagesProcessed ?? 0} message(s) synchronis\u00e9(s)`,
            });
        } catch (error) {
            console.error("Sync failed:", error);
            setActionMessage({
                type: 'error',
                text: error instanceof Error ? error.message : 'Synchronisation impossible',
            });
        } finally {
            setSyncingMailboxes(prev => {
                const next = new Set(prev);
                next.delete(mailboxId);
                return next;
            });
        }
    };

    const handleDelete = async (mailboxId: string) => {
        if (!confirm("Êtes-vous sûr de vouloir supprimer cette boîte mail ?")) return;

        try {
            const response = await fetch(`/api/email/mailboxes/${mailboxId}`, { method: "DELETE" });
            const result = await response.json();
            if (!response.ok || !result.success) throw new Error(result.error || 'Suppression impossible');
            setMailboxes(prev => prev.filter(m => m.id !== mailboxId));
            setActionMessage({ type: 'success', text: 'Bo\u00eete mail supprim\u00e9e' });
        } catch (error) {
            console.error("Delete failed:", error);
            setActionMessage({ type: 'error', text: error instanceof Error ? error.message : 'Suppression impossible' });
        }
    };

    const getProviderColor = (provider: string) => {
        switch (provider) {
            case "GMAIL":
                return "#EA4335";
            case "OUTLOOK":
                return "#0078D4";
            default:
                return "#1F4D47";
        }
    };

    const getSyncStatusBadge = (status: string) => {
        switch (status) {
            case "SYNCED":
                return (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-emerald-100 text-emerald-700">
                        <CheckCircle className="w-3 h-3" />
                        Sync
                    </span>
                );
            case "SYNCING":
                return (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-amber-100 text-amber-700">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Sync...
                    </span>
                );
            case "ERROR":
                return (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-700">
                        <AlertCircle className="w-3 h-3" />
                        Erreur
                    </span>
                );
            default:
                return null;
        }
    };

    if (!isVisible) return null;

    return (
        <React.Fragment>
            {!isPage && (
                <div className="fixed inset-0 bg-[#15201E]/45 z-[90] backdrop-blur-[2px]" onClick={onClose} />
            )}

            <div
                className={cn(
                    "flex flex-col overflow-hidden bg-[#F7F9F8] rounded-xl border border-[#DDE5E2]",
                    isPage
                        ? "min-h-[560px] shadow-sm"
                        : "fixed inset-x-3 top-1/2 -translate-y-1/2 z-[91] mx-auto w-auto max-w-5xl max-h-[calc(100dvh-2rem)] shadow-[0_24px_70px_rgba(21,32,30,0.24)]"
                )}
                role={isPage ? "region" : "dialog"}
                aria-modal={isPage ? undefined : true}
                aria-labelledby="mailbox-manager-title"
            >
                <div className="flex items-center justify-between px-5 py-4 border-b border-[#E1E7E5] bg-white">
                    <h2 id="mailbox-manager-title" className="text-lg font-bold text-[#15201E]">
                        Gestion des boîtes mails
                    </h2>
                    {!isPage && (
                        <button onClick={onClose} className="p-2 hover:bg-[#F1F4F3] rounded-lg transition-colors" aria-label="Fermer">
                            <X className="w-5 h-5 text-slate-600" />
                        </button>
                    )}
                </div>

                <div className="p-4 sm:p-5 overflow-y-auto email-scrollbar">
                    {view === 'add' ? (
                        <AddMailboxView
                            onCancel={() => setView('list')}
                            onSuccess={() => {
                                setView('list');
                                fetchMailboxes();
                            }}
                            onMailboxAdded={onMailboxAdded}
                        />
                    ) : (
                        <div className="space-y-5">
                            {actionMessage && (
                                <div className={cn("flex items-start gap-2 rounded-lg border px-3 py-2.5 text-sm", actionMessage.type === 'success' ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-800")} role="status">
                                    {actionMessage.type === 'success' ? <CheckCircle className="mt-0.5 h-4 w-4 shrink-0" /> : <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />}
                                    <span>{actionMessage.text}</span>
                                </div>
                            )}
                            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                                <p className="text-sm font-medium text-slate-600">
                                    {mailboxes.length} boîte{mailboxes.length > 1 ? 's' : ''} connectée{mailboxes.length > 1 ? 's' : ''}
                                </p>
                                <button
                                    onClick={() => setView('add')}
                                    className="inline-flex items-center justify-center gap-2 h-10 px-4 border border-[#E07C00] bg-[#FF9E1B] text-[#15201E] text-sm font-bold rounded-lg hover:bg-[#F09212] transition-colors active:translate-y-px"
                                >
                                    <Plus className="w-4 h-4" />
                                    Ajouter une boîte
                                </button>
                            </div>

                            {isLoading ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {[1, 2].map(i => (
                                        <div key={i} className="border border-slate-200 rounded-2xl overflow-hidden">
                                            <div className="h-1.5 w-full skeleton-shimmer" />
                                            <div className="p-4 space-y-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-xl skeleton-shimmer" />
                                                    <div className="space-y-2 flex-1">
                                                        <div className="h-4 w-32 skeleton-shimmer rounded" />
                                                        <div className="h-3 w-48 skeleton-shimmer rounded" />
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-3 gap-2">
                                                    {[1, 2, 3].map(j => (
                                                        <div key={j} className="h-14 skeleton-shimmer rounded-lg" />
                                                    ))}
                                                </div>
                                                <div className="flex gap-2">
                                                    <div className="h-9 flex-1 skeleton-shimmer rounded-xl" />
                                                    <div className="h-9 flex-1 skeleton-shimmer rounded-xl" />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : mailboxes.length === 0 ? (
                                <div className="text-center py-12 bg-white rounded-xl border border-[#E1E7E5]">
                                    <div className="w-16 h-16 rounded-2xl bg-white flex items-center justify-center mx-auto mb-4 shadow-sm">
                                        <Mail className="w-8 h-8 text-slate-400" />
                                    </div>
                                    <h3 className="text-lg font-medium text-slate-900 mb-1">
                                        Aucune boîte mail
                                    </h3>
                                    <p className="text-sm text-slate-500 mb-6">
                                        Connectez une boîte mail pour commencer
                                    </p>
                                    <button
                                        onClick={() => setView('add')}
                                        className="inline-flex h-10 items-center px-4 rounded-lg bg-[#FF9E1B] text-[#15201E] font-bold hover:bg-[#F09212]"
                                    >
                                        Connecter une boîte
                                    </button>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                                    {mailboxes.map((mailbox) => (
                                        <div
                                            key={mailbox.id}
                                            className="group relative bg-white border border-[#DDE5E2] rounded-xl overflow-hidden hover:border-[#B8CAC5] hover:shadow-[0_10px_28px_rgba(31,77,71,0.08)] transition-all"
                                        >
                                            {/* Status Header */}
                                            <div className="h-1.5 w-full" style={{ backgroundColor: getProviderColor(mailbox.provider) }} />

                                            <div className="p-4">
                                                <div className="flex items-start justify-between mb-4">
                                                    <div className="flex items-center gap-3">
                                                        <div
                                                            className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-sm"
                                                            style={{ backgroundColor: getProviderColor(mailbox.provider) }}
                                                        >
                                                            {mailbox.email[0].toUpperCase()}
                                                        </div>
                                                        <div>
                                                            <h3 className="font-semibold text-slate-900 truncate max-w-[150px]">
                                                                {mailbox.displayName || mailbox.email}
                                                            </h3>
                                                            <p className="text-xs text-slate-500 truncate max-w-[150px]">
                                                                {mailbox.email}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        {getSyncStatusBadge(mailbox.syncStatus)}
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleDelete(mailbox.id);
                                                            }}
                                                            className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                            aria-label={`Supprimer ${mailbox.email}`}
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-3 gap-2 mb-4">
                                                    <div className="bg-[#F4F6F5] rounded-lg p-2 text-center">
                                                        <span className="block text-lg font-bold text-slate-900">{mailbox._count.threads}</span>
                                                        <span className="text-[10px] text-slate-500 uppercase tracking-wide">Threads</span>
                                                    </div>
                                                    <div className="bg-[#F4F6F5] rounded-lg p-2 text-center">
                                                        <span className="block text-lg font-bold text-slate-900">{mailbox.sentToday}</span>
                                                        <span className="text-[10px] text-slate-500 uppercase tracking-wide">Envoyés</span>
                                                    </div>
                                                    <div className="bg-[#F4F6F5] rounded-lg p-2 text-center">
                                                        <span className={cn(
                                                            "block text-lg font-bold",
                                                            mailbox.healthScore > 80 ? "text-emerald-500" :
                                                                mailbox.healthScore > 50 ? "text-amber-500" : "text-red-500"
                                                        )}>{mailbox.healthScore}%</span>
                                                        <span className="text-[10px] text-slate-500 uppercase tracking-wide">Santé</span>
                                                    </div>
                                                </div>

                                                {/* Health Score Bar */}
                                                <div className="mb-3">
                                                    <div className="flex items-center justify-between mb-1">
                                                        <span className="text-[10px] text-slate-400 uppercase tracking-wide font-medium">Santé du compte</span>
                                                        <span className={cn(
                                                            "text-[11px] font-bold",
                                                            mailbox.healthScore > 80 ? "text-emerald-500" :
                                                                mailbox.healthScore > 50 ? "text-amber-500" : "text-red-500"
                                                        )}>{mailbox.healthScore}%</span>
                                                    </div>
                                                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                        <div
                                                            className={cn(
                                                                "h-full rounded-full transition-all duration-500",
                                                                mailbox.healthScore > 80 ? "bg-emerald-400" :
                                                                    mailbox.healthScore > 50 ? "bg-amber-400" : "bg-red-400"
                                                            )}
                                                            style={{ width: `${mailbox.healthScore}%` }}
                                                        />
                                                    </div>
                                                </div>

                                                {mailbox.lastError && (
                                                    <div className="p-2 mb-3 bg-red-50 text-red-600 text-xs rounded-lg border border-red-100 flex items-start gap-2">
                                                        <AlertCircle className="w-3 h-3 flex-shrink-0 mt-0.5" />
                                                        <span className="line-clamp-2">{mailbox.lastError}</span>
                                                    </div>
                                                )}

                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => setSignatureMailbox(mailbox)}
                                                        className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-[#CBD8D4] bg-white px-3 py-2.5 text-sm font-bold text-[#1F4D47] transition-colors hover:bg-[#F1F4F3] active:translate-y-px"
                                                    >
                                                        <PenLine className="h-4 w-4" />
                                                        {mailbox.signatureHtml ? "Modifier la signature" : "Ajouter une signature"}
                                                    </button>
                                                    <button
                                                        onClick={() => handleSync(mailbox.id)}
                                                        disabled={syncingMailboxes.has(mailbox.id)}
                                                        className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 border border-[#CBD8D4] bg-white hover:bg-[#F1F4F3] text-[#1F4D47] text-sm font-bold rounded-lg transition-colors disabled:opacity-50 active:translate-y-px"
                                                    >
                                                        {syncingMailboxes.has(mailbox.id) ? (
                                                            <Loader2 className="w-4 h-4 animate-spin" />
                                                        ) : (
                                                            <RefreshCw className="w-4 h-4" />
                                                        )}
                                                        Synchroniser
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
            {signatureMailbox && (
                <SignatureEditorDialog
                    mailbox={signatureMailbox}
                    onClose={() => setSignatureMailbox(null)}
                    onSaved={(updatedMailbox) => {
                        setMailboxes((current) => current.map((item) => item.id === updatedMailbox.id ? updatedMailbox : item));
                        setActionMessage({ type: 'success', text: 'Signature enregistrée' });
                    }}
                />
            )}
        </React.Fragment>
    );
}

export default MailboxManagerDialog;
