"use client";

import {
    Fragment, useState, useEffect, useCallback, useMemo, useRef
} from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
    Phone, Mail, Linkedin, Building2, User, CheckCircle2,
    XCircle, Ban, Loader2, Clock, Calendar, Sparkles, RotateCcw,
    RefreshCw, ArrowLeft, BarChart3, TrendingUp, TrendingDown,
    Search, CalendarPlus, ChevronRight, ChevronUp, ChevronDown,
    Activity, Target, Send, PhoneMissed, ThumbsUp, PhoneOff,
    CalendarX, RotateCw, SlidersHorizontal, Download, Columns3,
    X, Minus, Radio, Zap, Users, Filter, ArrowUpDown,
    Eye, EyeOff, MoreHorizontal, Maximize2, Mic, Check
} from "lucide-react";
import dynamic from "next/dynamic";
import { Card, Button, useToast } from "@/components/ui";
import { ManagerCallEnrichmentSyncModal } from "@/components/prospection/ManagerCallEnrichmentSyncModal";
import { ACTION_RESULT_LABELS } from "@/lib/types";
import { cn } from "@/lib/utils";

const UnifiedActionDrawer = dynamic(
    () => import("@/components/drawers/UnifiedActionDrawer").then((m) => ({ default: m.UnifiedActionDrawer })),
    { ssr: false }
);

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

const CHANNEL_TABS = [
    { value: "CALL" as const, label: "Appels", icon: Phone },
    { value: "EMAIL" as const, label: "Email", icon: Mail },
    { value: "LINKEDIN" as const, label: "LinkedIn", icon: Linkedin },
] as const;
type ChannelTabValue = (typeof CHANNEL_TABS)[number]["value"];

type SortKey = "createdAt" | "result" | "sdr" | "name" | "duration";
type SortDir = "asc" | "desc";
type Density = "compact" | "default" | "comfortable";

interface MissionItem {
    id: string;
    name: string;
    channel: string;
    channels?: string[];
    client: { id: string; name: string };
    _count?: { actions: number; campaigns: number };
    sdrAssignments?: { sdrId: string; sdr: { id: string; name: string } }[];
}

