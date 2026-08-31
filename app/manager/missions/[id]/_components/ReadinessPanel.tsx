"use client";

import { CheckCircle2, AlertCircle, ArrowRight } from "lucide-react";

interface ReadinessPanelProps {
    readiness?: {
        activeLists: number;
        readyLists: number;
        missingStrategy: number;
        missingIcp: number;
        missingPitch: number;
        missingScript: number;
    };
    onConfigureClick?: () => void;
}

const C = {
    text: "#0F172A",
    textMuted: "#64748B",
    emerald: "#059669",
    emeraldBg: "#ECFDF5",
    emeraldBorder: "#A7F3D0",
    amber: "#D97706",
    amberBg: "#FFFBEB",
    amberBorder: "#FCD34D",
    indigo: "#4F46E5",
};

export function ReadinessPanel({ readiness, onConfigureClick }: ReadinessPanelProps) {
    if (!readiness) return null;
    const { activeLists, readyLists, missingStrategy, missingIcp, missingPitch, missingScript } = readiness;
    if (activeLists === 0) return null;

    const incomplete = activeLists - readyLists;
    const allReady = incomplete === 0;

    const accent = allReady ? C.emerald : C.amber;
    const accentBg = allReady ? C.emeraldBg : C.amberBg;
    const accentBorder = allReady ? C.emeraldBorder : C.amberBorder;

    const percent = activeLists > 0 ? Math.round((readyLists / activeLists) * 100) : 0;

    return (
        <div
            style={{
                marginTop: 20,
                background: accentBg,
                border: `1px solid ${accentBorder}`,
                borderRadius: 18,
                padding: 20,
                display: "flex",
                alignItems: "center",
                gap: 20,
                flexWrap: "wrap",
            }}
        >
            {/* Icon + headline */}
            <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0, flex: 1 }}>
                <div
                    style={{
                        width: 44,
                        height: 44,
                        borderRadius: 12,
                        background: accent,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                    }}
                >
                    {allReady ? (
                        <CheckCircle2 style={{ width: 24, height: 24, color: "#FFFFFF" }} />
                    ) : (
                        <AlertCircle style={{ width: 24, height: 24, color: "#FFFFFF" }} />
                    )}
                </div>
                <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: C.text }}>
                        {allReady
                            ? "Toutes les listes sont prêtes pour les SDR"
                            : `${incomplete} liste${incomplete > 1 ? "s" : ""} à configurer`}
                    </div>
                    <div style={{ fontSize: 13, color: C.textMuted, marginTop: 2 }}>
                        {readyLists} sur {activeLists} liste{activeLists > 1 ? "s" : ""} active{activeLists > 1 ? "s" : ""} prête{readyLists > 1 ? "s" : ""} ({percent}%)
                        {missingStrategy > 0 && ` · ${missingStrategy} sans stratégie`}
                        {missingIcp > 0 && ` · ${missingIcp} sans ICP`}
                        {missingPitch > 0 && ` · ${missingPitch} sans pitch`}
                        {missingScript > 0 && ` · ${missingScript} sans script`}
                    </div>
                </div>
            </div>

            {!allReady && (
                <button
                    type="button"
                    onClick={onConfigureClick}
                    style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "11px 18px",
                        fontSize: 14,
                        fontWeight: 600,
                        color: "#FFFFFF",
                        background: accent,
                        border: "none",
                        borderRadius: 10,
                        cursor: "pointer",
                        boxShadow: `0 4px 12px ${accent}40`,
                    }}
                >
                    Configurer maintenant
                    <ArrowRight style={{ width: 16, height: 16 }} />
                </button>
            )}
        </div>
    );
}
