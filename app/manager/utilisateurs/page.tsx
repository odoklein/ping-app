"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
    Users, Plus, Search, LayoutGrid, List, Loader2,
    UserCheck, UserX, ChevronRight, Phone, Calendar,
    Shield, Globe, LogIn, MoreHorizontal, X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui";
import { Modal, ModalFooter, ConfirmModal } from "@/components/ui/Modal";

// ============================================
// TYPES
// ============================================

interface User {
    id: string;
    name: string;
    email: string;
    role: string;
    isActive: boolean;
    voipProvider?: string | null;
    alloPhoneNumber?: string | null;
    onoffNumber?: string | null;
    onoffUserId?: string | null;
    ringoverNumber?: string | null;
    createdAt: string;
    lastSignInAt?: string | null;
    lastSignInIp?: string | null;
    lastSignInCountry?: string | null;
    lastConnectedAt?: string | null;
    preferences?: { sdrFeedback?: { promptTime?: string; requiredDaily?: boolean } } | null;
    client?: { id: string; name: string } | null;
    _count: { assignedMissions: number; actions: number };
}

// ============================================
// CONSTANTS
// ============================================

const ROLE_LABELS: Record<string, string> = {
    MANAGER: "Manager", SDR: "SDR", BUSINESS_DEVELOPER: "BD",
    DEVELOPER: "Dev", CLIENT: "Client", BOOKER: "Booker", COMMERCIAL: "Commercial",
};

const ROLE_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
    MANAGER:           { bg: "bg-indigo-50",  text: "text-indigo-700",  dot: "bg-indigo-500" },
    SDR:               { bg: "bg-blue-50",    text: "text-blue-700",    dot: "bg-blue-500" },
    BUSINESS_DEVELOPER:{ bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
    DEVELOPER:         { bg: "bg-purple-50",  text: "text-purple-700",  dot: "bg-purple-500" },
    CLIENT:            { bg: "bg-sky-50",     text: "text-sky-700",     dot: "bg-sky-500" },
    BOOKER:            { bg: "bg-blue-50",    text: "text-blue-600",    dot: "bg-blue-400" },
    COMMERCIAL:        { bg: "bg-teal-50",    text: "text-teal-700",    dot: "bg-teal-500" },
};

const ROLE_AVATAR_GRADIENTS: Record<string, string> = {
    MANAGER:           "from-indigo-500 to-indigo-700",
    SDR:               "from-blue-500 to-blue-700",
    BUSINESS_DEVELOPER:"from-emerald-500 to-emerald-700",
    DEVELOPER:         "from-purple-500 to-purple-700",
    CLIENT:            "from-sky-500 to-sky-700",
    BOOKER:            "from-blue-400 to-blue-600",
    COMMERCIAL:        "from-teal-500 to-teal-700",
};

// ============================================
// HELPERS
// ============================================

