"use client";

import { useCallback, useEffect, useState } from "react";
import { Ban, Check, Clock, Copy, Link2, Loader2, MailX, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui";
import { ConfirmModal } from "@/components/ui/Modal";

// ============================================
// PENDING INVITATIONS (MANAGER)
// ============================================

interface Invitation {
    id: string;
    email: string;
    name: string | null;
    role: string;
    status: string;
    expiresAt: string;
    createdAt: string;
    invitedBy?: { id: string; name: string } | null;
    client?: { id: string; name: string } | null;
}

const ROLE_LABELS: Record<string, string> = {
    MANAGER: "Manager",
    SDR: "SDR",
    BOOKER: "Booker",
    BUSINESS_DEVELOPER: "BD",
    DEVELOPER: "Dev",
    CLIENT: "Client",
    COMMERCIAL: "Commercial",
};

const ROLE_COLORS: Record<string, string> = {
    MANAGER: "bg-indigo-50 text-indigo-700",
    SDR: "bg-blue-50 text-blue-700",
    BOOKER: "bg-blue-50 text-blue-600",
    BUSINESS_DEVELOPER: "bg-emerald-50 text-emerald-700",
    DEVELOPER: "bg-purple-50 text-purple-700",
    CLIENT: "bg-sky-50 text-sky-700",
    COMMERCIAL: "bg-teal-50 text-teal-700",
};

function daysLeft(expiresAt: string): number {
    const ms = new Date(expiresAt).getTime() - Date.now();
    return ms <= 0 ? 0 : Math.ceil(ms / (24 * 60 * 60 * 1000));
}

function formatDate(value: string): string {
    return new Date(value).toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
    });
}

