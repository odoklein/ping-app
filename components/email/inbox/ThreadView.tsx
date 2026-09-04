"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";
import {
    X,
    Star,
    Archive,
    Trash2,
    Reply,
    ReplyAll,
    Forward,
    ChevronDown,
    ChevronUp,
    Loader2,
    AlertCircle,
    Sparkles,
    Download,
    CheckCheck,
    Paperclip,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

// ============================================
// TYPES
// ============================================

interface Email {
    id: string;
    fromAddress: string;
    fromName: string | null;
    toAddresses: string[];
    ccAddresses: string[];
    subject: string;
    bodyHtml: string | null;
    bodyText: string | null;
    direction: string;
    status: string;
    receivedAt: string | null;
    sentAt: string | null;
    attachments: {
        id: string;
        filename: string;
        mimeType: string;
        size: number;
    }[];
}

interface Thread {
    id: string;
    subject: string;
    isStarred: boolean;
    isArchived: boolean;
    emails: Email[];
    mailbox: {
        email: string;
        signature: string | null;
        signatureHtml: string | null;
    };
    permissions: {
        canSend: boolean;
        canSendAs: boolean;
    };
}

interface ThreadViewProps {
    threadId: string;
    onClose: () => void;
    onReply: (data: {
        threadId: string;
        subject: string;
        to: { email: string; name?: string }[];
        cc?: { email: string; name?: string }[];
        isForward?: boolean;
    }) => void;
}

// ============================================
// HELPERS
// ============================================

function getAvatarColor(name: string): string {
    const colors = [
        "from-primary to-primary-hover",
        "from-primary-hover to-[#080808]",
        "from-[#080808] to-primary",
        "from-[#5baefc] to-primary",
        "from-primary to-[#5baefc]",
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
}

function getInitials(name: string): string {
    const parts = name.split(/[\s@.]+/).filter(Boolean);
    if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return (parts[0]?.[0] || "?").toUpperCase();
}

function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function sanitizeHtml(html: string): string {
    return html
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
        .replace(/on\w+\s*=\s*"[^"]*"/gi, "")
        .replace(/on\w+\s*=\s*'[^']*'/gi, "")
        .replace(/on\w+\s*=\s*[^\s>]*/gi, "")
        .replace(/javascript\s*:/gi, "")
        .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, "")
        .replace(/<embed\b[^>]*\/?>/gi, "")
        .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, "")
        .replace(/<form\b[^<]*(?:(?!<\/form>)<[^<]*)*<\/form>/gi, "");
}

// ============================================
// DELETE CONFIRMATION DIALOG
// ============================================

function DeleteConfirmDialog({
    onConfirm,
    onCancel,
}: {
    onConfirm: () => void;
    onCancel: () => void;
}) {
    return (
        <>
            <div
                className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 animate-in fade-in duration-150"
                onClick={onCancel}
            />
            <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 w-[380px] animate-in zoom-in-95 fade-in duration-200">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center flex-shrink-0">
                        <Trash2 className="w-5 h-5 text-red-500" />
                    </div>
                    <div>
                        <h3 className="text-[15px] font-semibold text-slate-900">
                            Supprimer cette conversation ?
                        </h3>
                        <p className="text-sm text-slate-500">
                            Cette action déplacera le thread dans la corbeille.
                        </p>
                    </div>
                </div>
                <div className="flex gap-2 justify-end">
                    <button
                        onClick={onCancel}
                        className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-xl transition-colors"
                    >
                        Annuler
                    </button>
                    <button
                        onClick={onConfirm}
                        className="px-4 py-2 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-xl transition-colors"
                    >
                        Supprimer
                    </button>
                </div>
            </div>
        </>
    );
}

// ============================================
// THREAD VIEW COMPONENT
// ============================================