function getInitials(name: string) {
    return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

function timeAgo(dateStr?: string | null) {
    if (!dateStr) return "Jamais";
    const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
    if (diff < 60) return "À l'instant";
    if (diff < 3600) return `Il y a ${Math.floor(diff / 60)} min`;
    if (diff < 86400) return `Il y a ${Math.floor(diff / 3600)} h`;
    if (diff < 86400 * 30) return `Il y a ${Math.floor(diff / 86400)} j`;
    return new Date(dateStr).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

function isOnline(user: User): boolean {
    if (!user.lastConnectedAt) return false;
    return Date.now() - new Date(user.lastConnectedAt).getTime() < 3 * 60 * 1000;
}

// ============================================
// ROLE DISTRIBUTION BAR
// ============================================

function RoleDistributionBar({ users }: { users: User[] }) {
    const counts = useMemo(() => {
        const c: Record<string, number> = {};
        for (const u of users) c[u.role] = (c[u.role] ?? 0) + 1;
        return c;
    }, [users]);

    const total = users.length;
    if (total === 0) return null;

    const segments = Object.entries(counts).map(([role, count]) => ({
        role,
        count,
        pct: (count / total) * 100,
        color: ROLE_COLORS[role]?.dot ?? "bg-slate-400",
        label: ROLE_LABELS[role] ?? role,
    }));

    return (
        <div className="space-y-2">
            <div className="flex h-2 rounded-full overflow-hidden gap-0.5 bg-slate-100">
                {segments.map((s) => (
                    <div
                        key={s.role}
                        className={cn("h-full transition-all", s.color)}
                        style={{ width: `${s.pct}%` }}
                        title={`${s.label}: ${s.count} (${s.pct.toFixed(0)}%)`}
                    />
                ))}
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                {segments.map((s) => (
                    <span key={s.role} className="inline-flex items-center gap-1.5">
                        <span className={cn("w-2 h-2 rounded-full", s.color)} />
                        <span className="font-medium text-slate-700">{s.label}</span>
                        <span className="text-slate-400">({s.count})</span>
                    </span>
                ))}
            </div>
        </div>
    );
}

// ============================================
// USER CARD (grid view)
// ============================================

function UserCard({ user, onClick }: { user: User; onClick: () => void }) {
    const role = ROLE_COLORS[user.role] ?? { bg: "bg-slate-50", text: "text-slate-700", dot: "bg-slate-400" };
    const grad = ROLE_AVATAR_GRADIENTS[user.role] ?? "from-slate-400 to-slate-600";
    const online = isOnline(user);

    return (
        <button
            onClick={onClick}
            className="group w-full bg-white rounded-2xl border border-slate-200 p-4 hover:border-indigo-300 hover:shadow-md transition-all text-left flex flex-col justify-between"
        >
            <div>
                {/* Header: avatar + status badge */}
                <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="relative">
                        <div className={cn("w-11 h-11 rounded-xl bg-gradient-to-br flex items-center justify-center text-white font-bold text-sm shadow-sm", grad)}>
                            {getInitials(user.name)}
                        </div>
                        {/* Online heartbeat dot */}
                        <span
                            className={cn(
                                "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white",
                                online ? "bg-emerald-500" : user.isActive ? "bg-slate-300" : "bg-rose-400"
                            )}
                            title={online ? "En ligne" : user.isActive ? "Hors ligne" : "Inactif"}
                        />
                    </div>
                    <span className={cn("inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full", role.bg, role.text)}>
                        <span className={cn("w-1.5 h-1.5 rounded-full", role.dot)} />
                        {ROLE_LABELS[user.role] ?? user.role}
                    </span>
                </div>

                {/* Name & email */}
                <p className="font-bold text-slate-900 group-hover:text-indigo-700 transition-colors truncate">
                    {user.name}
                </p>
                <p className="text-xs text-slate-400 truncate mb-3">{user.email}</p>

                {/* Client pill if client */}
                {user.client && (
                    <div className="inline-flex items-center gap-1 text-[11px] font-medium bg-sky-50 text-sky-700 px-2 py-0.5 rounded-md mb-2 truncate max-w-full">
                        <span>Client :</span>
                        <span className="font-semibold truncate">{user.client.name}</span>
                    </div>
                )}

                {/* VoIP display */}
                {user.voipProvider && (
                    <div className="text-[11px] text-slate-500 mb-2 flex items-center gap-1.5">
                        <Phone className="w-3 h-3 text-slate-400" />
                        <span className="font-semibold text-slate-700">
                            {user.voipProvider === "ONOFF" ? "Onoff" : user.voipProvider === "RINGOVER" ? "Ringover" : "Allo"} :
                        </span>
                        <span>{user.onoffNumber || user.alloPhoneNumber || user.ringoverNumber || "Configuré"}</span>
                    </div>
                )}

                {/* Stats */}
                <div className="grid grid-cols-2 gap-2 py-2 border-t border-slate-100 text-xs text-slate-500">
                    <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-semibold">Missions</span>
                        <span className="font-bold text-slate-800">{user._count.assignedMissions}</span>
                    </div>
                    <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-semibold">Actions</span>
                        <span className="font-bold text-slate-800">{user._count.actions}</span>
                    </div>
                </div>
            </div>

            {/* Footer: last login */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                <span className="flex items-center gap-1">
                    <LogIn className="w-3 h-3" />
                    {timeAgo(user.lastSignInAt)}
                </span>
                {user.lastSignInCountry && (
                    <span className="flex items-center gap-1">
                        <Globe className="w-3 h-3" />
                        {user.lastSignInCountry}
                    </span>
                )}
            </div>
        </button>
    );
}

// ============================================
// USER ROW (list view)
// ============================================

function UserRow({ user, onClick }: { user: User; onClick: () => void }) {
    const role = ROLE_COLORS[user.role] ?? { bg: "bg-slate-50", text: "text-slate-700", dot: "bg-slate-400" };
    const grad = ROLE_AVATAR_GRADIENTS[user.role] ?? "from-slate-400 to-slate-600";
    const online = isOnline(user);

    return (
        <button
            onClick={onClick}
            className="w-full flex items-center gap-4 px-4 py-3 hover:bg-indigo-50/40 transition-colors group text-left border-b border-slate-100 last:border-0"
        >
            {/* Avatar */}
            <div className="relative shrink-0">
                <div className={cn("w-9 h-9 rounded-lg bg-gradient-to-br flex items-center justify-center text-white font-semibold text-xs shadow-sm", grad)}>
                    {getInitials(user.name)}
                </div>
                <span className={cn(
                    "absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-[1.5px] border-white",
                    online ? "bg-emerald-500" : user.isActive ? "bg-slate-300" : "bg-rose-400"
                )} />
            </div>

            {/* Name + email */}
            <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-900 truncate group-hover:text-indigo-700 transition-colors">
                    {user.name}
                </p>
                <p className="text-xs text-slate-400 truncate">{user.email}</p>
            </div>

            {/* Role */}
            <span className={cn("hidden sm:inline-flex text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0", role.bg, role.text)}>
                {ROLE_LABELS[user.role] ?? user.role}
            </span>

            {/* Status */}
            <span className={cn(
                "hidden md:inline-flex items-center gap-1.5 text-xs font-medium shrink-0",
                user.isActive ? "text-emerald-600" : "text-rose-500"
            )}>
                {user.isActive ? <UserCheck className="w-3.5 h-3.5" /> : <UserX className="w-3.5 h-3.5" />}
                {user.isActive ? "Actif" : "Inactif"}
            </span>

            {/* Last login */}
            <span className="hidden lg:block text-xs text-slate-400 shrink-0 w-28 text-right">
                {timeAgo(user.lastSignInAt)}
            </span>

            {/* Missions */}
            <span className="hidden lg:block text-xs text-slate-500 shrink-0 w-16 text-center">
                {user._count.assignedMissions} miss.
            </span>

            <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-400 transition-colors shrink-0" />
        </button>
    );
}

// ============================================
// INLINE USER FORM
// ============================================

function UserFormFields({
    data,
    errors,
    clients,
    onChange,
}: {
    data: {
        name: string; email: string; password: string; role: string;
        clientId: string;
        voipProvider: string; alloPhoneNumber: string; onoffNumber: string; onoffUserId: string; ringoverNumber: string;
        sdrFeedbackPromptTime: string; sdrFeedbackRequiredDaily: boolean;
    };
    errors: Record<string, string>;
    clients: { id: string; name: string }[];
    onChange: (patch: Partial<typeof data>) => void;
}) {
    const fieldClass = "w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 text-slate-900 placeholder:text-slate-400";
    const labelClass = "block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5";

    return (
        <div className="space-y-4">
            {errors.general && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">{errors.general}</div>
            )}
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className={labelClass}>Nom</label>
                    <input className={cn(fieldClass, errors.name && "border-red-300")} value={data.name} onChange={(e) => onChange({ name: e.target.value })} placeholder="Jean Dupont" />
                    {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
                </div>
                <div>
                    <label className={labelClass}>Rôle</label>
                    <select className={fieldClass} value={data.role} onChange={(e) => onChange({ role: e.target.value, clientId: e.target.value === "CLIENT" ? data.clientId : "" })}>
                        <option value="SDR">SDR</option>
                        <option value="BOOKER">Booker</option>
                        <option value="BUSINESS_DEVELOPER">Business Dev</option>
                        <option value="MANAGER">Manager</option>
                        <option value="DEVELOPER">Développeur</option>
                        <option value="CLIENT">Client</option>
                        <option value="COMMERCIAL">Commercial</option>
                    </select>
                </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className={labelClass}>Email</label>
                    <input className={cn(fieldClass, errors.email && "border-red-300")} type="email" value={data.email} onChange={(e) => onChange({ email: e.target.value })} placeholder="jean@example.com" />
                    {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
                </div>
                <div>
                    <label className={labelClass}>Mot de passe <span className="text-slate-400 normal-case font-normal">(optionnel)</span></label>
                    <input className={fieldClass} type="password" value={data.password} onChange={(e) => onChange({ password: e.target.value })} placeholder="Généré auto" />
                </div>
            </div>

            {/* VoIP / Telephony System Selector */}
            {(data.role === "SDR" || data.role === "BOOKER" || data.role === "BUSINESS_DEVELOPER") && (
                <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 space-y-3">
                    <p className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Système Téléphonie / VoIP</p>
                    <div>
                        <label className={labelClass}>Fournisseur VoIP</label>
                        <select className={fieldClass} value={data.voipProvider} onChange={(e) => onChange({ voipProvider: e.target.value })}>
                            <option value="ALLO">WithAllo (Allo)</option>
                            <option value="ONOFF">Onoff Business</option>
                            <option value="RINGOVER">Ringover</option>
                            <option value="NONE">Aucun / Manuel</option>
                        </select>
                    </div>

                    {data.voipProvider === "ALLO" && (
                        <div>
                            <label className={labelClass}>Numéro Allo <span className="text-slate-400 normal-case font-normal">(optionnel)</span></label>
                            <input className={fieldClass} value={data.alloPhoneNumber} onChange={(e) => onChange({ alloPhoneNumber: e.target.value })} placeholder="+33612345678" />
                        </div>
                    )}

                    {data.voipProvider === "ONOFF" && (
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className={labelClass}>Numéro Onoff</label>
                                <input className={fieldClass} value={data.onoffNumber} onChange={(e) => onChange({ onoffNumber: e.target.value })} placeholder="+33612345678" />
                            </div>
                            <div>
                                <label className={labelClass}>ID Membre Onoff</label>
                                <input className={fieldClass} value={data.onoffUserId} onChange={(e) => onChange({ onoffUserId: e.target.value })} placeholder="user_12345" />
                            </div>
                        </div>
                    )}

                    {data.voipProvider === "RINGOVER" && (
                        <div>
                            <label className={labelClass}>Numéro Ringover</label>
                            <input className={fieldClass} value={data.ringoverNumber} onChange={(e) => onChange({ ringoverNumber: e.target.value })} placeholder="+33123456789" />
                        </div>
                    )}
                </div>
            )}

            {data.role === "CLIENT" && (
                <div>
                    <label className={labelClass}>Client <span className="text-red-500">*</span></label>
                    <select className={cn(fieldClass, errors.clientId && "border-red-300")} value={data.clientId} onChange={(e) => onChange({ clientId: e.target.value })}>
                        <option value="">Sélectionner un client</option>
                        {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    {errors.clientId && <p className="text-red-500 text-xs mt-1">{errors.clientId}</p>}
                </div>
            )}
            {(data.role === "SDR" || data.role === "BOOKER") && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-3">
                    <p className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Feedback SDR</p>
                    <div className="grid grid-cols-2 gap-3 items-end">
                        <div>
                            <label className={labelClass}>Heure d'affichage</label>
                            <input type="time" className={fieldClass} value={data.sdrFeedbackPromptTime} onChange={(e) => onChange({ sdrFeedbackPromptTime: e.target.value })} />
                        </div>
                        <label className="flex items-center gap-2 text-sm text-slate-700 pb-2.5 cursor-pointer">
                            <input type="checkbox" checked={data.sdrFeedbackRequiredDaily} onChange={(e) => onChange({ sdrFeedbackRequiredDaily: e.target.checked })} className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                            Obligatoire chaque jour
                        </label>
                    </div>
                </div>
            )}
        </div>
    );
}

// ============================================
// MAIN PAGE
// ============================================

const EMPTY_FORM = {
    name: "", email: "", password: "", role: "SDR",
    clientId: "",
    voipProvider: "ALLO", alloPhoneNumber: "", onoffNumber: "", onoffUserId: "", ringoverNumber: "",
    sdrFeedbackPromptTime: "15:45", sdrFeedbackRequiredDaily: true,
};

export default function UtilisateursPage() {
    const router = useRouter();
    const { success, error: showError } = useToast();

    const [users, setUsers]         = useState<User[]>([]);
    const [loading, setLoading]     = useState(true);
    const [view, setView]           = useState<"cards" | "list">("cards");
    const [search, setSearch]       = useState("");
    const [roleFilter, setRoleFilter] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");

    const [showCreate, setShowCreate] = useState(false);
    const [formData, setFormData]   = useState(EMPTY_FORM);
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});
    const [formLoading, setFormLoading] = useState(false);
    const [clients, setClients]     = useState<{ id: string; name: string }[]>([]);

    const fetchUsers = useCallback(async () => {
        setLoading(true);
        try {
            const p = new URLSearchParams();
            if (search) p.set("search", search);
            if (roleFilter) p.set("role", roleFilter);
            if (statusFilter !== "all") p.set("status", statusFilter);
            p.set("excludeSelf", "false");
            const res = await fetch(`/api/users?${p}`);
            const json = await res.json();
            if (json.success) setUsers(json.data.users ?? json.data ?? []);
        } finally {
            setLoading(false);
        }
    }, [search, roleFilter, statusFilter]);

    useEffect(() => { fetchUsers(); }, [fetchUsers]);

    useEffect(() => {
        fetch("/api/clients").then(r => r.json()).then(j => {
            const list = j.data?.clients ?? j.data ?? [];
            setClients(Array.isArray(list) ? list : []);
        }).catch(() => {});
    }, []);

    const handleCreate = async () => {
        setFormErrors({});
        if (!formData.name.trim()) { setFormErrors({ name: "Nom requis" }); return; }
        if (!formData.email.trim()) { setFormErrors({ email: "Email requis" }); return; }
        if (formData.role === "CLIENT" && !formData.clientId) { setFormErrors({ clientId: "Sélectionnez un client" }); return; }

        setFormLoading(true);
        try {
            const payload: Record<string, unknown> = {
                name: formData.name, email: formData.email,
                password: formData.password || undefined,
                role: formData.role,
                voipProvider: formData.voipProvider,
                alloPhoneNumber: formData.alloPhoneNumber.trim() || undefined,
                onoffNumber: formData.onoffNumber.trim() || undefined,
                onoffUserId: formData.onoffUserId.trim() || undefined,
                ringoverNumber: formData.ringoverNumber.trim() || undefined,
            };
            if (formData.role === "CLIENT" && formData.clientId) payload.clientId = formData.clientId;

            const res = await fetch("/api/users", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
            const json = await res.json();
            if (!json.success) { setFormErrors({ general: json.error }); return; }

            setShowCreate(false);
            setFormData(EMPTY_FORM);
            await fetchUsers();
            success("Utilisateur créé", `${formData.name} a rejoint l'équipe.`);
        } catch {
            setFormErrors({ general: "Erreur lors de la création" });
        } finally {
            setFormLoading(false);
        }
    };

    // Derived stats
    const stats = useMemo(() => {
        const total     = users.length;
        const active    = users.filter(u => u.isActive).length;
        const sdrCount  = users.filter(u => u.role === "SDR" || u.role === "BOOKER").length;
        const inactive  = total - active;
        const online    = users.filter(isOnline).length;
        return { total, active, sdrCount, inactive, online };
    }, [users]);

    const ROLES = ["MANAGER", "SDR", "BOOKER", "BUSINESS_DEVELOPER", "DEVELOPER", "CLIENT", "COMMERCIAL"];

    return (
        <div className="elan-page">

            {/* ── Header ── */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Utilisateurs</h1>
                    <p className="text-sm text-slate-500 mt-0.5">Gérez votre équipe et leurs accès</p>
                </div>
                <button
                    onClick={() => setShowCreate(true)}
                    className="inline-flex items-center justify-center gap-2 rounded-[10px] border border-[#143C37] bg-[#1F4D47] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#143C37]"
                >
                    <Plus className="w-4 h-4" />
                    Nouvel utilisateur
                </button>
            </div>

            {/* ── Role distribution bar ── */}
            {!loading && users.length > 0 && (
                <div className="bg-white rounded-2xl border border-slate-200 px-5 py-3">
                    <RoleDistributionBar users={users} />
                </div>
            )}

            {/* ── Stats row ── */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {[
                    { label: "Total", value: stats.total, color: "text-slate-900", bg: "bg-white border-slate-200" },
                    { label: "Actifs", value: stats.active, color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200" },
                    { label: "SDR / Booker", value: stats.sdrCount, color: "text-blue-700", bg: "bg-blue-50 border-blue-200" },
                    { label: "Inactifs", value: stats.inactive, color: "text-rose-600", bg: "bg-rose-50 border-rose-200" },
                    { label: "En ligne", value: stats.online, color: "text-[#1F4D47]", bg: "bg-[#EEF3F1] border-[#CBD8D4]" },
                ].map((s) => (
                    <div key={s.label} className={cn("rounded-2xl border px-4 py-3", s.bg)}>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{s.label}</p>
                        <p className={cn("text-2xl font-extrabold mt-1", s.color)}>{s.value}</p>
                    </div>
                ))}
            </div>

            {/* ── Filter bar ── */}
            <div className="bg-white rounded-2xl border border-slate-200 p-3 flex flex-wrap items-center gap-2">
                {/* Search */}
                <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Rechercher…"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full rounded-[10px] border border-slate-200 py-2 pl-9 pr-3 text-sm outline-none focus:border-[#E07C00] focus:ring-2 focus:ring-[#FF9E1B]/20"
                    />
                    {search && (
                        <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2">
                            <X className="w-3.5 h-3.5 text-slate-400" />
                        </button>
                    )}
                </div>

                {/* Role pills */}
                <div className="flex items-center gap-1 flex-wrap">
                    <button
                        onClick={() => setRoleFilter("")}
                        className={cn("px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors", !roleFilter ? "bg-[#1F4D47] text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200")}
                    >Tous</button>
                    {ROLES.map((r) => (
                        <button
                            key={r}
                            onClick={() => setRoleFilter(roleFilter === r ? "" : r)}
                            className={cn("px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors",
                                roleFilter === r
                                    ? cn(ROLE_COLORS[r]?.bg, ROLE_COLORS[r]?.text, "ring-1 ring-current/20")
                                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                            )}
                        >{ROLE_LABELS[r] ?? r}</button>
                    ))}
                </div>

                {/* Status toggle */}
                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                    <option value="all">Tous les statuts</option>
                    <option value="active">Actifs</option>
                    <option value="inactive">Inactifs</option>
                </select>

                {/* View toggle */}
                <div className="flex items-center bg-slate-100 rounded-lg p-0.5 gap-0.5 ml-auto">
                    <button onClick={() => setView("cards")} className={cn("p-1.5 rounded-md transition-colors", view === "cards" ? "bg-white shadow-sm text-slate-900" : "text-slate-400 hover:text-slate-600")}>
                        <LayoutGrid className="w-4 h-4" />
                    </button>
                    <button onClick={() => setView("list")} className={cn("p-1.5 rounded-md transition-colors", view === "list" ? "bg-white shadow-sm text-slate-900" : "text-slate-400 hover:text-slate-600")}>
                        <List className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* ── Content ── */}
            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-7 h-7 text-indigo-500 animate-spin" />
                </div>
            ) : users.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
                        <Users className="w-8 h-8 text-slate-400" />
                    </div>
                    <p className="font-semibold text-slate-700">Aucun utilisateur trouvé</p>
                    <p className="text-sm text-slate-400 mt-1">Modifiez vos filtres ou créez un nouveau compte.</p>
                </div>
            ) : view === "cards" ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {users.map((u) => (
                        <UserCard key={u.id} user={u} onClick={() => router.push(`/manager/utilisateurs/${u.id}`)} />
                    ))}
                </div>
            ) : (
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                    <div className="hidden lg:grid grid-cols-[auto_1fr_120px_90px_110px_80px_40px] items-center gap-4 px-4 py-2 bg-slate-50 border-b border-slate-100 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
                        <div className="w-9" />
                        <div>Utilisateur</div>
                        <div>Rôle</div>
                        <div>Statut</div>
                        <div className="text-right">Connexion</div>
                        <div className="text-center">Missions</div>
                        <div />
                    </div>
                    {users.map((u) => (
                        <UserRow key={u.id} user={u} onClick={() => router.push(`/manager/utilisateurs/${u.id}`)} />
                    ))}
                </div>
            )}

            {/* ── Create modal ── */}
            <Modal isOpen={showCreate} onClose={() => { setShowCreate(false); setFormData(EMPTY_FORM); setFormErrors({}); }} title="Nouvel utilisateur" size="md">
                <UserFormFields data={formData} errors={formErrors} clients={clients} onChange={(p) => setFormData((d) => ({ ...d, ...p }))} />
                <ModalFooter>
                    <button onClick={() => { setShowCreate(false); setFormData(EMPTY_FORM); setFormErrors({}); }} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                        Annuler
                    </button>
                    <button onClick={handleCreate} disabled={formLoading} className="px-4 py-2 text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors disabled:opacity-50">
                        {formLoading ? "Création…" : "Créer l'utilisateur"}
                    </button>
                </ModalFooter>
            </Modal>
        </div>
    );
}
