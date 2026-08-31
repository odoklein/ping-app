"use client";

/**
 * Support surface visual tokens + keyframes for Ping.
 */
export function SupportStyles() {
    return (
        <style>{`
            .cp-support-root {
                font-family: 'DM Sans', 'Inter', system-ui, -apple-system, sans-serif;
                font-feature-settings: 'ss01' on, 'cv11' on;
            }
            .cp-support-root *, .cp-support-root *::before, .cp-support-root *::after { box-sizing: border-box; }
            .cp-support-root-mono { font-family: 'DM Mono', ui-monospace, SFMono-Regular, Menlo, monospace; }

            @keyframes cpSupBubbleIn { from { opacity:0; transform:scale(0.92) translateY(4px); } to { opacity:1; transform:scale(1) translateY(0); } }
            @keyframes cpSupPanelIn { from { opacity:0; transform:translateY(22px) scale(0.96); } to { opacity:1; transform:translateY(0) scale(1); } }
            @keyframes cpSupSlideDown { from { opacity:0; transform:translateY(-8px); } to { opacity:1; transform:translateY(0); } }
            @keyframes cpSupSlideUp { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
            @keyframes cpSupFabPulse {
                0%, 100% { box-shadow: 0 12px 32px rgba(40,144,248,0.32), 0 0 0 0 rgba(40,144,248,0.35); }
                50%      { box-shadow: 0 12px 32px rgba(40,144,248,0.32), 0 0 0 14px rgba(40,144,248,0); }
            }
            @keyframes cpSupStatusPing {
                0%, 100% { transform: scale(1); opacity: 0.55; }
                50%      { transform: scale(1.22); opacity: 0.15; }
            }
            @keyframes cpSupTypingDot {
                0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
                40%           { transform: translateY(-4px); opacity: 1; }
            }
            @keyframes cpSupBadgePop { from { transform: scale(0); } to { transform: scale(1); } }
            @keyframes cpSupPulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.55; } }
            @keyframes cpSupResolvedWash {
                from { background-color: rgba(40,144,248,0); }
                to   { background-color: rgba(40,144,248,0.06); }
            }

            .cp-support-root .cp-sup-scroll-hidden::-webkit-scrollbar { display: none; }
            .cp-support-root .cp-sup-scroll-hidden { scrollbar-width: none; -ms-overflow-style: none; }

            .cp-support-root .cp-sup-composer-input { outline: none; }
            .cp-support-root .cp-sup-composer-input::placeholder { color: rgba(8,8,8,0.45); }
            .cp-support-root-dark .cp-sup-composer-input::placeholder { color: rgba(255,255,255,0.45); }

            @media (prefers-reduced-motion: reduce) {
                .cp-support-root * { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
            }
        `}</style>
    );
}

/** Client portal panel tokens — clean whitesmoke paper, Ping blue accent. */
export const SUP_LIGHT = {
    paper: "#f8f8f8",
    paperRaised: "#ffffff",
    paperSunken: "#eeeeee",
    line: "rgba(8,8,8,0.10)",
    lineSoft: "rgba(8,8,8,0.06)",
    ink: "#080808",
    ink2: "#333333",
    ink3: "#666666",
    ink4: "#8d9b96",
    brand: "#2890F8",
    brandStrong: "#1a75ce",
    brandSoft: "#e6f0fa",
    brandSofter: "#f0f6fc",
    accentAmber: "#2890F8",
    accentAmberSoft: "#e6f0fa",
    danger: "#b9433e",
    dangerSoft: "#fae9e6",
    radiusXL: 24,
    radiusL: 20,
    radiusM: 16,
    radiusS: 12,
    radiusXS: 10,
    shadowPanel:
        "0 32px 80px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.6)",
    shadowFab: "0 12px 28px rgba(40,144,248,0.32)",
};

/** Manager workspace tokens — sits above the dark sidebar, Ping blue accent. */
export const SUP_DARK = {
    surface: "#080808",
    surfaceRaised: "#141414",
    surfaceSunken: "#000000",
    line: "rgba(255,255,255,0.08)",
    lineSoft: "rgba(255,255,255,0.05)",
    ink: "#ffffff",
    ink2: "#cccccc",
    ink3: "#888888",
    ink4: "#555555",
    brand: "#2890F8",
    brandStrong: "#1a75ce",
    brandSoft: "rgba(40,144,248,0.2)",
    accentAmber: "#5baefc",
    accentAmberSoft: "rgba(40,144,248,0.15)",
    danger: "#b9433e",
    dangerSoft: "rgba(185,67,62,0.12)",
    radiusXL: 24,
    radiusL: 20,
    radiusM: 16,
    radiusS: 12,
};

export const SUP_TOKENS = SUP_LIGHT;