export function ThreadView({
    threadId,
    onClose,
    onReply,
}: ThreadViewProps) {
    const [thread, setThread] = useState<Thread | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [expandedEmails, setExpandedEmails] = useState<Set<string>>(new Set());
    const [recaps, setRecaps] = useState<Record<string, string>>({});
    const [recapLoading, setRecapLoading] = useState<Record<string, boolean>>({});
    const [recapError, setRecapError] = useState<Record<string, string>>({});
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Fetch thread
    useEffect(() => {
        let cancelled = false;

        const fetchThread = async () => {
            setIsLoading(true);
            setError(null);

            try {
                const res = await fetch(`/api/email/threads/${threadId}`);
                if (!res.ok) throw new Error(`Erreur ${res.status}`);

                const json = await res.json();
                if (cancelled) return;

                if (json.success) {
                    setThread(json.data);
                    // Expand the last email by default
                    if (json.data.emails.length > 0) {
                        const lastEmail = json.data.emails[json.data.emails.length - 1];
                        setExpandedEmails(new Set([lastEmail.id]));
                    }
                } else {
                    setError(json.error || "Erreur de chargement");
                }
            } catch (err) {
                if (cancelled) return;
                setError(err instanceof Error ? err.message : "Erreur de connexion");
            } finally {
                if (!cancelled) setIsLoading(false);
            }
        };

        fetchThread();
        return () => { cancelled = true; };
    }, [threadId]);

    // Scroll to bottom when loaded
    useEffect(() => {
        if (!isLoading && messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [isLoading, thread?.emails.length]);

    // AI Recap - on-demand only
    const requestRecap = useCallback(async (emailId: string) => {
        if (recaps[emailId] || recapLoading[emailId]) return;

        const email = thread?.emails.find(e => e.id === emailId);
        if (!email) return;

        const bodyText = email.bodyText?.trim() || (email.bodyHtml
            ? email.bodyHtml
                .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
                .replace(/<[^>]+>/g, " ")
                .replace(/\s+/g, " ")
                .trim()
            : "");

        if (!bodyText) return;

        setRecapLoading(prev => ({ ...prev, [emailId]: true }));
        setRecapError(prev => {
            const next = { ...prev };
            delete next[emailId];
            return next;
        });

        try {
            const res = await fetch("/api/ai/mistral/email-recap", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ emailBodyText: bodyText.slice(0, 15000) }),
            });
            const json = await res.json();

            if (json.success && json.data?.recap) {
                setRecaps(prev => ({ ...prev, [emailId]: json.data.recap }));
            } else {
                setRecapError(prev => ({ ...prev, [emailId]: json.error || "Résumé indisponible" }));
            }
        } catch {
            setRecapError(prev => ({ ...prev, [emailId]: "Résumé indisponible" }));
        } finally {
            setRecapLoading(prev => ({ ...prev, [emailId]: false }));
        }
    }, [thread?.emails, recaps, recapLoading]);

    // Toggle email expansion
    const toggleEmail = (emailId: string) => {
        setExpandedEmails(prev => {
            const next = new Set(prev);
            if (next.has(emailId)) {
                next.delete(emailId);
            } else {
                next.add(emailId);
            }
            return next;
        });
    };

    // Actions
    const handleStar = async () => {
        if (!thread) return;
        const newIsStarred = !thread.isStarred;
        setThread(prev => prev ? { ...prev, isStarred: newIsStarred } : null);
        try {
            const res = await fetch(`/api/email/threads/${threadId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ isStarred: newIsStarred }),
            });
            if (!res.ok) throw new Error();
        } catch {
            setThread(prev => prev ? { ...prev, isStarred: !newIsStarred } : null);
        }
    };

    const handleArchive = async () => {
        onClose();
        try {
            await fetch(`/api/email/threads/${threadId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ isArchived: true }),
            });
        } catch {
            // Thread already closed
        }
    };

    const handleDelete = async () => {
        setShowDeleteConfirm(false);
        onClose();
        try {
            await fetch(`/api/email/threads/${threadId}`, {
                method: "DELETE",
            });
        } catch {
            // Thread already closed
        }
    };

    const handleReply = useCallback(() => {
        if (!thread || thread.emails.length === 0) return;
        const lastEmail = thread.emails[thread.emails.length - 1];
        onReply({
            threadId: thread.id,
            subject: thread.subject.startsWith("Re:") ? thread.subject : `Re: ${thread.subject}`,
            to: [{ email: lastEmail.fromAddress, name: lastEmail.fromName || undefined }],
        });
    }, [thread, onReply]);

    const handleReplyAll = useCallback(() => {
        if (!thread || thread.emails.length === 0) return;
        const lastEmail = thread.emails[thread.emails.length - 1];
        const mailboxEmail = thread.mailbox.email;

        // Reply to sender
        const to = [{ email: lastEmail.fromAddress, name: lastEmail.fromName || undefined }];

        // CC everyone else (except us)
        const ccSet = new Set<string>();
        lastEmail.toAddresses.forEach(addr => {
            if (addr.toLowerCase() !== mailboxEmail.toLowerCase()) {
                ccSet.add(addr);
            }
        });
        lastEmail.ccAddresses.forEach(addr => {
            if (addr.toLowerCase() !== mailboxEmail.toLowerCase()) {
                ccSet.add(addr);
            }
        });
        // Remove the sender from CC (they're already in To)
        ccSet.delete(lastEmail.fromAddress.toLowerCase());

        const cc = Array.from(ccSet).map(email => ({ email }));

        onReply({
            threadId: thread.id,
            subject: thread.subject.startsWith("Re:") ? thread.subject : `Re: ${thread.subject}`,
            to,
            cc,
        });
    }, [thread, onReply]);

    const handleForward = useCallback(() => {
        if (!thread || thread.emails.length === 0) return;
        onReply({
            threadId: thread.id,
            subject: thread.subject.startsWith("Fwd:") || thread.subject.startsWith("Tr:") 
                ? thread.subject 
                : `Tr: ${thread.subject}`,
            to: [], // Empty - user must pick recipient
            isForward: true,
        });
    }, [thread, onReply]);

    // Loading state
    if (isLoading) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-6 h-6 text-primary animate-spin" />
                <p className="text-xs text-slate-400">Chargement du thread...</p>
            </div>
        );
    }

    // Error state
    if (error || !thread) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center mb-4">
                    <AlertCircle className="w-7 h-7 text-red-400" />
                </div>
                <h3 className="text-[15px] font-semibold text-slate-900 mb-1">
                    Erreur de chargement
                </h3>
                <p className="text-sm text-slate-500 mb-5">{error}</p>
                <button
                    onClick={onClose}
                    className="px-5 py-2 text-sm font-bold text-primary hover:bg-primary-light rounded-lg transition-colors"
                >
                    Retour à la liste
                </button>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col min-h-0">
            {/* Header */}
            <div className="px-5 py-4 border-b border-[#DDE5E2] bg-white flex-shrink-0">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                        <h2 className="text-[26px] font-bold tracking-[-0.02em] text-slate-900 leading-tight mb-2">
                            {thread.subject || "(Sans objet)"}
                        </h2>
                        <div className="flex items-center gap-3">
                            <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md font-medium">
                                {thread.emails.length} message{thread.emails.length > 1 ? "s" : ""}
                            </span>
                        </div>
                    </div>
                    <div className="flex items-center gap-0.5 flex-shrink-0">
                        <button
                            onClick={handleStar}
                            className={cn(
                                "h-10 w-10 inline-flex items-center justify-center rounded-[10px] transition-all duration-150 active:translate-y-px",
                                thread.isStarred
                                    ? "text-amber-400 hover:bg-amber-50"
                                    : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
                            )}
                            title={thread.isStarred ? "Retirer des favoris" : "Ajouter aux favoris"}
                        >
                            <Star className={cn("w-5 h-5", thread.isStarred && "fill-current")} />
                        </button>
                        <button
                            onClick={handleArchive}
                            className="h-10 w-10 inline-flex items-center justify-center rounded-[10px] text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-all duration-150 active:translate-y-px"
                            title="Archiver"
                        >
                            <Archive className="w-5 h-5" />
                        </button>
                        <button
                            onClick={() => setShowDeleteConfirm(true)}
                            className="h-10 w-10 inline-flex items-center justify-center rounded-[10px] text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all duration-150 active:translate-y-px"
                            title="Supprimer"
                        >
                            <Trash2 className="w-5 h-5" />
                        </button>
                        <button
                            onClick={onClose}
                            className="h-10 w-10 inline-flex items-center justify-center rounded-[10px] text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-all duration-150 active:translate-y-px"
                            title="Fermer"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Email list */}
            <div className="flex-1 overflow-y-auto p-5 bg-[#F7F9F8] min-h-0">
                <div className="max-w-[860px] mx-auto space-y-3">
                    {thread.emails.map((email, idx) => (
                        <EmailMessage
                            key={email.id}
                            email={email}
                            isExpanded={expandedEmails.has(email.id)}
                            isLast={idx === thread.emails.length - 1}
                            onToggle={() => toggleEmail(email.id)}
                            recap={recaps[email.id]}
                            recapLoading={recapLoading[email.id]}
                            recapError={recapError[email.id]}
                            onRequestRecap={() => requestRecap(email.id)}
                        />
                    ))}
                    <div ref={messagesEndRef} />
                </div>
            </div>

            {/* Reply Bar */}
            {thread.permissions.canSend && (
                <div className="px-5 py-3 border-t border-slate-100 bg-white flex-shrink-0">
                    <div className="inline-flex items-center overflow-hidden rounded-[10px] border border-primary/20 bg-white shadow-sm">
                        <button
                            onClick={handleReply}
                            className="flex h-10 items-center gap-2 px-4 bg-primary text-white text-sm font-bold hover:bg-primary-hover active:translate-y-px transition-colors"
                        >
                            <Reply className="w-4 h-4" />
                            Répondre
                        </button>
                        <button
                            onClick={handleReplyAll}
                            className="flex h-10 items-center gap-2 px-4 border-l border-primary/20 bg-white text-slate-700 text-sm font-semibold hover:bg-[#F1F4F3] active:translate-y-px transition-colors"
                        >
                            <ReplyAll className="w-4 h-4" />
                            <span className="hidden sm:inline">Répondre à tous</span>
                        </button>
                        <button
                            onClick={handleForward}
                            className="flex h-10 items-center gap-2 px-4 border-l border-primary/20 bg-white text-slate-700 text-sm font-semibold hover:bg-[#F1F4F3] active:translate-y-px transition-colors"
                        >
                            <Forward className="w-4 h-4" />
                            <span className="hidden sm:inline">Transférer</span>
                        </button>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Dialog */}
            {showDeleteConfirm && (
                <DeleteConfirmDialog
                    onConfirm={handleDelete}
                    onCancel={() => setShowDeleteConfirm(false)}
                />
            )}
        </div>
    );
}

