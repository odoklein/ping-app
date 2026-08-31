"use client";

import { useState, useMemo } from "react";
import { useToast } from "@/components/ui";
import {
    Target,
    Plus,
    Copy,
    Link2,
    Link2Off,
    Pencil,
    Loader2,
    CheckCircle2,
    AlertCircle,
    Users,
    Sparkles,
    ChevronRight,
} from "lucide-react";
import { StrategyEditorDrawer } from "./StrategyEditorDrawer";

interface ListItem {
    id: string;
    name: string;
    type: string;
    isActive?: boolean;
    campaignId?: string | null;
    campaign?: {
        id: string;
        name: string;
        icp: string | null;
        pitch: string | null;
        script: string | null;
        isActive: boolean;
    } | null;
    readiness?: {
        hasStrategy: boolean;
        hasIcp: boolean;
        hasPitch: boolean;
        hasScript: boolean;
        isReady: boolean;
    };
    _count?: { companies: number };
}

interface CampaignItem {
    id: string;
    name: string;
    isActive: boolean;
}

interface StrategyByListTabProps {
    missionId: string;
    lists: ListItem[];
    campaigns: CampaignItem[];
    onChange: () => void;
}

// Explicit color palette — does not rely on global CSS variables
const COLORS = {
    text: "#0F172A",
    textMuted: "#64748B",
    textSubtle: "#94A3B8",
    border: "#E2E8F0",
    bg: "#FFFFFF",
    bgSubtle: "#F8FAFC",
    indigo: "#4F46E5",
    indigoDark: "#3730A3",
    indigoBg: "#EEF2FF",
    emerald: "#059669",
    emeraldBg: "#ECFDF5",
    amber: "#D97706",
    amberBg: "#FFFBEB",
    sky: "#0284C7",
    skyBg: "#F0F9FF",
    rose: "#E11D48",
    roseBg: "#FFF1F2",
} as const;