interface ActionRecord {
    id: string;
    contactId: string | null;
    companyId: string | null;
    contact: {
        id: string;
        firstName?: string | null;
        lastName?: string | null;
        company: { id: string; name: string };
    } | null;
    company: { id: string; name: string } | null;
    sdr: { id: string; name: string } | null;
    channel: string;
    result: string;
    note?: string;
    callSummary?: string | null;
    callTranscription?: string | null;
    callRecordingUrl?: string | null;
    duration?: number;
    createdAt: string;
    callbackDate?: string | null;
    _searchKey?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// RESULT CONFIG
// ─────────────────────────────────────────────────────────────────────────────

const RESULT_CFG: Record<string, {
    label: string; icon: React.ElementType;
    text: string; bg: string; border: string; dot: string;
}> = {
    NO_RESPONSE: { label: "Pas de réponse", icon: PhoneMissed, text: "text-slate-500", bg: "bg-slate-100", border: "border-slate-200", dot: "bg-slate-400" },
    BAD_CONTACT: { label: "Mauvais contact", icon: PhoneOff, text: "text-rose-600", bg: "bg-rose-50", border: "border-rose-200", dot: "bg-rose-400" },
    INTERESTED: { label: "Intéressé", icon: ThumbsUp, text: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200", dot: "bg-emerald-500" },
    CALLBACK_REQUESTED: { label: "Rappel demandé", icon: RotateCw, text: "text-amber-700", bg: "bg-amber-50", border: "border-amber-200", dot: "bg-amber-500" },
    MEETING_BOOKED: { label: "RDV planifié", icon: CalendarPlus, text: "text-blue-700", bg: "bg-blue-50", border: "border-blue-200", dot: "bg-blue-500" },
    MEETING_CANCELLED: { label: "RDV annulé", icon: CalendarX, text: "text-rose-600", bg: "bg-rose-50", border: "border-rose-200", dot: "bg-rose-400" },
    DISQUALIFIED: { label: "Disqualifié", icon: Ban, text: "text-slate-500", bg: "bg-slate-100", border: "border-slate-200", dot: "bg-slate-300" },
    ENVOIE_MAIL: { label: "Mail à envoyer", icon: Send, text: "text-indigo-700", bg: "bg-indigo-50", border: "border-indigo-200", dot: "bg-indigo-500" },
    MAIL_ENVOYE: { label: "Mail envoyé", icon: Send, text: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200", dot: "bg-emerald-500" },
    CONNECTION_SENT: { label: "Connexion envoyée", icon: Linkedin, text: "text-sky-700", bg: "bg-sky-50", border: "border-sky-200", dot: "bg-sky-400" },
    MESSAGE_SENT: { label: "Message envoyé", icon: Linkedin, text: "text-sky-700", bg: "bg-sky-50", border: "border-sky-200", dot: "bg-sky-400" },
    REPLIED: { label: "A répondu", icon: CheckCircle2, text: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200", dot: "bg-emerald-500" },
    NOT_INTERESTED: { label: "Pas intéressé", icon: XCircle, text: "text-rose-600", bg: "bg-rose-50", border: "border-rose-200", dot: "bg-rose-400" },
};

function getCfg(r: string) {
    return RESULT_CFG[r] ?? { label: r, icon: Target, text: "text-slate-500", bg: "bg-slate-100", border: "border-slate-200", dot: "bg-slate-400" };
}

const CHANNEL_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
    CALL: Phone, EMAIL: Mail, LINKEDIN: Linkedin,
};

// ─────────────────────────────────────────────────────────────────────────────
// MINI SPARKLINE
// ─────────────────────────────────────────────────────────────────────────────

function Sparkline({ data, color = "#6366f1" }: { data: number[]; color?: string }) {
    if (data.length < 2) return null;
    const max = Math.max(...data, 1);
    const W = 56, H = 20;
    const pts = data
        .map((v, i) => `${(i / (data.length - 1)) * W},${H - (v / max) * (H - 2) + 1}`)
        .join(" ");
    return (
        <svg width={W} height={H} className="shrink-0">
            <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5"
                strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// LIVE PULSE
// ─────────────────────────────────────────────────────────────────────────────

function LivePulse({ label }: { label: string }) {
    return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-700 select-none">
            <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            {label}
        </span>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// RESULT BADGE
// ─────────────────────────────────────────────────────────────────────────────

function ResultBadge({ result }: { result: string }) {
    const c = getCfg(result);
    const Icon = c.icon;
    return (
        <span className={cn(
            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-bold whitespace-nowrap",
            c.bg, c.text, c.border
        )}>
            <Icon className="w-3 h-3 shrink-0" aria-hidden />
            {c.label}
        </span>
    );
}

function LastActionBadge({ row }: { row: ActionRecord }) {
    const cfg = getCfg(row.result);
    const Icon = cfg.icon;
    return (
        <span className={cn(
            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-bold whitespace-nowrap",
            cfg.bg, cfg.text, cfg.border
        )}>
            <Icon className="w-3 h-3 shrink-0" aria-hidden />
            {cfg.label}
        </span>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// TABLE HEADER SORTABLE CELL
// ─────────────────────────────────────────────────────────────────────────────

function Th({
    label, sortKey, currentKey, dir, onSort, className,
}: {
    label: string; sortKey: SortKey; currentKey: SortKey;
    dir: SortDir; onSort: (k: SortKey) => void; className?: string;
}) {
    const active = currentKey === sortKey;
    return (
        <th
            scope="col"
            className={cn(
                "px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400 select-none cursor-pointer hover:text-slate-700 transition-colors",
                active && "text-primary",
                className
            )}
            onClick={() => onSort(sortKey)}
        >
            <div className="flex items-center gap-1">
                <span>{label}</span>
                <span className="flex flex-col">
                    {active ? (
                        dir === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                    ) : (
                        <ArrowUpDown className="w-3 h-3 opacity-40" />
                    )}
                </span>
            </div>
        </th>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// COLUMN TOGGLE & DENSITY TOGGLE
// ─────────────────────────────────────────────────────────────────────────────

const ALL_COLS = [
    { key: "date", label: "Date" },
    { key: "name", label: "Contact / Société" },
    { key: "sdr", label: "Effectué par" },
    { key: "result", label: "Résultat" },
    { key: "note", label: "Résumé / Note" },
    { key: "duration", label: "Durée" },
] as const;
type ColKey = (typeof ALL_COLS)[number]["key"];

function ColToggle({
    visible, onToggle,
}: {
    visible: Set<ColKey>; onToggle: (k: ColKey) => void;
}) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    return (
        <div ref={ref} className="relative">
            <button
                type="button"
                onClick={() => setOpen(o => !o)}
                aria-label="Colonnes visibles"
                className="h-9 px-3 flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white text-slate-600 text-xs font-bold hover:bg-slate-50 transition-colors"
            >
                <Columns3 className="w-3.5 h-3.5" aria-hidden />
                Colonnes
            </button>
            {open && (
                <div className="absolute right-0 top-11 z-30 w-48 rounded-2xl bg-white border border-slate-200 shadow-xl p-2 space-y-1">
                    {ALL_COLS.map(c => {
                        const active = visible.has(c.key);
                        return (
                            <button
                                key={c.key}
                                type="button"
                                onClick={() => onToggle(c.key)}
                                className={cn(
                                    "w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-colors",
                                    active ? "bg-slate-100 text-slate-900" : "text-slate-400 hover:text-slate-700"
                                )}
                            >
                                <span>{c.label}</span>
                                {active && <Check className="w-3.5 h-3.5 text-primary" />}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

function DensityToggle({
    value, onChange,
}: {
    value: Density; onChange: (d: Density) => void;
}) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    const options: { val: Density; label: string; rows: number }[] = [
        { val: "compact", label: "Compact", rows: 4 },
        { val: "default", label: "Standard", rows: 3 },
        { val: "comfortable", label: "Aéré", rows: 2 },
    ];

    return (
        <div ref={ref} className="relative">
            <button
                type="button"
                onClick={() => setOpen(o => !o)}
                aria-label="Densité d'affichage"
                className="h-9 px-3 flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white text-slate-600 text-xs font-bold hover:bg-slate-50 transition-colors"
            >
                <SlidersHorizontal className="w-3.5 h-3.5" aria-hidden />
                Densité
            </button>
            {open && (
                <div className="absolute right-0 top-11 z-30 w-40 rounded-2xl bg-white border border-slate-200 shadow-xl p-2 space-y-1">
                    {options.map(opt => (
                        <button
                            key={opt.val}
                            type="button"
                            onClick={() => { onChange(opt.val); setOpen(false); }}
                            className={cn(
                                "w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-colors",
                                value === opt.val ? "bg-slate-100 text-slate-900" : "text-slate-400 hover:text-slate-700"
                            )}
                        >
                            {opt.label}
                            <span className="flex flex-col gap-px opacity-40">
                                {Array.from({ length: opt.rows }).map((_, i) => (
                                    <span key={i} className="block w-5 h-0.5 bg-current rounded-full" />
                                ))}
                            </span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// RESULT FILTER CHIPS
// ─────────────────────────────────────────────────────────────────────────────

function ResultFilterBar({
    results, active, onToggle, counts,
}: {
    results: string[]; active: Set<string>;
    onToggle: (r: string) => void; counts: Record<string, number>;
}) {
    return (
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtrer par résultat">
            {results.map(r => {
                const c = getCfg(r);
                const Icon = c.icon;
                const isActive = active.has(r);
                const count = counts[r] ?? 0;
                return (
                    <button
                        key={r}
                        type="button"
                        onClick={() => onToggle(r)}
                        aria-pressed={isActive}
                        className={cn(
                            "flex items-center gap-1.5 pl-2.5 pr-2 py-1.5 rounded-xl border text-[11px] font-bold transition-all duration-150",
                            isActive
                                ? cn(c.bg, c.text, c.border, "shadow-2xs")
                                : "bg-white border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50"
                        )}
                    >
                        <Icon className="w-3 h-3 shrink-0" aria-hidden />
                        {c.label}
                        <span className={cn(
                            "ml-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-black tabular-nums",
                            isActive ? "bg-white/60" : "bg-slate-100 text-slate-500"
                        )}>
                            {count}
                        </span>
                    </button>
                );
            })}
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// CSV EXPORT & HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function exportCSV(rows: ActionRecord[], mission: string) {
    const headers = ["Date (création action)", "Contact", "Société", "SDR", "Résultat", "Résumé / Note", "Durée (s)"];
    const lines = rows.map(r => {
        const name = getContactName(r);
        const company = getCompanyName(r);
        const note = (r.callSummary?.trim() || r.note || "").replace(/"/g, '""');
        const dateKey = r.createdAt;
        return [
            new Date(dateKey).toLocaleString("fr-FR"),
            name, company,
            r.sdr?.name ?? "",
            getCfg(r.result).label,
            `"${note}"`,
            r.duration ?? "",
        ].join(",");
    });
    const blob = new Blob([headers.join(",") + "\n" + lines.join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `prospection_${mission}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
}

function getContactName(action: ActionRecord): string {
    const full = `${action.contact?.firstName || ""} ${action.contact?.lastName || ""}`.trim();
    if (full) return full;
    return "";
}

function getCompanyName(action: ActionRecord): string {
    return action.company?.name || action.contact?.company?.name || "";
}

function getActionDisplaySummary(action: ActionRecord): string {
    return action.callSummary?.trim() || action.note?.trim() || "";
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────

export default function ManagerProspectionPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const channelParam = (searchParams.get("channel") || "CALL").toUpperCase();
    const channel: ChannelTabValue = CHANNEL_TABS.some(t => t.value === channelParam)
        ? (channelParam as ChannelTabValue) : "CALL";

    const setChannel = useCallback((ch: ChannelTabValue) => {
        router.replace(`/manager/prospection?channel=${ch}`, { scroll: false });
    }, [router]);

    // Data state
    const [missions, setMissions] = useState<MissionItem[]>([]);
    const [missionsLoading, setMissionsLoading] = useState(true);
    const [selectedMission, setSelectedMission] = useState<MissionItem | null>(null);
    const [actions, setActions] = useState<ActionRecord[]>([]);
    const [stats, setStats] = useState<Record<string, any> | null>(null);
    const [loadingData, setLoadingData] = useState(false);
    const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
    const [newCount, setNewCount] = useState(0);
    const { error: showError, success: showSuccess } = useToast();
    const [sdrOptions, setSdrOptions] = useState<{ id: string; name: string }[]>([]);
    const [pickerMissionSearch, setPickerMissionSearch] = useState("");
    const [pickerClientId, setPickerClientId] = useState("");
    const [pickerSdrId, setPickerSdrId] = useState("");
    const [drawerAction, setDrawerAction] = useState<ActionRecord | null>(null);
    const [callSyncModalOpen, setCallSyncModalOpen] = useState(false);
    const [bulkCallSyncOpen, setBulkCallSyncOpen] = useState(false);
    const [drawerClientBookingUrl, setDrawerClientBookingUrl] = useState<string>("");
    const [drawerClientInterlocuteurs, setDrawerClientInterlocuteurs] = useState<Array<{
        id: string; firstName: string; lastName: string; title?: string;
        emails: Array<{ value: string; label: string; isPrimary: boolean }>;
        phones: Array<{ value: string; label: string; isPrimary: boolean }>;
        bookingLinks: Array<{ label: string; url: string; durationMinutes: number }>;
        isActive: boolean;
    }>>([]);
    const liveTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Table state
    const [search, setSearch] = useState("");
    const [sdrFilter, setSdrFilter] = useState("");
    const [actionChannelFilter, setActionChannelFilter] = useState<"" | ChannelTabValue>("");
    const [resultFilters, setResultFilters] = useState<Set<string>>(new Set());
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");
    const [sortKey, setSortKey] = useState<SortKey>("createdAt");
    const [sortDir, setSortDir] = useState<SortDir>("desc");
    const [density, setDensity] = useState<Density>("default");
    const [visibleCols, setVisibleCols] = useState<Set<ColKey>>(
        new Set(["date", "name", "sdr", "result", "note", "duration"])
    );
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(100);
    const [liveRefresh, setLiveRefresh] = useState(true);
    const [exporting, setExporting] = useState(false);
    const searchRef = useRef<HTMLInputElement>(null);

    // Init SDR list
    useEffect(() => {
        let cancelled = false;
        fetch("/api/users?role=SDR,BUSINESS_DEVELOPER")
            .then(r => r.json())
            .then(j => { if (!cancelled && j.success) setSdrOptions(Array.isArray(j.data) ? j.data : []); });
        return () => { cancelled = true; };
    }, []);

    // Missions catalog
    const reloadMissionsCatalog = useCallback(() => {
        setMissionsLoading(true);
        const p = new URLSearchParams({ isActive: "true", limit: "100", channel });
        fetch(`/api/missions?${p}`)
            .then(r => r.json())
            .then(j => { if (j.success) setMissions(j.data); })
            .finally(() => setMissionsLoading(false));
    }, [channel]);

    useEffect(() => {
        reloadMissionsCatalog();
    }, [reloadMissionsCatalog]);

    // Keyboard shortcut: "/" focuses search
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === "/" && document.activeElement?.tagName !== "INPUT") {
                e.preventDefault();
                searchRef.current?.focus();
            }
            if (e.key === "Escape") {
                setSearch("");
                setResultFilters(new Set());
                setSdrFilter("");
                setActionChannelFilter("");
                setDateFrom("");
                setDateTo("");
                setPickerMissionSearch("");
                setPickerClientId("");
                setPickerSdrId("");
            }
        };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, []);

    // Fetch booking URL & contacts
    useEffect(() => {
        if (!drawerAction || !selectedMission?.id) {
            setDrawerClientBookingUrl("");
            setDrawerClientInterlocuteurs([]);
            return;
        }
        let cancelled = false;
        fetch(`/api/missions/${selectedMission.id}/client-booking`)
            .then(r => r.json())
            .then(j => {
                if (cancelled) return;
                if (j.success) {
                    setDrawerClientBookingUrl(j.data?.bookingUrl || "");
                    setDrawerClientInterlocuteurs(Array.isArray(j.data?.interlocuteurs) ? j.data.interlocuteurs : []);
                } else {
                    setDrawerClientBookingUrl("");
                    setDrawerClientInterlocuteurs([]);
                }
            })
            .catch(() => {
                if (cancelled) return;
                setDrawerClientBookingUrl("");
                setDrawerClientInterlocuteurs([]);
            });
        return () => { cancelled = true; };
    }, [drawerAction, selectedMission?.id]);

    const fetchMissionStats = useCallback(async (missionId: string) => {
        const qs = new URLSearchParams();
        if (sdrFilter) qs.set("sdrId", sdrFilter);
        if (actionChannelFilter) qs.set("channel", actionChannelFilter);
        if (dateFrom) qs.set("from", `${dateFrom}T00:00:00`);
        if (dateTo) qs.set("to", `${dateTo}T23:59:59.999`);
        const suffix = qs.toString() ? `?${qs}` : "";
        const statsJson = await fetch(`/api/missions/${missionId}/action-stats${suffix}`).then(r => r.json());
        if (statsJson.success) setStats(statsJson.data);
    }, [sdrFilter, actionChannelFilter, dateFrom, dateTo]);

    const fetchMissionData = useCallback(async (missionId: string, silent = false) => {
        if (!silent) setLoadingData(true);
        try {
            const actionsJson = await fetch(`/api/actions?missionId=${missionId}&limit=2000`).then(r => r.json());
            if (actionsJson.success) {
                const next: ActionRecord[] = (actionsJson.data || []).map((a: ActionRecord) => ({
                    ...a,
                    _searchKey: [
                        getContactName(a),
                        getCompanyName(a),
                        a.note,
                        a.callSummary,
                        a.callTranscription,
                    ]
                        .filter(Boolean)
                        .join(" ")
                        .toLowerCase(),
                }));
                setActions(prev => {
                    const added = next.filter(n => !prev.some(p => p.id === n.id)).length;
                    if (added > 0) setNewCount(c => c + added);
                    return next;
                });
                setLastRefresh(new Date());
            }
        } finally {
            if (!silent) setLoadingData(false);
        }
    }, []);

    const fetchAllForExport = useCallback(async (missionId: string): Promise<ActionRecord[]> => {
        const EXPORT_LIMIT = 5000;
        const all: ActionRecord[] = [];
        let pg = 1;
        let hasMore = true;
        while (hasMore) {
            const qs = new URLSearchParams({ missionId, limit: String(EXPORT_LIMIT), page: String(pg) });
            if (sdrFilter) qs.set("sdrId", sdrFilter);
            if (dateFrom)  qs.set("from", `${dateFrom}T00:00:00`);
            if (dateTo)    qs.set("to", `${dateTo}T23:59:59.999`);
            const json = await fetch(`/api/actions?${qs}`).then(r => r.json());
            if (!json.success) break;
            all.push(...(json.data || []));
            hasMore = json.pagination?.hasMore ?? false;
            pg++;
        }
        return all;
    }, [sdrFilter, dateFrom, dateTo]);

    const handleExportAll = useCallback(async () => {
        if (!selectedMission || exporting) return;
        setExporting(true);
        try {
            const raw = await fetchAllForExport(selectedMission.id);
            const filtered = raw.filter(a => {
                if (resultFilters.size && !resultFilters.has(a.result)) return false;
                if (search) {
                    const key = [getContactName(a), getCompanyName(a), a.note, a.callSummary, a.callTranscription]
                        .filter(Boolean).join(" ").toLowerCase();
                    if (!key.includes(search.toLowerCase())) return false;
                }
                return true;
            });
            exportCSV(filtered, selectedMission.name);
        } finally {
            setExporting(false);
        }
    }, [selectedMission, exporting, fetchAllForExport, resultFilters, search]);

    useEffect(() => {
        if (!selectedMission) return;
        fetchMissionData(selectedMission.id);
    }, [selectedMission, fetchMissionData]);

    useEffect(() => {
        if (!selectedMission) return;
        fetchMissionStats(selectedMission.id);
    }, [selectedMission, fetchMissionStats]);

    // Live auto-refresh every 30s
    useEffect(() => {
        if (!selectedMission || !liveRefresh) {
            if (liveTimerRef.current) clearInterval(liveTimerRef.current);
            return;
        }
        liveTimerRef.current = setInterval(() => {
            fetchMissionData(selectedMission.id, true);
            fetchMissionStats(selectedMission.id);
        }, 30_000);
        return () => { if (liveTimerRef.current) clearInterval(liveTimerRef.current); };
    }, [selectedMission, liveRefresh, fetchMissionData, fetchMissionStats]);

    // Derived missions
    const missionsForChannel = useMemo(() =>
        missions.filter(m => m.channels?.includes(channel) ?? m.channel === channel),
        [missions, channel]);

    const clientPickerOptions = useMemo(() => {
        const map = new Map<string, string>();
        missionsForChannel.forEach(m => {
            if (m.client?.id) map.set(m.client.id, m.client.name);
        });
        return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1], "fr"));
    }, [missionsForChannel]);

    const missionsForPicker = useMemo(() => {
        let list = missionsForChannel;
        if (pickerClientId) list = list.filter(m => m.client.id === pickerClientId);
        if (pickerSdrId) list = list.filter(m =>
            m.sdrAssignments?.some(a => a.sdrId === pickerSdrId));
        const q = pickerMissionSearch.trim().toLowerCase();
        if (q) {
            list = list.filter(
                m =>
                    m.name.toLowerCase().includes(q) ||
                    m.client.name.toLowerCase().includes(q)
            );
        }
        return list;
    }, [missionsForChannel, pickerClientId, pickerSdrId, pickerMissionSearch]);

    const pickerHasFilters = !!(pickerMissionSearch.trim() || pickerClientId || pickerSdrId);

    // Result counts
    const resultCounts = useMemo(() => {
        const map: Record<string, number> = {};
        actions.forEach(a => { map[a.result] = (map[a.result] || 0) + 1; });
        return map;
    }, [actions]);

    const uniqueResults = useMemo(() =>
        Array.from(new Set(actions.map(a => a.result))).sort(),
        [actions]);

    // Sort handler
    const handleSort = useCallback((key: SortKey) => {
        setSortKey(prev => {
            if (prev === key) setSortDir(d => d === "asc" ? "desc" : "asc");
            else setSortDir("desc");
            return key;
        });
        setPage(1);
    }, []);

    // Result filter toggle
    const toggleResult = useCallback((r: string) => {
        setResultFilters(prev => {
            const next = new Set(prev);
            if (next.has(r)) next.delete(r); else next.add(r);
            return next;
        });
        setPage(1);
    }, []);

    // Column toggle
    const toggleCol = useCallback((k: ColKey) => {
        setVisibleCols(prev => {
            const next = new Set(prev);
            if (next.has(k)) next.delete(k); else next.add(k);
            return next;
        });
    }, []);

    // Filtered + sorted
    const processed = useMemo(() => {
        const fromTs = dateFrom ? new Date(dateFrom).getTime() : null;
        const toTs = dateTo ? new Date(dateTo + "T23:59:59").getTime() : null;
        let rows = actions.filter(a => {
            if (sdrFilter && a.sdr?.id !== sdrFilter) return false;
            if (resultFilters.size && !resultFilters.has(a.result)) return false;
            if (search && !a._searchKey?.includes(search.toLowerCase())) return false;
            if (fromTs || toTs) {
                const ts = new Date((a.callbackDate as string | null) || a.createdAt).getTime();
                if (fromTs && ts < fromTs) return false;
                if (toTs && ts > toTs) return false;
            }
            return true;
        });

        rows.sort((a, b) => {
            let cmp = 0;
            if (sortKey === "createdAt") {
                const ak = (a.callbackDate as string | null) || a.createdAt;
                const bk = (b.callbackDate as string | null) || b.createdAt;
                cmp = new Date(ak).getTime() - new Date(bk).getTime();
            }
            else if (sortKey === "result") cmp = a.result.localeCompare(b.result);
            else if (sortKey === "sdr") cmp = (a.sdr?.name || "").localeCompare(b.sdr?.name || "");
            else if (sortKey === "duration") cmp = (a.duration || 0) - (b.duration || 0);
            else if (sortKey === "name") {
                const na = getContactName(a) || getCompanyName(a);
                const nb = getContactName(b) || getCompanyName(b);
                cmp = na.localeCompare(nb);
            }
            return sortDir === "asc" ? cmp : -cmp;
        });
        return rows;
    }, [actions, sdrFilter, resultFilters, search, dateFrom, dateTo, sortKey, sortDir]);

    const totalPages = Math.max(1, Math.ceil(processed.length / pageSize));
    const pageRows = processed.slice((page - 1) * pageSize, page * pageSize);

    // Bulk selection
    const allPageSelected = pageRows.length > 0 && pageRows.every(r => selectedIds.has(r.id));
    const togglePageSelect = () => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (allPageSelected) pageRows.forEach(r => next.delete(r.id));
            else pageRows.forEach(r => next.add(r.id));
            return next;
        });
    };
    const toggleRow = (id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    };

    // Stats
    const sc = {
        total: stats?.total ?? 0,
        rdv: stats?.resultBreakdown?.MEETING_BOOKED ?? 0,
        interested: stats?.resultBreakdown?.INTERESTED ?? 0,
        callbacks: stats?.resultBreakdown?.CALLBACK_REQUESTED ?? 0,
        rate: parseFloat(stats?.conversionRate ?? "0").toFixed(1),
    };

    const missionSupportsCall = useMemo(() => {
        if (!selectedMission) return false;
        const ch = selectedMission.channels?.length
            ? selectedMission.channels
            : [selectedMission.channel];
        return ch.includes("CALL");
    }, [selectedMission]);

    const hourlySparkData = useMemo(() => {
        const buckets = Array(8).fill(0);
        const now = Date.now();
        actions.forEach(a => {
            const ago = (now - new Date(a.createdAt).getTime()) / 3600000;
            const idx = Math.min(7, Math.floor(ago));
            if (idx >= 0) buckets[7 - idx]++;
        });
        return buckets;
    }, [actions]);

    const rowPy = density === "compact" ? "py-2" : density === "comfortable" ? "py-4" : "py-3";
    const hasFilters = !!(search || sdrFilter || resultFilters.size || dateFrom || dateTo);

    // ─────────────────────────────────────────────────────────────────────────
    // MISSION PICKER VIEW
    // ─────────────────────────────────────────────────────────────────────────

    if (!selectedMission) {
        const ChannelIcon = CHANNEL_TABS.find(t => t.value === channel)?.icon ?? Phone;
        const channelLabel = CHANNEL_TABS.find(t => t.value === channel)?.label ?? "";
        return (
            <Fragment>
            <div className="w-full min-w-0 space-y-6 max-w-[1600px] mx-auto pb-8">
                {/* Top Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/70">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-xl bg-[#0B0F19] text-primary flex items-center justify-center shadow-md shadow-black/20 border border-slate-800">
                                <Activity className="w-5 h-5" />
                            </div>
                            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                                Prospection &amp; Téléphonie
                            </h1>
                        </div>
                        <p className="text-xs text-slate-500 pl-1">
                            Sélectionnez une mission pour accéder à la télémétrie en direct, aux appels et aux récaps Leexi.
                        </p>
                    </div>

                    <div className="flex items-center gap-2.5 flex-wrap">
                        {/* Channel selector pill */}
                        <div role="tablist" aria-label="Canal" className="flex items-center p-1 bg-white rounded-xl border border-slate-200 shadow-2xs">
                            {CHANNEL_TABS.map(tab => {
                                const Icon = tab.icon;
                                const active = channel === tab.value;
                                return (
                                    <button
                                        key={tab.value}
                                        role="tab"
                                        aria-selected={active}
                                        onClick={() => setChannel(tab.value)}
                                        className={cn(
                                            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                                            active
                                                ? "bg-[#0B0F19] text-white shadow-2xs"
                                                : "text-slate-600 hover:text-slate-900"
                                        )}
                                    >
                                        <Icon className="w-3.5 h-3.5" aria-hidden />
                                        {tab.label}
                                    </button>
                                );
                            })}
                        </div>

                        {channel === "CALL" && (
                            <button
                                type="button"
                                onClick={() => setBulkCallSyncOpen(true)}
                                aria-label="Synchroniser les appels Allo pour toutes les missions"
                                className="flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-xl hover:border-primary hover:shadow-xs transition-all shadow-2xs shrink-0"
                            >
                                <Mic className="w-3.5 h-3.5 text-primary" aria-hidden />
                                Sync Allo
                            </button>
                        )}
                    </div>
                </div>

                {/* Filtres de sélection de mission */}
                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-3.5 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex-1 min-w-[220px] relative">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" aria-hidden />
                        <input
                            id="picker-mission-search"
                            type="text"
                            value={pickerMissionSearch}
                            onChange={e => setPickerMissionSearch(e.target.value)}
                            placeholder="Rechercher par nom de mission ou client…"
                            className="w-full h-10 pl-10 pr-9 text-xs font-medium text-slate-900 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary placeholder:text-slate-400 transition-all"
                        />
                        {pickerMissionSearch && (
                            <button
                                type="button"
                                onClick={() => setPickerMissionSearch("")}
                                className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-slate-200 transition-colors"
                            >
                                <X className="w-3.5 h-3.5 text-slate-400" />
                            </button>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        <select
                            id="picker-client"
                            value={pickerClientId}
                            onChange={e => setPickerClientId(e.target.value)}
                            className="h-10 px-3 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
                        >
                            <option value="">Tous les clients</option>
                            {clientPickerOptions.map(([id, name]) => (
                                <option key={id} value={id}>{name}</option>
                            ))}
                        </select>

                        <select
                            id="picker-sdr"
                            value={pickerSdrId}
                            onChange={e => setPickerSdrId(e.target.value)}
                            className="h-10 px-3 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
                        >
                            <option value="">Tous les SDR</option>
                            {sdrOptions.map(s => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                        </select>

                        {pickerHasFilters && (
                            <button
                                type="button"
                                onClick={() => {
                                    setPickerMissionSearch("");
                                    setPickerClientId("");
                                    setPickerSdrId("");
                                }}
                                className="h-10 px-3 flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white text-slate-600 text-xs font-bold hover:bg-slate-50 shadow-2xs transition-all"
                            >
                                <RotateCcw className="w-3.5 h-3.5" aria-hidden />
                                Réinitialiser
                            </button>
                        )}
                    </div>
                </div>

                {/* Mission grid */}
                {missionsLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <div key={i} className="h-44 bg-slate-200/60 rounded-3xl animate-pulse" />
                        ))}
                    </div>
                ) : missionsForChannel.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-3xl border border-slate-200 shadow-sm">
                        <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4 border border-slate-200">
                            <Target className="w-8 h-8 text-slate-400" />
                        </div>
                        <p className="text-base font-bold text-slate-900">Aucune mission {channelLabel}</p>
                        <p className="text-xs text-slate-400 mt-1">Créez une mission avec ce canal pour la voir ici.</p>
                    </div>
                ) : missionsForPicker.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-3xl border border-slate-200 shadow-sm">
                        <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4 border border-slate-200">
                            <Filter className="w-8 h-8 text-slate-400" />
                        </div>
                        <p className="text-base font-bold text-slate-900">Aucune mission ne correspond à vos filtres</p>
                        <p className="text-xs text-slate-400 mt-1 mb-4">Élargissez ou réinitialisez les critères de recherche.</p>
                        <button
                            type="button"
                            onClick={() => {
                                setPickerMissionSearch("");
                                setPickerClientId("");
                                setPickerSdrId("");
                            }}
                            className="px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-hover transition-colors"
                        >
                            Réinitialiser les filtres
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {missionsForPicker.map((mission) => {
                            const channelList = mission.channels?.length ? mission.channels : [mission.channel];
                            return (
                                <div
                                    key={mission.id}
                                    onClick={() => setSelectedMission(mission)}
                                    className="group relative p-6 rounded-3xl bg-white border border-slate-200/80 hover:border-blue-300 hover:shadow-xl hover:shadow-blue-500/5 transition-all duration-300 cursor-pointer flex flex-col justify-between overflow-hidden"
                                >
                                    <div>
                                        <div className="flex items-start justify-between gap-3 mb-4">
                                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 text-white flex items-center justify-center font-black text-lg shadow-md shadow-black/10 group-hover:scale-105 transition-transform flex-shrink-0">
                                                {mission.client?.name?.[0] || "M"}
                                            </div>

                                            <div className="flex items-center gap-1">
                                                {channelList.map((ch) => {
                                                    const Icon = CHANNEL_ICONS[ch] ?? Phone;
                                                    return (
                                                        <span
                                                            key={ch}
                                                            className="px-2 py-0.5 rounded-lg bg-blue-50 text-blue-700 text-[10px] font-bold uppercase flex items-center gap-1"
                                                        >
                                                            <Icon className="w-3 h-3" />
                                                            {ch}
                                                        </span>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        <div>
                                            <h3 className="text-base font-bold text-slate-900 group-hover:text-primary transition-colors truncate">
                                                {mission.name}
                                            </h3>
                                            <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5 truncate">
                                                <Building2 className="w-3.5 h-3.5" aria-hidden />
                                                {mission.client?.name ?? "Sans client"}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-slate-400">
                                        <span>Centre de contrôle</span>
                                        <span className="text-primary flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                                            Accéder <ChevronRight className="w-3.5 h-3.5" />
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {channel === "CALL" && (
                <ManagerCallEnrichmentSyncModal
                    isOpen={bulkCallSyncOpen}
                    onClose={() => setBulkCallSyncOpen(false)}
                    onSynced={reloadMissionsCatalog}
                    onToast={(kind, title, message) => {
                        if (kind === "success") showSuccess(title, message);
                        else showError(title, message);
                    }}
                />
            )}
            </Fragment>
        );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // CONTROL CENTER VIEW
    // ─────────────────────────────────────────────────────────────────────────

    return (
        <div className="w-full min-w-0 space-y-6 max-w-[1600px] mx-auto pb-8">

            {/* ── Top Header ── */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/70">
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={() => {
                            setSelectedMission(null);
                            setActions([]);
                            setStats(null);
                            setSearch("");
                            setSdrFilter("");
                            setActionChannelFilter("");
                            setResultFilters(new Set());
                            setDateFrom("");
                            setDateTo("");
                            setPage(1);
                            setSelectedIds(new Set());
                            setNewCount(0);
                        }}
                        aria-label="Retour aux missions"
                        className="w-10 h-10 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center transition-colors shadow-2xs"
                    >
                        <ArrowLeft className="w-4 h-4 text-slate-600" aria-hidden />
                    </button>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">{selectedMission.name}</h1>
                            {liveRefresh && <LivePulse label="Live" />}
                        </div>
                        <p className="text-xs font-semibold text-slate-400 flex items-center gap-1.5 mt-0.5">
                            <Building2 className="w-3.5 h-3.5" aria-hidden />
                            {selectedMission.client.name}
                            {lastRefresh && (
                                <span className="text-slate-400 font-normal ml-2">
                                    • Mis à jour à {lastRefresh.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                                </span>
                            )}
                        </p>
                    </div>

                    {newCount > 0 && (
                        <button
                            type="button"
                            onClick={() => { setNewCount(0); setPage(1); }}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary text-white text-xs font-bold shadow-md hover:bg-primary-hover transition-colors animate-bounce ml-2"
                        >
                            <Zap className="w-3 h-3" aria-hidden />
                            +{newCount} nouvelles
                        </button>
                    )}
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                    {/* Live toggle */}
                    <button
                        type="button"
                        onClick={() => setLiveRefresh(v => !v)}
                        aria-pressed={liveRefresh}
                        className={cn(
                            "h-9 px-3 flex items-center gap-1.5 rounded-xl border text-xs font-bold transition-all shadow-2xs",
                            liveRefresh
                                ? "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100"
                                : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
                        )}
                    >
                        <Radio className={cn("w-3.5 h-3.5", liveRefresh && "animate-pulse")} aria-hidden />
                        Live
                    </button>

                    {/* Manual refresh */}
                    <button
                        type="button"
                        onClick={() => {
                            fetchMissionData(selectedMission.id);
                            fetchMissionStats(selectedMission.id);
                            setNewCount(0);
                        }}
                        disabled={loadingData}
                        className="h-9 px-3 flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white text-slate-600 text-xs font-bold hover:bg-slate-50 transition-all disabled:opacity-60 shadow-2xs"
                    >
                        <RefreshCw className={cn("w-3.5 h-3.5", loadingData && "animate-spin")} aria-hidden />
                        Actualiser
                    </button>

                    {missionSupportsCall && (
                        <button
                            type="button"
                            onClick={() => setCallSyncModalOpen(true)}
                            className="h-9 px-3.5 flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 text-blue-700 text-xs font-bold hover:bg-blue-100 transition-all shadow-2xs"
                        >
                            <Mic className="w-3.5 h-3.5" aria-hidden />
                            Sync appels
                        </button>
                    )}

                    {/* Export */}
                    <button
                        type="button"
                        onClick={handleExportAll}
                        disabled={exporting}
                        className="h-9 px-3 flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white text-slate-600 text-xs font-bold hover:bg-slate-50 transition-all shadow-2xs disabled:opacity-50"
                    >
                        {exporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                        {exporting ? "Export…" : "Export CSV"}
                    </button>
                </div>
            </div>

            {/* ── 5 Executive KPI Telemetry Strip ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                {/* 1. Midnight Sapphire (Total Actions) */}
                <div className="relative overflow-hidden rounded-3xl p-5 bg-gradient-to-br from-[#0A1224] via-[#08101E] to-[#050B16] border border-slate-800/80 shadow-lg shadow-black/20 flex flex-col justify-between group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl pointer-events-none group-hover:bg-blue-500/15 transition-all" />
                    <div className="flex items-center justify-between z-10">
                        <div className="w-10 h-10 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-primary">
                            <BarChart3 className="w-5 h-5" />
                        </div>
                        <span className="px-2.5 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-primary text-[10px] font-bold">
                            Télémétrie
                        </span>
                    </div>
                    <div className="my-3 z-10">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Actions Totales</p>
                        <p className="text-3xl sm:text-4xl font-black text-white tracking-tight mt-0.5 tabular-nums">
                            {sc.total}
                        </p>
                    </div>
                    <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800/60 z-10">
                        <span>Flux d&apos;activité SDR</span>
                        <Sparkline data={hourlySparkData} color="var(--brand-primary)" />
                    </div>
                </div>

                {/* 2. Obsidian Gold (RDV Planifiés) */}
                <div className="relative overflow-hidden rounded-3xl p-5 bg-gradient-to-br from-[#0B0F19] via-[#090C14] to-[#04060A] border border-amber-900/40 shadow-lg shadow-black/20 flex flex-col justify-between group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none group-hover:bg-amber-500/15 transition-all" />
                    <div className="flex items-center justify-between z-10">
                        <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                            <CalendarPlus className="w-5 h-5" />
                        </div>
                        <span className="px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[10px] font-bold">
                            Succès RDV
                        </span>
                    </div>
                    <div className="my-3 z-10">
                        <p className="text-xs font-bold text-amber-200/70 uppercase tracking-wider">RDV Planifiés</p>
                        <p className="text-3xl sm:text-4xl font-black text-amber-100 tracking-tight mt-0.5 tabular-nums">
                            {sc.rdv}
                        </p>
                    </div>
                    <div className="flex items-center justify-between text-xs text-amber-200/60 pt-2 border-t border-amber-900/40 z-10">
                        <span>Objectif de conversion</span>
                        <span className="text-amber-400 font-bold">{sc.rate}%</span>
                    </div>
                </div>

                {/* 3. Mint Emerald (Intéressés) */}
                <div className="relative overflow-hidden rounded-3xl p-5 bg-gradient-to-br from-emerald-50/90 via-emerald-50/50 to-teal-50/70 border border-emerald-200/80 shadow-2xs flex flex-col justify-between group">
                    <div className="flex items-center justify-between z-10">
                        <div className="w-10 h-10 rounded-2xl bg-emerald-100/80 border border-emerald-200 flex items-center justify-center text-emerald-600 shadow-2xs">
                            <ThumbsUp className="w-5 h-5" />
                        </div>
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-100/80 border border-emerald-200 text-emerald-800 text-[10px] font-bold">
                            Intérêt
                        </span>
                    </div>
                    <div className="my-3 z-10">
                        <p className="text-xs font-bold text-emerald-900/60 uppercase tracking-wider">Intéressés</p>
                        <p className="text-3xl sm:text-4xl font-black text-emerald-950 tracking-tight mt-0.5 tabular-nums">
                            {sc.interested}
                        </p>
                    </div>
                    <div className="flex items-center justify-between text-xs text-emerald-800 pt-2 border-t border-emerald-200/60 z-10">
                        <span>Leads qualifiés chauds</span>
                        <ChevronRight className="w-4 h-4 text-emerald-600" />
                    </div>
                </div>

                {/* 4. Solar Amber (Rappels Demandés) */}
                <div className="relative overflow-hidden rounded-3xl p-5 bg-gradient-to-br from-amber-50/90 via-amber-50/50 to-orange-50/70 border border-amber-200/80 shadow-2xs flex flex-col justify-between group">
                    <div className="flex items-center justify-between z-10">
                        <div className="w-10 h-10 rounded-2xl bg-amber-100/80 border border-amber-200 flex items-center justify-center text-amber-600 shadow-2xs">
                            <Clock className="w-5 h-5" />
                        </div>
                        <span className="px-2.5 py-0.5 rounded-full bg-amber-100/80 border border-amber-200 text-amber-800 text-[10px] font-bold">
                            Rappels
                        </span>
                    </div>
                    <div className="my-3 z-10">
                        <p className="text-xs font-bold text-amber-900/60 uppercase tracking-wider">Rappels Demandés</p>
                        <p className="text-3xl sm:text-4xl font-black text-amber-950 tracking-tight mt-0.5 tabular-nums">
                            {sc.callbacks}
                        </p>
                    </div>
                    <div className="flex items-center justify-between text-xs text-amber-800 pt-2 border-t border-amber-200/60 z-10">
                        <span>À recontacter sous 48h</span>
                        <ChevronRight className="w-4 h-4 text-amber-600" />
                    </div>
                </div>

                {/* 5. Violet Sapphire (Taux de Conversion) */}
                <div className="relative overflow-hidden rounded-3xl p-5 bg-gradient-to-br from-violet-50/90 via-indigo-50/50 to-purple-50/70 border border-violet-200/80 shadow-2xs flex flex-col justify-between group">
                    <div className="flex items-center justify-between z-10">
                        <div className="w-10 h-10 rounded-2xl bg-violet-100/80 border border-violet-200 flex items-center justify-center text-violet-600 shadow-2xs">
                            <TrendingUp className="w-5 h-5" />
                        </div>
                        <span className="px-2.5 py-0.5 rounded-full bg-violet-100/80 border border-violet-200 text-violet-800 text-[10px] font-bold">
                            Performance
                        </span>
                    </div>
                    <div className="my-3 z-10">
                        <p className="text-xs font-bold text-violet-900/60 uppercase tracking-wider">Taux de Conversion</p>
                        <p className="text-3xl sm:text-4xl font-black text-violet-950 tracking-tight mt-0.5 tabular-nums">
                            {sc.rate}%
                        </p>
                    </div>
                    <div className="flex items-center justify-between text-xs text-violet-800 pt-2 border-t border-violet-200/60 z-10">
                        <span>Benchmark SDR</span>
                        <Sparkles className="w-4 h-4 text-violet-600" />
                    </div>
                </div>
            </div>

            {/* ── Filter & Search Bar ── */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-3.5 space-y-3">
                <div className="flex flex-wrap items-center gap-3">
                    {/* Search */}
                    <div className="flex-1 min-w-[220px] relative">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" aria-hidden />
                        <input
                            ref={searchRef}
                            type="text"
                            placeholder="Rechercher un contact, une société, une note… ( / )"
                            value={search}
                            onChange={e => { setSearch(e.target.value); setPage(1); }}
                            className="w-full h-10 pl-10 pr-8 text-xs font-medium text-slate-900 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-slate-400"
                        />
                        {search && (
                            <button
                                type="button"
                                onClick={() => setSearch("")}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition-colors"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>

                    {/* SDR filter */}
                    <select
                        value={sdrFilter}
                        onChange={e => { setSdrFilter(e.target.value); setPage(1); }}
                        className="h-10 px-3 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20 min-w-[150px] cursor-pointer"
                    >
                        <option value="">Tous les utilisateurs</option>
                        {sdrOptions.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>

                    <select
                        value={actionChannelFilter}
                        onChange={e => {
                            setActionChannelFilter((e.target.value || "") as "" | ChannelTabValue);
                            setPage(1);
                        }}
                        className="h-10 px-3 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20 min-w-[130px] cursor-pointer"
                    >
                        <option value="">Tous canaux</option>
                        <option value="CALL">Appels</option>
                        <option value="EMAIL">Email</option>
                        <option value="LINKEDIN">LinkedIn</option>
                    </select>

                    {/* Date range filter */}
                    <div className="flex items-center gap-1.5">
                        <input
                            type="date"
                            value={dateFrom}
                            onChange={e => { setDateFrom(e.target.value); setPage(1); }}
                            className="h-10 px-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:border-primary cursor-pointer"
                        />
                        <span className="text-xs text-slate-400 font-medium">→</span>
                        <input
                            type="date"
                            value={dateTo}
                            onChange={e => { setDateTo(e.target.value); setPage(1); }}
                            className="h-10 px-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:border-primary cursor-pointer"
                        />
                    </div>

                    <div className="ml-auto flex items-center gap-2">
                        {hasFilters && (
                            <button
                                type="button"
                                onClick={() => {
                                    setSearch("");
                                    setSdrFilter("");
                                    setActionChannelFilter("");
                                    setResultFilters(new Set());
                                    setDateFrom("");
                                    setDateTo("");
                                    setPage(1);
                                }}
                                className="h-10 px-3 flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 text-red-600 text-xs font-bold hover:bg-red-100 transition-all"
                            >
                                <RotateCcw className="w-3.5 h-3.5" />
                                Réinitialiser
                            </button>
                        )}
                        <ColToggle visible={visibleCols} onToggle={toggleCol} />
                        <DensityToggle value={density} onChange={setDensity} />

                        {/* Page Size Select */}
                        <div className="flex items-center gap-1.5 h-10 px-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                            <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">Lignes :</span>
                            <select
                                value={pageSize}
                                onChange={(e) => {
                                    setPageSize(Number(e.target.value));
                                    setPage(1);
                                }}
                                className="bg-transparent text-xs font-bold text-slate-700 outline-none cursor-pointer pr-1"
                            >
                                {[25, 50, 100, 200, 500].map(size => (
                                    <option key={size} value={size}>{size}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                {/* Result filter chips */}
                {uniqueResults.length > 0 && (
                    <div className="pt-2 border-t border-slate-100">
                        <ResultFilterBar
                            results={uniqueResults}
                            active={resultFilters}
                            onToggle={toggleResult}
                            counts={resultCounts}
                        />
                    </div>
                )}
            </div>

            {/* ── Bulk action bar ── */}
            {selectedIds.size > 0 && (
                <div className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-[#0B0F19] text-white shadow-xl shadow-black/20 border border-slate-800 animate-in slide-in-from-bottom-2 duration-200">
                    <span className="text-xs font-bold text-primary">{selectedIds.size} action{selectedIds.size > 1 ? "s" : ""} sélectionnée{selectedIds.size > 1 ? "s" : ""}</span>
                    <div className="flex-1" />
                    <button
                        type="button"
                        onClick={() => exportCSV(processed.filter(r => selectedIds.has(r.id)), selectedMission.name + "_selection")}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold transition-colors"
                    >
                        <Download className="w-3.5 h-3.5" aria-hidden />
                        Exporter
                    </button>
                    <button
                        type="button"
                        onClick={() => setSelectedIds(new Set())}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold transition-colors"
                    >
                        <X className="w-3.5 h-3.5" aria-hidden />
                        Désélectionner
                    </button>
                </div>
            )}

            {/* ── Table View ── */}
            <div className="rounded-3xl border border-slate-200/80 bg-white shadow-2xs overflow-hidden">
                {loadingData && actions.length === 0 ? (
                    <div className="grid gap-3 p-6">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <div key={i} className="h-12 bg-slate-100 rounded-xl animate-pulse" />
                        ))}
                    </div>
                ) : processed.length === 0 ? (
                    <div className="text-center py-20 bg-white">
                        <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3 border border-slate-200">
                            <Filter className="w-7 h-7 text-slate-400" />
                        </div>
                        <p className="text-sm font-bold text-slate-900">Aucun résultat trouvé</p>
                        <p className="text-xs text-slate-400 mt-1 mb-4">Modifiez vos filtres ou élargissez la recherche.</p>
                        <button
                            type="button"
                            onClick={() => {
                                setSearch("");
                                setSdrFilter("");
                                setActionChannelFilter("");
                                setResultFilters(new Set());
                                setDateFrom("");
                                setDateTo("");
                            }}
                            className="px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-hover transition-colors"
                        >
                            Réinitialiser les filtres
                        </button>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse" role="grid" aria-label="Historique des actions">
                            <thead>
                                <tr className="border-b border-slate-100 bg-slate-50/80">
                                    <th className="w-10 px-4 py-3">
                                        <input
                                            type="checkbox"
                                            checked={allPageSelected}
                                            onChange={togglePageSelect}
                                            className="w-4 h-4 rounded border-slate-300 accent-[var(--brand-primary)] cursor-pointer"
                                        />
                                    </th>
                                    {visibleCols.has("date") && (
                                        <Th label="Date" sortKey="createdAt" currentKey={sortKey} dir={sortDir} onSort={handleSort} />
                                    )}
                                    {visibleCols.has("name") && (
                                        <Th label="Contact / Société" sortKey="name" currentKey={sortKey} dir={sortDir} onSort={handleSort} className="min-w-[200px]" />
                                    )}
                                    {visibleCols.has("sdr") && (
                                        <Th label="Auteur" sortKey="sdr" currentKey={sortKey} dir={sortDir} onSort={handleSort} />
                                    )}
                                    {visibleCols.has("result") && (
                                        <Th label="Résultat" sortKey="result" currentKey={sortKey} dir={sortDir} onSort={handleSort} />
                                    )}
                                    {visibleCols.has("note") && (
                                        <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400 min-w-[220px]">
                                            Résumé / Note
                                        </th>
                                    )}
                                    {visibleCols.has("duration") && (
                                        <Th label="Durée" sortKey="duration" currentKey={sortKey} dir={sortDir} onSort={handleSort} />
                                    )}
                                    <th className="w-10 px-2 py-3" aria-hidden />
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {pageRows.map((row, idx) => {
                                    const isSelected = selectedIds.has(row.id);
                                    const displaySummary = getActionDisplaySummary(row);
                                    const contactName = getContactName(row);
                                    const companyName = getCompanyName(row);
                                    const name = contactName || companyName || "Non renseigné";
                                    const showCompany = companyName && companyName !== name;

                                    return (
                                        <tr
                                            key={row.id}
                                            onClick={() => toggleRow(row.id)}
                                            className={cn(
                                                "group cursor-pointer transition-colors duration-100",
                                                isSelected
                                                    ? "bg-blue-50/50 hover:bg-blue-50"
                                                    : "hover:bg-slate-50/70"
                                            )}
                                            aria-selected={isSelected}
                                            style={{ animationDelay: `${idx * 20}ms` }}
                                        >
                                            {/* Checkbox */}
                                            <td
                                                className={cn("px-4 text-center", rowPy)}
                                                onClick={e => e.stopPropagation()}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={() => toggleRow(row.id)}
                                                    className="w-4 h-4 rounded border-slate-300 accent-[var(--brand-primary)] cursor-pointer"
                                                />
                                            </td>

                                            {/* Date */}
                                            {visibleCols.has("date") && (
                                                <td className={cn("px-4 whitespace-nowrap", rowPy)}>
                                                    {(() => {
                                                        const d = new Date(row.createdAt);
                                                        const cb = row.callbackDate ? new Date(row.callbackDate as string) : null;
                                                        return (
                                                            <>
                                                                <p className="text-xs font-semibold text-slate-800 tabular-nums">
                                                                    {d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}
                                                                </p>
                                                                <p className="text-[10px] text-slate-400 font-medium tabular-nums">
                                                                    {d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                                                                </p>
                                                                {cb && !Number.isNaN(cb.getTime()) && (
                                                                    <p className="text-[10px] text-amber-700 font-semibold mt-0.5 tabular-nums">
                                                                        Rappel : {cb.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}
                                                                    </p>
                                                                )}
                                                            </>
                                                        );
                                                    })()}
                                                </td>
                                            )}

                                            {/* Name */}
                                            {visibleCols.has("name") && (
                                                <td className={cn("px-4", rowPy)}>
                                                    <div className="flex items-center gap-2.5">
                                                        <div className="w-8 h-8 rounded-xl bg-slate-100 border border-slate-200/80 flex items-center justify-center font-bold text-xs text-slate-700 shrink-0">
                                                            {row.contactId ? (
                                                                (row.contact?.firstName?.[0] || row.contact?.lastName?.[0] || "?").toUpperCase()
                                                            ) : (
                                                                (row.company?.name?.[0] || "?").toUpperCase()
                                                            )}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="text-xs font-bold text-slate-900 truncate max-w-[180px]">{name}</p>
                                                            {showCompany && (
                                                                <p className="text-[11px] text-slate-400 font-medium truncate max-w-[180px]">{companyName}</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>
                                            )}

                                            {/* SDR */}
                                            {visibleCols.has("sdr") && (
                                                <td className={cn("px-4", rowPy)}>
                                                    <div className="flex items-center gap-1.5">
                                                        <div className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center text-[9px] font-black text-slate-600 shrink-0">
                                                            {(row.sdr?.name?.[0] || "?").toUpperCase()}
                                                        </div>
                                                        <span className="text-xs font-semibold text-slate-700 whitespace-nowrap">{row.sdr?.name || "Non assigné"}</span>
                                                    </div>
                                                </td>
                                            )}

                                            {/* Result */}
                                            {visibleCols.has("result") && (
                                                <td className={cn("px-4", rowPy)}>
                                                    <LastActionBadge row={row} />
                                                </td>
                                            )}

                                            {/* Note / Résumé */}
                                            {visibleCols.has("note") && (
                                                <td className={cn("px-4 max-w-[320px]", rowPy)}>
                                                    <div className="min-w-0 flex-1">
                                                        {displaySummary ? (
                                                            <p className="text-xs text-slate-600 line-clamp-2" title={displaySummary}>
                                                                {displaySummary}
                                                            </p>
                                                        ) : (
                                                            <span className="text-[11px] text-slate-400 italic">Non renseigné</span>
                                                        )}
                                                    </div>
                                                </td>
                                            )}

                                            {/* Duration */}
                                            {visibleCols.has("duration") && (
                                                <td className={cn("px-4 whitespace-nowrap", rowPy)}>
                                                    {row.duration ? (
                                                        <span className="text-xs font-semibold text-slate-600 tabular-nums">
                                                            {Math.floor(row.duration / 60)}:{String(row.duration % 60).padStart(2, "0")}
                                                        </span>
                                                    ) : (
                                                        <span className="text-slate-400 text-xs">-</span>
                                                    )}
                                                </td>
                                            )}

                                            {/* Open drawer chevron */}
                                            <td className={cn("pr-3 text-right", rowPy)} onClick={e => e.stopPropagation()}>
                                                <button
                                                    type="button"
                                                    onClick={() => setDrawerAction(row)}
                                                    className="p-1 rounded-lg hover:bg-slate-200/60 transition-colors text-slate-400 hover:text-primary"
                                                >
                                                    <ChevronRight className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* ── Pagination ── */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between px-5 py-4 border-t border-slate-100 bg-slate-50/50">
                        <p className="text-xs font-semibold text-slate-400">
                            Page {page} / {totalPages} - {processed.length} résultat{processed.length !== 1 ? "s" : ""}
                        </p>
                        <div className="flex items-center gap-1">
                            <button
                                type="button"
                                onClick={() => setPage(1)}
                                disabled={page === 1}
                                className="h-8 w-8 flex items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-xs font-bold"
                            >
                                «
                            </button>
                            <button
                                type="button"
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="h-8 w-8 flex items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            >
                                <ChevronUp className="w-3.5 h-3.5 -rotate-90" />
                            </button>

                            {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
                                let p: number;
                                if (totalPages <= 7) p = i + 1;
                                else if (page <= 4) p = i + 1;
                                else if (page >= totalPages - 3) p = totalPages - 6 + i;
                                else p = page - 3 + i;
                                return (
                                    <button
                                        key={p}
                                        type="button"
                                        onClick={() => setPage(p)}
                                        className={cn(
                                            "h-8 w-8 flex items-center justify-center rounded-lg text-xs font-bold transition-colors",
                                            page === p
                                                ? "bg-[#0B0F19] text-white shadow-2xs"
                                                : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                                        )}
                                    >
                                        {p}
                                    </button>
                                );
                            })}

                            <button
                                type="button"
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages}
                                className="h-8 w-8 flex items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            >
                                <ChevronDown className="w-3.5 h-3.5 -rotate-90" />
                            </button>
                            <button
                                type="button"
                                onClick={() => setPage(totalPages)}
                                disabled={page === totalPages}
                                className="h-8 w-8 flex items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-xs font-bold"
                            >
                                »
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* ── Unified Action Drawer ── */}
            {missionSupportsCall && (
                <ManagerCallEnrichmentSyncModal
                    isOpen={callSyncModalOpen}
                    onClose={() => setCallSyncModalOpen(false)}
                    missionId={selectedMission.id}
                    missionName={selectedMission.name}
                    onSynced={() => {
                        fetchMissionData(selectedMission.id, true);
                        fetchMissionStats(selectedMission.id);
                    }}
                    onToast={(kind, title, message) => {
                        if (kind === "success") showSuccess(title, message);
                        else showError(title, message);
                    }}
                />
            )}

            {drawerAction && (
                <UnifiedActionDrawer
                    isOpen={!!drawerAction}
                    onClose={() => setDrawerAction(null)}
                    contactId={drawerAction.contactId || null}
                    companyId={drawerAction.companyId || drawerAction.contact?.company?.id || ""}
                    missionId={selectedMission.id}
                    missionName={selectedMission.name}
                    clientBookingUrl={drawerClientBookingUrl || undefined}
                    clientInterlocuteurs={drawerClientInterlocuteurs}
                    onActionRecorded={() => {
                        fetchMissionData(selectedMission.id, true);
                        fetchMissionStats(selectedMission.id);
                    }}
                    onContactSelect={(newContactId) => {
                        setDrawerAction({
                            ...drawerAction,
                            contactId: newContactId,
                        });
                    }}
                />
            )}
        </div>
    );
}