// ============================================
// EMAIL MESSAGE COMPONENT
// ============================================

interface EmailMessageProps {
    email: Email;
    isExpanded: boolean;
    isLast: boolean;
    onToggle: () => void;
    recap?: string;
    recapLoading?: boolean;
    recapError?: string;
    onRequestRecap: () => void;
}

function EmailMessage({
    email,
    isExpanded,
    isLast,
    onToggle,
    recap,
    recapLoading,
    recapError,
    onRequestRecap,
}: EmailMessageProps) {
    const isOutbound = email.direction === "OUTBOUND";
    const date = email.receivedAt || email.sentAt;
    const formattedDate = date
        ? format(new Date(date), "d MMM yyyy 'à' HH:mm", { locale: fr })
        : "";
    const relativeDate = date
        ? formatDistanceToNow(new Date(date), { addSuffix: true, locale: fr })
        : "";
    const senderName = email.fromName || email.fromAddress;
    const avatarColor = getAvatarColor(senderName);
    const initials = getInitials(senderName);

    const hasContent = !!(email.bodyText?.trim() || email.bodyHtml?.trim());

    return (
        <div className={cn(
            "border rounded-2xl overflow-hidden bg-white transition-all duration-200",
            isLast
                ? "border-primary/30 shadow-sm"
                : "border-slate-200/80",
            isExpanded ? "shadow-sm" : "hover:shadow-sm"
        )}>
            {/* Header */}
            <button
                onClick={onToggle}
                className="w-full px-4 py-3.5 flex items-center gap-3 hover:bg-slate-50/50 transition-colors text-left"
            >
                {/* Avatar */}
                <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center text-[13px] font-semibold flex-shrink-0 bg-gradient-to-br text-white shadow-sm",
                    isOutbound
                        ? "from-primary-hover to-primary"
                        : avatarColor
                )}>
                    {initials}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <span className="text-[15px] font-semibold text-slate-900 truncate">
                            {senderName}
                        </span>
                        {isOutbound && (
                            <span className="text-[11px] text-primary bg-primary-light px-1.5 py-0.5 rounded-md font-medium flex-shrink-0">
                                vous
                            </span>
                        )}
                        {isOutbound && email.status === "SENT" && (
                            <CheckCheck className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                        )}
                    </div>
                    {!isExpanded ? (
                        <p className="text-[13px] text-slate-400 truncate mt-0.5">
                            {email.bodyText?.substring(0, 120) || "..."}
                        </p>
                    ) : (
                        <p className="text-[12px] text-slate-500 mt-1 truncate" title={formattedDate}>
                            De: {email.fromAddress} · À: {email.toAddresses.join(", ")}
                            {email.ccAddresses.length > 0 && (
                                <> · Cc: {email.ccAddresses.join(", ")}</>
                            )}
                            {relativeDate && <> · {relativeDate}</>}
                        </p>
                    )}
                </div>

                {/* Date & Toggle */}
                <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-[11px] text-slate-400 hidden sm:inline" title={formattedDate}>
                        {relativeDate}
                    </span>
                    <div className={cn(
                        "p-1 rounded-lg transition-all duration-200",
                        isExpanded ? "bg-slate-100" : ""
                    )}>
                        {isExpanded ? (
                            <ChevronUp className="w-4 h-4 text-slate-400" />
                        ) : (
                            <ChevronDown className="w-4 h-4 text-slate-400" />
                        )}
                    </div>
                </div>
            </button>

            {/* Body */}
            {isExpanded && (
                <div className="border-t border-slate-100">
                    {/* AI Recap - Opt-in: show button if no recap loaded, show recap if loaded */}
                    {hasContent && (
                        <div className="mx-4 mt-3">
                            {!recap && !recapLoading && !recapError ? (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onRequestRecap();
                                    }}
                                    className="inline-flex h-8 items-center gap-2 px-3 rounded-full border border-[rgba(var(--brand-primary-rgb),0.25)] bg-primary-light/40 hover:bg-primary-light text-primary text-[12px] font-semibold transition-colors active:translate-y-px"
                                >
                                    <Sparkles className="w-3.5 h-3.5" />
                                    Résumé IA
                                </button>
                            ) : (
                                <div className="flex items-start gap-2.5 p-3 rounded-lg bg-primary-light/40 border border-[rgba(var(--brand-primary-rgb),0.25)]">
                                    <div className="w-6 h-6 rounded-lg bg-primary flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm">
                                        <Sparkles className="w-3.5 h-3.5 text-white" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-[11px] font-bold text-primary mb-1">
                                            Résumé IA
                                        </p>
                                        {recapLoading && (
                                            <div className="flex items-center gap-2 text-sm text-slate-500">
                                                <Loader2 className="w-3.5 h-3.5 animate-spin flex-shrink-0 text-primary" />
                                                <span className="text-[13px]">Analyse en cours...</span>
                                            </div>
                                        )}
                                        {recapError && !recapLoading && (
                                            <div className="flex items-center gap-2">
                                                <p className="text-[13px] text-slate-400 italic flex-1">{recapError}</p>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onRequestRecap();
                                                    }}
                                                    className="text-[12px] text-primary hover:text-[#1a75ce] font-bold flex-shrink-0"
                                                >
                                                    Réessayer
                                                </button>
                                            </div>
                                        )}
                                        {recap && !recapLoading && (
                                            <p className="text-[13px] text-slate-700 leading-relaxed">{recap}</p>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Attachments */}
                    {email.attachments.length > 0 && (
                        <div className="mx-4 mt-3">
                            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                                {email.attachments.length} pièce{email.attachments.length > 1 ? "s" : ""} jointe{email.attachments.length > 1 ? "s" : ""}
                            </p>
                            <div className="flex flex-wrap gap-2">
                                {email.attachments.map((attachment) => (
                                    <a
                                        key={attachment.id}
                                        href={`/api/email/attachments/${attachment.id}`}
                                        className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 hover:border-slate-300 transition-all group"
                                    >
                                        <Paperclip className="w-4 h-4 text-slate-400 flex-shrink-0" />
                                        <div className="min-w-0">
                                            <span className="text-[13px] text-slate-700 truncate max-w-[140px] block font-medium">
                                                {attachment.filename}
                                            </span>
                                            <span className="text-[11px] text-slate-400">
                                                {formatFileSize(attachment.size)}
                                            </span>
                                        </div>
                                        <Download className="w-4 h-4 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </a>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Email body */}
                    <div className="px-5 py-5">
                        <div className="prose prose-sm prose-slate max-w-[820px] text-slate-800 [&_a]:text-primary [&_a]:font-semibold [&_a]:no-underline hover:[&_a]:underline [&_img]:rounded-lg [&_blockquote]:border-l-[rgba(var(--brand-primary-rgb),0.3)] [&_blockquote]:text-slate-500">
                            {email.bodyHtml ? (
                                <div
                                    dangerouslySetInnerHTML={{ __html: sanitizeHtml(email.bodyHtml) }}
                                    className="email-body text-slate-800 leading-relaxed break-words overflow-x-auto"
                                />
                            ) : (
                                <pre className="whitespace-pre-wrap font-sans text-slate-700 leading-relaxed text-[14px] break-words">
                                    {email.bodyText}
                                </pre>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default ThreadView;