export function StrategyByListTab({ missionId, lists, campaigns, onChange }: StrategyByListTabProps) {
    const { success, error: showError } = useToast();

    const [drawerOpen, setDrawerOpen] = useState(false);
    const [editingCampaignId, setEditingCampaignId] = useState<string | null>(null);
    const [initialAssignToListId, setInitialAssignToListId] = useState<string | null>(null);
    const [busyListId, setBusyListId] = useState<string | null>(null);
    const [pickerListId, setPickerListId] = useState<string | null>(null);

    const sortedLists = useMemo(() => {
        return [...lists].sort((a, b) => {
            // Sort: missing strategy first (most urgent), then partial, then ready
            const score = (l: ListItem) => {
                if (!l.readiness?.hasStrategy) return 0;
                if (!l.readiness.isReady) return 1;
                return 2;
            };
            const diff = score(a) - score(b);
            if (diff !== 0) return diff;
            return a.name.localeCompare(b.name);
        });
    }, [lists]);

    const openEdit = (campaignId: string) => {
        setEditingCampaignId(campaignId);
        setInitialAssignToListId(null);
        setDrawerOpen(true);
    };
    const openCreateForList = (listId: string) => {
        setEditingCampaignId(null);
        setInitialAssignToListId(listId);
        setDrawerOpen(true);
    };

    const handleDuplicate = async (sourceCampaignId: string, list: ListItem) => {
        setBusyListId(list.id);
        try {
            const res = await fetch(`/api/campaigns/${sourceCampaignId}/duplicate`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: `Stratégie — ${list.name}`,
                    assignToListId: list.id,
                }),
            });
            const json = await res.json();
            if (!json.success) {
                showError("Erreur", json.error || "Duplication échouée");
                return;
            }
            success("Stratégie créée par copie", `Liée à la liste « ${list.name} »`);
            onChange();
            setEditingCampaignId(json.data.id);
            setInitialAssignToListId(null);
            setDrawerOpen(true);
        } catch {
            showError("Erreur", "Duplication échouée");
        } finally {
            setBusyListId(null);
        }
    };

    const handleAssign = async (list: ListItem, campaignId: string | null) => {
        setBusyListId(list.id);
        setPickerListId(null);
        try {
            const res = await fetch(`/api/lists/${list.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ campaignId }),
            });
            const json = await res.json();
            if (!json.success) {
                showError("Erreur", json.error || "Mise à jour échouée");
                return;
            }
            success(
                campaignId ? "Stratégie liée" : "Stratégie détachée",
                campaignId ? `Liste « ${list.name} » mise à jour` : `Liste « ${list.name} » sans stratégie`
            );
            onChange();
        } catch {
            showError("Erreur", "Mise à jour échouée");
        } finally {
            setBusyListId(null);
        }
    };

    const defaultCampaign = campaigns.find((c) => c.isActive);

    return (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-500" style={{ color: COLORS.text }}>
            {/* Header / explainer */}
            <div
                style={{
                    background: `linear-gradient(135deg, ${COLORS.indigoBg} 0%, #FFFFFF 60%)`,
                    border: `1px solid ${COLORS.border}`,
                    borderRadius: 20,
                    padding: 24,
                    marginBottom: 20,
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 16,
                }}
            >
                <div
                    style={{
                        width: 48,
                        height: 48,
                        borderRadius: 14,
                        background: `linear-gradient(135deg, ${COLORS.indigo}, ${COLORS.indigoDark})`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                        boxShadow: "0 8px 24px rgba(79, 70, 229, 0.25)",
                    }}
                >
                    <Sparkles style={{ width: 24, height: 24, color: "#FFFFFF" }} />
                </div>
                <div style={{ flex: 1 }}>
                    <h2 style={{ fontSize: 20, fontWeight: 700, color: COLORS.text, margin: 0 }}>
                        Une stratégie par liste
                    </h2>
                    <p style={{ fontSize: 14, color: COLORS.textMuted, margin: "6px 0 0", lineHeight: 1.5 }}>
                        Pour chaque liste de prospects, définissez l’ICP, le pitch et le script.
                        Les SDR utiliseront automatiquement le bon script quand ils travaillent cette liste.
                    </p>
                </div>
            </div>

            {sortedLists.length === 0 ? (
                <div
                    style={{
                        background: COLORS.bg,
                        border: `2px dashed ${COLORS.border}`,
                        borderRadius: 20,
                        padding: 48,
                        textAlign: "center",
                        color: COLORS.textMuted,
                    }}
                >
                    <Users style={{ width: 32, height: 32, color: COLORS.textSubtle, margin: "0 auto 12px" }} />
                    <p style={{ fontSize: 15, fontWeight: 600, color: COLORS.text, margin: 0 }}>
                        Aucune liste dans cette mission
                    </p>
                    <p style={{ fontSize: 13, marginTop: 6 }}>
                        Importez ou créez une liste pour commencer.
                    </p>
                </div>
            ) : (
                <div style={{ display: "grid", gap: 16 }}>
                    {sortedLists.map((list) => {
                        const r = list.readiness;
                        const hasStrategy = !!list.campaign;
                        const isReady = !!r?.isReady;
                        const inactive = list.isActive === false;
                        const isBusy = busyListId === list.id;

                        // Card accent + status colors
                        const statusColor = !hasStrategy ? COLORS.amber : isReady ? COLORS.emerald : COLORS.sky;
                        const statusBg = !hasStrategy ? COLORS.amberBg : isReady ? COLORS.emeraldBg : COLORS.skyBg;
                        const statusLabel = !hasStrategy
                            ? "Aucune stratégie"
                            : isReady
                                ? "Prête pour les SDR"
                                : "À compléter";

                        const availableCampaigns = campaigns.filter(
                            (c) => c.isActive && c.id !== list.campaignId
                        );

                        return (
                            <div
                                key={list.id}
                                style={{
                                    background: COLORS.bg,
                                    border: `1px solid ${COLORS.border}`,
                                    borderRadius: 20,
                                    boxShadow: "0 1px 3px rgba(15, 23, 42, 0.04)",
                                    overflow: "hidden",
                                    opacity: inactive ? 0.7 : 1,
                                    transition: "box-shadow 200ms ease",
                                }}
                            >
                                {/* Top bar: list name + status */}
                                <div
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "space-between",
                                        padding: "18px 24px",
                                        borderBottom: `1px solid ${COLORS.border}`,
                                        gap: 16,
                                    }}
                                >
                                    <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0 }}>
                                        <div
                                            style={{
                                                width: 44,
                                                height: 44,
                                                borderRadius: 12,
                                                background: COLORS.indigoBg,
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                flexShrink: 0,
                                            }}
                                        >
                                            <Users style={{ width: 22, height: 22, color: COLORS.indigo }} />
                                        </div>
                                        <div style={{ minWidth: 0 }}>
                                            <div
                                                style={{
                                                    fontSize: 17,
                                                    fontWeight: 700,
                                                    color: COLORS.text,
                                                    overflow: "hidden",
                                                    textOverflow: "ellipsis",
                                                    whiteSpace: "nowrap",
                                                }}
                                            >
                                                {list.name}
                                            </div>
                                            <div style={{ fontSize: 13, color: COLORS.textMuted, marginTop: 2 }}>
                                                {list._count?.companies ?? 0} sociétés · {list.type}
                                                {inactive ? " · Désactivée" : ""}
                                            </div>
                                        </div>
                                    </div>

                                    <span
                                        style={{
                                            display: "inline-flex",
                                            alignItems: "center",
                                            gap: 6,
                                            fontSize: 13,
                                            fontWeight: 600,
                                            color: statusColor,
                                            background: statusBg,
                                            padding: "8px 14px",
                                            borderRadius: 999,
                                            border: `1px solid ${statusColor}33`,
                                            flexShrink: 0,
                                        }}
                                    >
                                        {hasStrategy && isReady ? (
                                            <CheckCircle2 style={{ width: 16, height: 16 }} />
                                        ) : (
                                            <AlertCircle style={{ width: 16, height: 16 }} />
                                        )}
                                        {statusLabel}
                                    </span>
                                </div>

                                {/* Body */}
                                <div style={{ padding: "20px 24px" }}>
                                    {hasStrategy ? (
                                        <>
                                            <div
                                                style={{
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: 10,
                                                    marginBottom: 14,
                                                }}
                                            >
                                                <Target style={{ width: 18, height: 18, color: COLORS.indigo }} />
                                                <span style={{ fontSize: 14, color: COLORS.textMuted }}>
                                                    Stratégie liée :
                                                </span>
                                                <span style={{ fontSize: 15, fontWeight: 600, color: COLORS.text }}>
                                                    {list.campaign!.name}
                                                </span>
                                            </div>

                                            {/* Readiness pills */}
                                            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 18 }}>
                                                <ReadinessPill label="ICP" ok={!!r?.hasIcp} />
                                                <ReadinessPill label="Pitch" ok={!!r?.hasPitch} />
                                                <ReadinessPill label="Script" ok={!!r?.hasScript} />
                                            </div>
                                        </>
                                    ) : (
                                        <p
                                            style={{
                                                fontSize: 14,
                                                color: COLORS.textMuted,
                                                margin: "0 0 18px",
                                                lineHeight: 1.5,
                                            }}
                                        >
                                            Cette liste n’a pas encore de stratégie.
                                            Choisissez une option ci-dessous pour démarrer.
                                        </p>
                                    )}

                                    {/* Action buttons */}
                                    <div
                                        style={{
                                            display: "flex",
                                            flexWrap: "wrap",
                                            gap: 10,
                                        }}
                                    >
                                        {hasStrategy ? (
                                            <PrimaryButton
                                                onClick={() => openEdit(list.campaign!.id)}
                                                icon={<Pencil style={{ width: 16, height: 16 }} />}
                                                disabled={isBusy}
                                            >
                                                Modifier la stratégie
                                            </PrimaryButton>
                                        ) : (
                                            <PrimaryButton
                                                onClick={() => openCreateForList(list.id)}
                                                icon={<Plus style={{ width: 16, height: 16 }} />}
                                                disabled={isBusy}
                                            >
                                                Créer une stratégie
                                            </PrimaryButton>
                                        )}

                                        {defaultCampaign && (!hasStrategy || list.campaign?.id !== defaultCampaign.id) && (
                                            <SecondaryButton
                                                onClick={() => handleDuplicate(defaultCampaign.id, list)}
                                                icon={isBusy ? <Loader2 style={{ width: 16, height: 16 }} className="animate-spin" /> : <Copy style={{ width: 16, height: 16 }} />}
                                                disabled={isBusy}
                                            >
                                                Copier la stratégie par défaut
                                            </SecondaryButton>
                                        )}

                                        {availableCampaigns.length > 0 && (
                                            <div style={{ position: "relative" }}>
                                                <SecondaryButton
                                                    onClick={() => setPickerListId(pickerListId === list.id ? null : list.id)}
                                                    icon={<Link2 style={{ width: 16, height: 16 }} />}
                                                    disabled={isBusy}
                                                >
                                                    Choisir une stratégie existante
                                                </SecondaryButton>
                                                {pickerListId === list.id && (
                                                    <>
                                                        <div
                                                            onClick={() => setPickerListId(null)}
                                                            style={{
                                                                position: "fixed",
                                                                inset: 0,
                                                                zIndex: 10,
                                                            }}
                                                        />
                                                        <div
                                                            style={{
                                                                position: "absolute",
                                                                top: "calc(100% + 6px)",
                                                                left: 0,
                                                                zIndex: 20,
                                                                minWidth: 260,
                                                                maxHeight: 280,
                                                                overflowY: "auto",
                                                                background: COLORS.bg,
                                                                border: `1px solid ${COLORS.border}`,
                                                                borderRadius: 12,
                                                                boxShadow: "0 12px 32px rgba(15, 23, 42, 0.12)",
                                                                padding: 6,
                                                            }}
                                                        >
                                                            {availableCampaigns.map((c) => (
                                                                <button
                                                                    key={c.id}
                                                                    type="button"
                                                                    onClick={() => handleAssign(list, c.id)}
                                                                    style={{
                                                                        width: "100%",
                                                                        textAlign: "left",
                                                                        padding: "10px 12px",
                                                                        fontSize: 14,
                                                                        color: COLORS.text,
                                                                        background: "transparent",
                                                                        border: "none",
                                                                        borderRadius: 8,
                                                                        cursor: "pointer",
                                                                        display: "flex",
                                                                        alignItems: "center",
                                                                        gap: 8,
                                                                    }}
                                                                    onMouseEnter={(e) => (e.currentTarget.style.background = COLORS.bgSubtle)}
                                                                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                                                                >
                                                                    <Target style={{ width: 14, height: 14, color: COLORS.indigo }} />
                                                                    {c.name}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        )}

                                        {hasStrategy && (
                                            <button
                                                type="button"
                                                onClick={() => handleAssign(list, null)}
                                                disabled={isBusy}
                                                style={{
                                                    display: "inline-flex",
                                                    alignItems: "center",
                                                    gap: 8,
                                                    padding: "10px 16px",
                                                    fontSize: 14,
                                                    fontWeight: 500,
                                                    color: COLORS.rose,
                                                    background: "transparent",
                                                    border: "none",
                                                    cursor: isBusy ? "not-allowed" : "pointer",
                                                    borderRadius: 10,
                                                    marginLeft: "auto",
                                                    opacity: isBusy ? 0.6 : 1,
                                                }}
                                                onMouseEnter={(e) => (e.currentTarget.style.background = COLORS.roseBg)}
                                                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                                            >
                                                <Link2Off style={{ width: 16, height: 16 }} />
                                                Détacher
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            <StrategyEditorDrawer
                isOpen={drawerOpen}
                onClose={() => setDrawerOpen(false)}
                campaignId={editingCampaignId}
                missionId={missionId}
                lists={lists}
                initialAssignToListId={initialAssignToListId}
                onSaved={onChange}
            />
        </div>
    );
}

function ReadinessPill({ label, ok }: { label: string; ok: boolean }) {
    const color = ok ? COLORS.emerald : COLORS.amber;
    const bg = ok ? COLORS.emeraldBg : COLORS.amberBg;
    return (
        <span
            style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                fontSize: 13,
                fontWeight: 500,
                color,
                background: bg,
                padding: "6px 12px",
                borderRadius: 8,
                border: `1px solid ${color}33`,
            }}
        >
            {ok ? <CheckCircle2 style={{ width: 14, height: 14 }} /> : <AlertCircle style={{ width: 14, height: 14 }} />}
            {label} {ok ? "OK" : "manquant"}
        </span>
    );
}

function PrimaryButton({
    children,
    onClick,
    icon,
    disabled,
}: {
    children: React.ReactNode;
    onClick: () => void;
    icon?: React.ReactNode;
    disabled?: boolean;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "11px 18px",
                fontSize: 14,
                fontWeight: 600,
                color: "#FFFFFF",
                background: `linear-gradient(135deg, ${COLORS.indigo}, ${COLORS.indigoDark})`,
                border: "none",
                borderRadius: 10,
                cursor: disabled ? "not-allowed" : "pointer",
                opacity: disabled ? 0.6 : 1,
                boxShadow: "0 4px 12px rgba(79, 70, 229, 0.25)",
                transition: "transform 120ms ease, box-shadow 120ms ease",
            }}
            onMouseEnter={(e) => {
                if (disabled) return;
                e.currentTarget.style.transform = "translateY(-1px)";
                e.currentTarget.style.boxShadow = "0 6px 18px rgba(79, 70, 229, 0.35)";
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 4px 12px rgba(79, 70, 229, 0.25)";
            }}
        >
            {icon}
            {children}
            <ChevronRight style={{ width: 16, height: 16, marginLeft: 2 }} />
        </button>
    );
}

function SecondaryButton({
    children,
    onClick,
    icon,
    disabled,
}: {
    children: React.ReactNode;
    onClick: () => void;
    icon?: React.ReactNode;
    disabled?: boolean;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "11px 16px",
                fontSize: 14,
                fontWeight: 500,
                color: COLORS.text,
                background: COLORS.bg,
                border: `1px solid ${COLORS.border}`,
                borderRadius: 10,
                cursor: disabled ? "not-allowed" : "pointer",
                opacity: disabled ? 0.6 : 1,
                transition: "border-color 120ms ease, background 120ms ease",
            }}
            onMouseEnter={(e) => {
                if (disabled) return;
                e.currentTarget.style.borderColor = COLORS.indigo;
                e.currentTarget.style.background = COLORS.indigoBg;
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = COLORS.border;
                e.currentTarget.style.background = COLORS.bg;
            }}
        >
            {icon}
            {children}
        </button>
    );
}