export function PendingInvitationsTable({ refreshKey }: { refreshKey?: number }) {
    const { success, error: showError } = useToast();

    const [invitations, setInvitations] = useState<Invitation[]>([]);
    const [loading, setLoading] = useState(true);
    const [busyId, setBusyId] = useState<string | null>(null);
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [revokeTarget, setRevokeTarget] = useState<Invitation | null>(null);

    const fetchInvitations = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/invitations?status=PENDING", { cache: "no-store" });
            const json = await res.json();
            if (json?.success) setInvitations(json.data.invitations ?? []);
        } catch {
            showError("Chargement impossible", "Les invitations n'ont pas pu être récupérées.");
        } finally {
            setLoading(false);
        }
    }, [showError]);

    useEffect(() => {
        fetchInvitations();
    }, [fetchInvitations, refreshKey]);

    // Rotates the token and re-sends the email.
    const handleResend = async (invitation: Invitation) => {
        setBusyId(invitation.id);
        try {
            const res = await fetch(`/api/invitations/${invitation.id}/resend`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ sendEmail: true }),
            });
            const json = await res.json();
            if (!res.ok || !json?.success) {
                showError("Renvoi impossible", json?.error ?? "Réessayez dans un instant.");
                return;
            }
            if (json.data.emailSent) {
                success("Invitation renvoyée", `Un nouveau lien a été envoyé à ${invitation.email}.`);
            } else {
                success(
                    "Nouveau lien généré",
                    "L'email n'a pas pu être envoyé — utilisez « Copier le lien ».",
                );
            }
            await fetchInvitations();
        } finally {
            setBusyId(null);
        }
    };

    // Only the SHA-256 hash is stored, so a shareable link means minting a new
    // token. This rotates it without sending an email.
    const handleCopyLink = async (invitation: Invitation) => {
        setBusyId(invitation.id);
        try {
            const res = await fetch(`/api/invitations/${invitation.id}/resend`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ sendEmail: false }),
            });
            const json = await res.json();
            if (!res.ok || !json?.success) {
                showError("Lien indisponible", json?.error ?? "Réessayez dans un instant.");
                return;
            }
            await navigator.clipboard.writeText(json.data.inviteUrl);
            setCopiedId(invitation.id);
            setTimeout(() => setCopiedId(null), 2500);
            success(
                "Lien copié",
                "Le lien précédent est désormais invalide — partagez uniquement celui-ci.",
            );
            await fetchInvitations();
        } catch {
            showError("Copie impossible", "Votre navigateur a refusé l'accès au presse-papier.");
        } finally {
            setBusyId(null);
        }
    };

    const handleRevoke = async () => {
        if (!revokeTarget) return;
        const target = revokeTarget;
        setBusyId(target.id);
        try {
            const res = await fetch(`/api/invitations/${target.id}`, { method: "DELETE" });
            const json = await res.json();
            if (!res.ok || !json?.success) {
                showError("Révocation impossible", json?.error ?? "Réessayez dans un instant.");
                return;
            }
            success("Invitation révoquée", `Le lien envoyé à ${target.email} est désactivé.`);
            setRevokeTarget(null);
            await fetchInvitations();
        } finally {
            setBusyId(null);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-16">
                <Loader2 className="w-6 h-6 text-primary animate-spin" />
            </div>
        );
    }

    if (invitations.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
                    <MailX className="w-7 h-7 text-slate-400" />
                </div>
                <p className="font-semibold text-slate-700">Aucune invitation en attente</p>
                <p className="text-sm text-slate-400 mt-1">
                    Les invitations acceptées ou révoquées n&apos;apparaissent plus ici.
                </p>
            </div>
        );
    }

    return (
        <>
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                <div className="hidden lg:grid grid-cols-[1fr_110px_130px_130px_150px] items-center gap-4 px-4 py-2.5 bg-slate-50 border-b border-slate-100 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
                    <div>Invité</div>
                    <div>Rôle</div>
                    <div>Envoyée le</div>
                    <div>Expiration</div>
                    <div className="text-right">Actions</div>
                </div>

                {invitations.map((inv) => {
                    const remaining = daysLeft(inv.expiresAt);
                    const urgent = remaining <= 2;
                    const busy = busyId === inv.id;

                    return (
                        <div
                            key={inv.id}
                            className="grid grid-cols-1 lg:grid-cols-[1fr_110px_130px_130px_150px] items-center gap-3 lg:gap-4 px-4 py-3 border-b border-slate-100 last:border-0 hover:bg-slate-50/70 transition-colors"
                        >
                            {/* Invitee */}
                            <div className="min-w-0">
                                <p className="text-sm font-bold text-slate-900 truncate">
                                    {inv.name || inv.email.split("@")[0]}
                                </p>
                                <p className="text-xs text-slate-500 truncate">{inv.email}</p>
                                {inv.client && (
                                    <p className="text-[11px] text-slate-400 truncate">
                                        Compte {inv.client.name}
                                    </p>
                                )}
                            </div>

                            {/* Role */}
                            <div>
                                <span
                                    className={cn(
                                        "inline-block px-2.5 py-1 rounded-lg text-[11px] font-bold",
                                        ROLE_COLORS[inv.role] ?? "bg-slate-100 text-slate-600",
                                    )}
                                >
                                    {ROLE_LABELS[inv.role] ?? inv.role}
                                </span>
                            </div>

                            {/* Sent */}
                            <div className="text-xs text-slate-500">{formatDate(inv.createdAt)}</div>

                            {/* Expiry */}
                            <div>
                                <span
                                    className={cn(
                                        "inline-flex items-center gap-1.5 text-xs font-semibold",
                                        urgent ? "text-amber-600" : "text-slate-500",
                                    )}
                                >
                                    <Clock className="w-3.5 h-3.5" />
                                    {remaining === 0
                                        ? "Expirée"
                                        : `${remaining} jour${remaining > 1 ? "s" : ""}`}
                                </span>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center justify-start lg:justify-end gap-1">
                                <button
                                    type="button"
                                    onClick={() => handleResend(inv)}
                                    disabled={busy}
                                    title="Renvoyer l'invitation par email"
                                    className="p-2 rounded-lg text-slate-400 hover:bg-blue-50 hover:text-primary transition-colors disabled:opacity-40"
                                >
                                    {busy ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <RefreshCw className="w-4 h-4" />
                                    )}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleCopyLink(inv)}
                                    disabled={busy}
                                    title="Générer et copier un lien direct (invalide le lien précédent)"
                                    className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors disabled:opacity-40"
                                >
                                    {copiedId === inv.id ? (
                                        <Check className="w-4 h-4 text-emerald-600" />
                                    ) : (
                                        <Link2 className="w-4 h-4" />
                                    )}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setRevokeTarget(inv)}
                                    disabled={busy}
                                    title="Révoquer l'invitation"
                                    className="p-2 rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors disabled:opacity-40"
                                >
                                    <Ban className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>

            <p className="mt-3 flex items-start gap-2 text-[11px] text-slate-500 leading-relaxed">
                <Copy className="w-3.5 h-3.5 flex-shrink-0 mt-px text-slate-400" />
                Seule l&apos;empreinte du jeton est stockée : « Copier le lien » et « Renvoyer »
                génèrent un nouveau lien et invalident immédiatement le précédent.
            </p>

            <ConfirmModal
                isOpen={Boolean(revokeTarget)}
                onClose={() => setRevokeTarget(null)}
                onConfirm={handleRevoke}
                title="Révoquer cette invitation ?"
                message={
                    revokeTarget
                        ? `Le lien envoyé à ${revokeTarget.email} cessera de fonctionner immédiatement. Vous pourrez inviter cette personne à nouveau plus tard.`
                        : ""
                }
                confirmText="Révoquer"
                variant="danger"
                isLoading={busyId === revokeTarget?.id}
            />
        </>
    );
}
