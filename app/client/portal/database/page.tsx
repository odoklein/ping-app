"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { useToast } from "@/components/ui";
import {
    Building2,
    Search,
    Users,
    Globe2,
    Phone,
    Mail,
    X,
    Filter,
    Download,
    ExternalLink,
    ChevronRight,
    Check,
    Copy,
    ArrowUpDown,
    RefreshCw,
    Layers,
    Linkedin,
    Briefcase,
    MapPin,
    Eye,
    ArrowUpRight,
    PhoneCall,
    Maximize2,
    Minimize2,
    ArrowLeft
} from "lucide-react";

// ============================================
// TYPES & INTERFACES
// ============================================

interface Contact {
    id: string;
    firstName?: string | null;
    lastName?: string | null;
    title?: string | null;
    email?: string | null;
    phone?: string | null;
    linkedin?: string | null;
    additionalPhones?: string[] | null;
    additionalEmails?: string[] | null;
}

interface LatestAction {
    id: string;
    result: string;
    channel: string;
    createdAt: string;
}

interface Company {
    id: string;
    name: string;
    country?: string | null;
    industry?: string | null;
    size?: string | null;
    phone?: string | null;
    website?: string | null;
    createdAt: string;
    status?: string;
    list?: {
        id: string;
        name: string;
        mission?: {
            id: string;
            name: string;
        } | null;
    } | null;
    contacts: Contact[];
    actions?: LatestAction[];
    _count?: {
        contacts: number;
        actions: number;
    };
}

interface FlatContactRecord {
    contact: Contact;
    company: Company;
}

type ViewMode = "table" | "cards" | "contacts";
type SortOption = "name-asc" | "name-desc" | "contacts-desc" | "recent-desc" | "industry-asc";

// Action status formatting dictionary
const ACTION_RESULT_MAP: Record<string, { label: string; bg: string; text: string; dot: string }> = {
    MEETING_BOOKED: { label: "RDV confirmé", bg: "bg-emerald-50 border-emerald-200", text: "text-emerald-700", dot: "bg-emerald-500" },
    CALLBACK_REQUESTED: { label: "Rappel demandé", bg: "bg-sky-50 border-sky-200", text: "text-sky-700", dot: "bg-sky-500" },
    INTERESTED: { label: "Intéressé", bg: "bg-indigo-50 border-indigo-200", text: "text-indigo-700", dot: "bg-indigo-500" },
    NO_RESPONSE: { label: "Sans réponse", bg: "bg-amber-50 border-amber-200", text: "text-amber-700", dot: "bg-amber-500" },
    VOICEMAIL: { label: "Messagerie", bg: "bg-slate-100 border-slate-200", text: "text-slate-700", dot: "bg-slate-400" },
    DISQUALIFIED: { label: "Disqualifié", bg: "bg-rose-50 border-rose-200", text: "text-rose-700", dot: "bg-rose-500" },
    NOT_INTERESTED: { label: "Non intéressé", bg: "bg-slate-100 border-slate-200", text: "text-slate-600", dot: "bg-slate-400" },
    MEETING_CANCELLED: { label: "RDV annulé", bg: "bg-red-50 border-red-200", text: "text-red-700", dot: "bg-red-500" },
};

// Deterministic gradient generator for company badges
const GRADIENT_PALETTES = [
    "from-emerald-500 to-teal-600 text-white",
    "from-blue-500 to-indigo-600 text-white",
    "from-violet-500 to-purple-600 text-white",
    "from-amber-500 to-orange-600 text-white",
    "from-teal-500 to-cyan-600 text-white",
    "from-sky-500 to-blue-600 text-white",
    "from-rose-500 to-pink-600 text-white",
    "from-slate-700 to-slate-900 text-white",
];

function getCompanyGradient(name: string): string {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const idx = Math.abs(hash) % GRADIENT_PALETTES.length;
    return GRADIENT_PALETTES[idx];
}

function cleanWebsiteUrl(url: string | null | undefined): string {
    if (!url) return "";
    return url.replace(/^https?:\/\//i, "").replace(/^www\./i, "").replace(/\/$/, "");
}

function getInitials(text: string): string {
    if (!text) return "•";
    const parts = text.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
}

export default function ClientPortalDatabasePage() {
    const { success: showSuccess, error: showError } = useToast();

    // Data states
    const [companies, setCompanies] = useState<Company[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);

    // Filtering & View states
    const [search, setSearch] = useState("");
    const [selectedIndustry, setSelectedIndustry] = useState<string>("all");
    const [selectedMission, setSelectedMission] = useState<string>("all");
    const [selectedCountry, setSelectedCountry] = useState<string>("all");
    const [selectedSize, setSelectedSize] = useState<string>("all");
    const [hasPhoneOnly, setHasPhoneOnly] = useState<boolean>(false);
    const [hasEmailOnly, setHasEmailOnly] = useState<boolean>(false);
    const [hasLinkedinOnly, setHasLinkedinOnly] = useState<boolean>(false);
    const [hasActionOnly, setHasActionOnly] = useState<boolean>(false);
    const [sortBy, setSortBy] = useState<SortOption>("name-asc");
    const [viewMode, setViewMode] = useState<ViewMode>("table");

    // Drawer state
    const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [isFullScreen, setIsFullScreen] = useState(true);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (isDrawerOpen) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "";
        }
        return () => {
            document.body.style.overflow = "";
        };
    }, [isDrawerOpen]);

    // Pagination
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(25);

    // Clipboard feedback tracker
    const [copiedKey, setCopiedKey] = useState<string | null>(null);

    // Search input ref for keyboard shortcut
    const searchInputRef = useRef<HTMLInputElement>(null);

    // Fetch database
    const fetchData = useCallback(async (isSilent = false) => {
        if (!isSilent) setIsLoading(true);
        else setIsRefreshing(true);
        try {
            const res = await fetch("/api/client/database");
            const json = await res.json();
            if (json.success) {
                setCompanies(json.data?.companies || []);
            } else {
                showError("Erreur", json.error || "Impossible de charger la base de données");
            }
        } catch {
            showError("Erreur", "Impossible de charger la base de données");
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    }, [showError]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Keyboard shortcut to focus search with "/" or "Ctrl/Cmd+K"
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.key === "/" && (e.target as HTMLElement).tagName !== "INPUT" && (e.target as HTMLElement).tagName !== "TEXTAREA") ||
                ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k")) {
                e.preventDefault();
                searchInputRef.current?.focus();
            } else if (e.key === "Escape") {
                if (isDrawerOpen) {
                    setIsDrawerOpen(false);
                } else if (search) {
                    setSearch("");
                }
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isDrawerOpen, search]);

    // Copy to clipboard helper
    const handleCopy = (text: string, key: string, label: string) => {
        navigator.clipboard.writeText(text);
        setCopiedKey(key);
        showSuccess("Copié !", `${label} : ${text}`);
        setTimeout(() => setCopiedKey(null), 2000);
    };

    // Open drawer
    const handleOpenDrawer = (company: Company) => {
        setSelectedCompany(company);
        setIsDrawerOpen(true);
    };

    // Close drawer
    const handleCloseDrawer = () => {
        setIsDrawerOpen(false);
    };

    // Extract unique filter lists with counts
    const filterOptions = useMemo(() => {
        const industriesMap = new Map<string, number>();
        const missionsMap = new Map<string, number>();
        const countriesMap = new Map<string, number>();
        const sizesMap = new Map<string, number>();

        companies.forEach((c) => {
            if (c.industry) {
                industriesMap.set(c.industry, (industriesMap.get(c.industry) || 0) + 1);
            }
            const missionName = c.list?.mission?.name || c.list?.name;
            if (missionName) {
                missionsMap.set(missionName, (missionsMap.get(missionName) || 0) + 1);
            }
            if (c.country) {
                countriesMap.set(c.country, (countriesMap.get(c.country) || 0) + 1);
            }
            if (c.size) {
                sizesMap.set(c.size, (sizesMap.get(c.size) || 0) + 1);
            }
        });

        return {
            industries: Array.from(industriesMap.entries()).sort((a, b) => b[1] - a[1]),
            missions: Array.from(missionsMap.entries()).sort((a, b) => b[1] - a[1]),
            countries: Array.from(countriesMap.entries()).sort((a, b) => b[1] - a[1]),
            sizes: Array.from(sizesMap.entries()).sort((a, b) => b[1] - a[1]),
        };
    }, [companies]);

    // Global Statistics / Executive KPI Cards
    const stats = useMemo(() => {
        const totalCompanies = companies.length;
        let totalContacts = 0;
        let withPhone = 0;
        let withEmail = 0;
        let withLinkedin = 0;
        let withActions = 0;

        companies.forEach((c) => {
            const contactCount = c.contacts.length;
            totalContacts += contactCount;

            const companyHasPhone = !!c.phone || c.contacts.some((ct) => !!ct.phone);
            if (companyHasPhone) withPhone++;

            const companyHasEmail = c.contacts.some((ct) => !!ct.email);
            if (companyHasEmail) withEmail++;

            const companyHasLinkedin = c.contacts.some((ct) => !!ct.linkedin);
            if (companyHasLinkedin) withLinkedin++;

            if ((c.actions && c.actions.length > 0) || (c._count && c._count.actions > 0)) {
                withActions++;
            }
        });

        const phoneCoverage = totalCompanies > 0 ? Math.round((withPhone / totalCompanies) * 100) : 0;
        const emailCoverage = totalCompanies > 0 ? Math.round((withEmail / totalCompanies) * 100) : 0;
        const linkedinCoverage = totalCompanies > 0 ? Math.round((withLinkedin / totalCompanies) * 100) : 0;

        return {
            totalCompanies,
            totalContacts,
            withPhone,
            withEmail,
            withLinkedin,
            withActions,
            phoneCoverage,
            emailCoverage,
            linkedinCoverage,
        };
    }, [companies]);

    // Filtered & Sorted Companies
    const filteredCompanies = useMemo(() => {
        const query = search.trim().toLowerCase();

        return companies
            .filter((c) => {
                // Search term
                if (query) {
                    const haystack = [
                        c.name,
                        c.industry,
                        c.country,
                        c.size,
                        c.website,
                        c.phone,
                        c.list?.name,
                        c.list?.mission?.name,
                        ...c.contacts.flatMap((ct) => [
                            ct.firstName,
                            ct.lastName,
                            ct.title,
                            ct.email,
                            ct.phone,
                        ]),
                    ]
                        .filter(Boolean)
                        .join(" ")
                        .toLowerCase();

                    if (!haystack.includes(query)) return false;
                }

                // Industry filter
                if (selectedIndustry !== "all" && c.industry !== selectedIndustry) {
                    return false;
                }

                // Mission / List filter
                if (selectedMission !== "all") {
                    const missionName = c.list?.mission?.name || c.list?.name;
                    if (missionName !== selectedMission) return false;
                }

                // Country filter
                if (selectedCountry !== "all" && c.country !== selectedCountry) {
                    return false;
                }

                // Size filter
                if (selectedSize !== "all" && c.size !== selectedSize) {
                    return false;
                }

                // Boolean flags
                if (hasPhoneOnly && !c.phone && !c.contacts.some((ct) => !!ct.phone)) {
                    return false;
                }
                if (hasEmailOnly && !c.contacts.some((ct) => !!ct.email)) {
                    return false;
                }
                if (hasLinkedinOnly && !c.contacts.some((ct) => !!ct.linkedin)) {
                    return false;
                }
                if (hasActionOnly && (!c.actions || c.actions.length === 0) && (!c._count || c._count.actions === 0)) {
                    return false;
                }

                return true;
            })
            .sort((a, b) => {
                switch (sortBy) {
                    case "name-asc":
                        return a.name.localeCompare(b.name, "fr", { sensitivity: "base" });
                    case "name-desc":
                        return b.name.localeCompare(a.name, "fr", { sensitivity: "base" });
                    case "contacts-desc":
                        return b.contacts.length - a.contacts.length;
                    case "recent-desc":
                        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
                    case "industry-asc":
                        return (a.industry || "").localeCompare(b.industry || "", "fr", { sensitivity: "base" });
                    default:
                        return 0;
                }
            });
    }, [
        companies,
        search,
        selectedIndustry,
        selectedMission,
        selectedCountry,
        selectedSize,
        hasPhoneOnly,
        hasEmailOnly,
        hasLinkedinOnly,
        hasActionOnly,
        sortBy,
    ]);

    // Flattened decision-maker contacts for "contacts" directory view
    const flatContacts = useMemo(() => {
        const list: FlatContactRecord[] = [];
        filteredCompanies.forEach((company) => {
            company.contacts.forEach((contact) => {
                list.push({ contact, company });
            });
        });
        return list;
    }, [filteredCompanies]);

    // Reset pagination when filter changes
    useEffect(() => {
        setPage(1);
    }, [
        search,
        selectedIndustry,
        selectedMission,
        selectedCountry,
        selectedSize,
        hasPhoneOnly,
        hasEmailOnly,
        hasLinkedinOnly,
        hasActionOnly,
        sortBy,
        viewMode,
    ]);

    // Active filters count
    const activeFiltersCount = useMemo(() => {
        let count = 0;
        if (selectedIndustry !== "all") count++;
        if (selectedMission !== "all") count++;
        if (selectedCountry !== "all") count++;
        if (selectedSize !== "all") count++;
        if (hasPhoneOnly) count++;
        if (hasEmailOnly) count++;
        if (hasLinkedinOnly) count++;
        if (hasActionOnly) count++;
        return count;
    }, [
        selectedIndustry,
        selectedMission,
        selectedCountry,
        selectedSize,
        hasPhoneOnly,
        hasEmailOnly,
        hasLinkedinOnly,
        hasActionOnly,
    ]);

    const resetAllFilters = () => {
        setSearch("");
        setSelectedIndustry("all");
        setSelectedMission("all");
        setSelectedCountry("all");
        setSelectedSize("all");
        setHasPhoneOnly(false);
        setHasEmailOnly(false);
        setHasLinkedinOnly(false);
        setHasActionOnly(false);
        setSortBy("name-asc");
    };

    // Paginated subsets
    const totalItems = viewMode === "contacts" ? flatContacts.length : filteredCompanies.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    const paginatedCompanies = useMemo(() => {
        const start = (page - 1) * pageSize;
        return filteredCompanies.slice(start, start + pageSize);
    }, [filteredCompanies, page, pageSize]);

    const paginatedContacts = useMemo(() => {
        const start = (page - 1) * pageSize;
        return flatContacts.slice(start, start + pageSize);
    }, [flatContacts, page, pageSize]);

    // CSV Export Handler
    const handleExportCSV = () => {
        if (filteredCompanies.length === 0) {
            showError("Export", "Aucune donnée à exporter avec les filtres actuels.");
            return;
        }

        const headers = [
            "Entreprise",
            "Site Web",
            "Standard",
            "Secteur",
            "Taille",
            "Pays",
            "Campagne / Mission",
            "Prénom Contact",
            "Nom Contact",
            "Poste",
            "Email Direct",
            "Téléphone Direct",
            "LinkedIn",
            "Dernière Action",
            "Date Ajout",
        ];

        const rows: string[][] = [];

        filteredCompanies.forEach((c) => {
            const lastAction = c.actions && c.actions[0] ? (ACTION_RESULT_MAP[c.actions[0].result]?.label || c.actions[0].result) : "Non contacté";
            const missionName = c.list?.mission?.name || c.list?.name || "";

            if (c.contacts.length === 0) {
                rows.push([
                    c.name || "",
                    c.website || "",
                    c.phone || "",
                    c.industry || "",
                    c.size || "",
                    c.country || "",
                    missionName,
                    "",
                    "",
                    "",
                    "",
                    "",
                    "",
                    lastAction,
                    c.createdAt ? new Date(c.createdAt).toLocaleDateString("fr-FR") : "",
                ]);
            } else {
                c.contacts.forEach((ct) => {
                    rows.push([
                        c.name || "",
                        c.website || "",
                        c.phone || "",
                        c.industry || "",
                        c.size || "",
                        c.country || "",
                        missionName,
                        ct.firstName || "",
                        ct.lastName || "",
                        ct.title || "",
                        ct.email || "",
                        ct.phone || "",
                        ct.linkedin || "",
                        lastAction,
                        c.createdAt ? new Date(c.createdAt).toLocaleDateString("fr-FR") : "",
                    ]);
                });
            }
        });

        const csvContent =
            "\uFEFF" +
            headers.map((h) => `"${h.replace(/"/g, '""')}"`).join(";") +
            "\n" +
            rows
                .map((row) =>
                    row
                        .map((cell) => `"${(cell || "").toString().replace(/"/g, '""')}"`)
                        .join(";")
                )
                .join("\n");

        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        const filename = `export_database_${new Date().toISOString().slice(0, 10)}.csv`;
        link.setAttribute("href", url);
        link.setAttribute("download", filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        showSuccess("Export CSV généré", `${rows.length} lignes de décideurs et entreprises exportées.`);
    };

    return (
        <div className="min-h-full bg-[var(--elan-paper)] p-4 md:p-8 space-y-6">
            {/* ============================================================ */}
            {/* TOP HEADER SECTION */}
            {/* ============================================================ */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-2 border-b border-[var(--elan-line)]">
                <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 via-teal-500 to-emerald-400 flex items-center justify-center shadow-lg shadow-emerald-500/20 text-white shrink-0">
                        <Building2 className="w-6 h-6" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2.5">
                            <h1 className="text-2xl font-bold text-[var(--elan-ink)] tracking-tight">
                                Base de données & Contacts
                            </h1>
                            <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                {companies.length} comptes cibles
                            </span>
                        </div>
                        <p className="text-xs md:text-sm text-[var(--elan-slate)] mt-0.5">
                            Répertoire des entreprises ciblées, décideurs qualifiés et coordonnées vérifiées
                        </p>
                    </div>
                </div>

                {/* Top Action Bar */}
                <div className="flex flex-wrap items-center gap-2.5 self-start lg:self-auto">
                    <button
                        type="button"
                        onClick={() => fetchData(true)}
                        disabled={isRefreshing || isLoading}
                        title="Actualiser les données"
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-[var(--elan-slate)] hover:text-[var(--elan-ink)] bg-[var(--elan-surface)] hover:bg-[var(--elan-paper-2)] border border-[var(--elan-line)] transition-all shadow-xs disabled:opacity-50"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-emerald-600" : ""}`} />
                        <span className="hidden sm:inline">Actualiser</span>
                    </button>

                    <button
                        type="button"
                        onClick={handleExportCSV}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-sm shadow-emerald-500/20 transition-all hover:shadow-md"
                    >
                        <Download className="w-3.5 h-3.5" />
                        <span>Exporter CSV</span>
                    </button>

                    {/* View Switcher */}
                    <div className="flex items-center p-1 bg-[var(--elan-surface)] border border-[var(--elan-line)] rounded-xl shadow-xs">
                        <button
                            type="button"
                            onClick={() => setViewMode("table")}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                                viewMode === "table"
                                    ? "bg-emerald-600 text-white shadow-xs"
                                    : "text-[var(--elan-slate)] hover:text-[var(--elan-ink)]"
                            }`}
                        >
                            <Layers className="w-3.5 h-3.5" />
                            <span>Tableau</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setViewMode("cards")}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                                viewMode === "cards"
                                    ? "bg-emerald-600 text-white shadow-xs"
                                    : "text-[var(--elan-slate)] hover:text-[var(--elan-ink)]"
                            }`}
                        >
                            <Building2 className="w-3.5 h-3.5" />
                            <span>Cartes</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setViewMode("contacts")}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                                viewMode === "contacts"
                                    ? "bg-emerald-600 text-white shadow-xs"
                                    : "text-[var(--elan-slate)] hover:text-[var(--elan-ink)]"
                            }`}
                        >
                            <Users className="w-3.5 h-3.5" />
                            <span>Décideurs</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* ============================================================ */}
            {/* EXECUTIVE KPI SUMMARY CARDS */}
            {/* ============================================================ */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                {/* 1. Comptes Cibles */}
                <div className="bg-[var(--elan-surface)] p-4 rounded-2xl border border-[var(--elan-line)] shadow-xs flex flex-col justify-between hover:border-emerald-300/60 transition-all">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-[var(--elan-slate)]">Comptes Cibles</span>
                        <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                            <Building2 className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="mt-2">
                        <div className="text-2xl font-bold text-[var(--elan-ink)] tracking-tight">
                            {stats.totalCompanies.toLocaleString()}
                        </div>
                        <p className="text-[11px] text-[var(--elan-slate)] mt-0.5">
                            {filterOptions.industries.length} secteurs d&apos;activité identifiés
                        </p>
                    </div>
                    <div className="mt-3 pt-2.5 border-t border-[var(--elan-line)] flex items-center justify-between text-[11px]">
                        <span className="text-[var(--elan-slate)]">Prospectés / actifs</span>
                        <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                            {stats.withActions} comptes
                        </span>
                    </div>
                </div>

                {/* 2. Décideurs Répertoriés */}
                <div className="bg-[var(--elan-surface)] p-4 rounded-2xl border border-[var(--elan-line)] shadow-xs flex flex-col justify-between hover:border-emerald-300/60 transition-all">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-[var(--elan-slate)]">Décideurs Qualifiés</span>
                        <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
                            <Users className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="mt-2">
                        <div className="text-2xl font-bold text-[var(--elan-ink)] tracking-tight">
                            {stats.totalContacts.toLocaleString()}
                        </div>
                        <p className="text-[11px] text-[var(--elan-slate)] mt-0.5">
                            {(stats.totalCompanies > 0 ? (stats.totalContacts / stats.totalCompanies).toFixed(1) : 0)} contacts en moyenne par compte
                        </p>
                    </div>
                    <div className="mt-3 pt-2.5 border-t border-[var(--elan-line)] flex items-center justify-between text-[11px]">
                        <span className="text-[var(--elan-slate)]">Avec profil LinkedIn</span>
                        <span className="font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md">
                            {stats.withLinkedin} ({stats.linkedinCoverage}%)
                        </span>
                    </div>
                </div>

                {/* 3. Lignes Téléphoniques */}
                <div
                    onClick={() => setHasPhoneOnly(!hasPhoneOnly)}
                    className={`cursor-pointer bg-[var(--elan-surface)] p-4 rounded-2xl border transition-all ${
                        hasPhoneOnly
                            ? "border-emerald-500 ring-2 ring-emerald-500/20 shadow-sm"
                            : "border-[var(--elan-line)] hover:border-emerald-300/60 shadow-xs"
                    }`}
                >
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-[var(--elan-slate)]">Couverture Téléphone</span>
                        <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                            <Phone className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="mt-2">
                        <div className="flex items-baseline gap-2">
                            <span className="text-2xl font-bold text-[var(--elan-ink)] tracking-tight">
                                {stats.phoneCoverage}%
                            </span>
                            <span className="text-xs text-[var(--elan-slate)]">
                                ({stats.withPhone} comptes)
                            </span>
                        </div>
                        <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
                            <div
                                className="bg-gradient-to-r from-emerald-500 to-teal-500 h-full rounded-full transition-all duration-500"
                                style={{ width: `${stats.phoneCoverage}%` }}
                            />
                        </div>
                    </div>
                    <div className="mt-3 pt-2.5 border-t border-[var(--elan-line)] flex items-center justify-between text-[11px]">
                        <span className="text-[var(--elan-slate)]">Ligne directe ou standard</span>
                        <span className="font-semibold text-emerald-700">
                            {hasPhoneOnly ? "Filtre actif ✓" : "Filtrer"}
                        </span>
                    </div>
                </div>

                {/* 4. Couverture Email & Numérique */}
                <div
                    onClick={() => setHasEmailOnly(!hasEmailOnly)}
                    className={`cursor-pointer bg-[var(--elan-surface)] p-4 rounded-2xl border transition-all ${
                        hasEmailOnly
                            ? "border-emerald-500 ring-2 ring-emerald-500/20 shadow-sm"
                            : "border-[var(--elan-line)] hover:border-emerald-300/60 shadow-xs"
                    }`}
                >
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-[var(--elan-slate)]">Emails Directs</span>
                        <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
                            <Mail className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="mt-2">
                        <div className="flex items-baseline gap-2">
                            <span className="text-2xl font-bold text-[var(--elan-ink)] tracking-tight">
                                {stats.emailCoverage}%
                            </span>
                            <span className="text-xs text-[var(--elan-slate)]">
                                ({stats.withEmail} comptes)
                            </span>
                        </div>
                        <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
                            <div
                                className="bg-gradient-to-r from-sky-500 to-blue-500 h-full rounded-full transition-all duration-500"
                                style={{ width: `${stats.emailCoverage}%` }}
                            />
                        </div>
                    </div>
                    <div className="mt-3 pt-2.5 border-t border-[var(--elan-line)] flex items-center justify-between text-[11px]">
                        <span className="text-[var(--elan-slate)]">Décideurs avec email</span>
                        <span className="font-semibold text-sky-700">
                            {hasEmailOnly ? "Filtre actif ✓" : "Filtrer"}
                        </span>
                    </div>
                </div>
            </div>

            {/* ============================================================ */}
            {/* COMMAND BAR: SEARCH, FILTERS, TOGGLES & SORT */}
            {/* ============================================================ */}
            <div className="bg-[var(--elan-surface)] rounded-2xl border border-[var(--elan-line)] p-3 md:p-4 shadow-xs space-y-3">
                <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                    {/* Search Input */}
                    <div className="relative flex-1 max-w-xl">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            ref={searchInputRef}
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Rechercher une entreprise, secteur, nom de contact, email, poste..."
                            className="w-full h-10 pl-10 pr-16 rounded-xl border border-[var(--elan-line)] bg-[var(--elan-paper)] text-sm text-[var(--elan-ink)] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                        />
                        <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                            {search ? (
                                <button
                                    type="button"
                                    onClick={() => setSearch("")}
                                    className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-200/60"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            ) : (
                                <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono text-slate-400 bg-slate-100 border border-slate-200 rounded">
                                    /
                                </kbd>
                            )}
                        </div>
                    </div>

                    {/* Quick Sort Dropdown */}
                    <div className="flex items-center gap-2 self-end md:self-auto shrink-0">
                        <div className="flex items-center gap-1.5 text-xs text-[var(--elan-slate)] font-medium">
                            <ArrowUpDown className="w-3.5 h-3.5" />
                            <span>Trier par :</span>
                        </div>
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value as SortOption)}
                            className="h-10 px-3 pr-8 rounded-xl border border-[var(--elan-line)] bg-[var(--elan-paper)] text-xs font-semibold text-[var(--elan-ink)] focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 cursor-pointer"
                        >
                            <option value="name-asc">Nom (A → Z)</option>
                            <option value="name-desc">Nom (Z → A)</option>
                            <option value="contacts-desc">Plus de contacts</option>
                            <option value="recent-desc">Récemment ajoutés</option>
                            <option value="industry-asc">Secteur d&apos;activité</option>
                        </select>
                    </div>
                </div>

                {/* Dropdown Filters & Quick Chips Bar */}
                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[var(--elan-line)]">
                    {/* Industry Filter */}
                    <select
                        value={selectedIndustry}
                        onChange={(e) => setSelectedIndustry(e.target.value)}
                        className={`h-8 px-2.5 rounded-lg border text-xs font-medium cursor-pointer transition-all ${
                            selectedIndustry !== "all"
                                ? "border-emerald-500 bg-emerald-50 text-emerald-800 font-semibold"
                                : "border-[var(--elan-line)] bg-[var(--elan-paper)] text-[var(--elan-slate)] hover:text-[var(--elan-ink)]"
                        }`}
                    >
                        <option value="all">Tous les secteurs ({filterOptions.industries.length})</option>
                        {filterOptions.industries.map(([ind, count]) => (
                            <option key={ind} value={ind}>
                                {ind} ({count})
                            </option>
                        ))}
                    </select>

                    {/* Mission / List Filter */}
                    {filterOptions.missions.length > 0 && (
                        <select
                            value={selectedMission}
                            onChange={(e) => setSelectedMission(e.target.value)}
                            className={`h-8 px-2.5 rounded-lg border text-xs font-medium cursor-pointer transition-all ${
                                selectedMission !== "all"
                                    ? "border-emerald-500 bg-emerald-50 text-emerald-800 font-semibold"
                                    : "border-[var(--elan-line)] bg-[var(--elan-paper)] text-[var(--elan-slate)] hover:text-[var(--elan-ink)]"
                            }`}
                        >
                            <option value="all">Toutes les campagnes ({filterOptions.missions.length})</option>
                            {filterOptions.missions.map(([mis, count]) => (
                                <option key={mis} value={mis}>
                                    {mis} ({count})
                                </option>
                            ))}
                        </select>
                    )}

                    {/* Country Filter */}
                    {filterOptions.countries.length > 1 && (
                        <select
                            value={selectedCountry}
                            onChange={(e) => setSelectedCountry(e.target.value)}
                            className={`h-8 px-2.5 rounded-lg border text-xs font-medium cursor-pointer transition-all ${
                                selectedCountry !== "all"
                                    ? "border-emerald-500 bg-emerald-50 text-emerald-800 font-semibold"
                                    : "border-[var(--elan-line)] bg-[var(--elan-paper)] text-[var(--elan-slate)] hover:text-[var(--elan-ink)]"
                            }`}
                        >
                            <option value="all">Tous les pays ({filterOptions.countries.length})</option>
                            {filterOptions.countries.map(([c, count]) => (
                                <option key={c} value={c}>
                                    {c} ({count})
                                </option>
                            ))}
                        </select>
                    )}

                    {/* Size Filter */}
                    {filterOptions.sizes.length > 1 && (
                        <select
                            value={selectedSize}
                            onChange={(e) => setSelectedSize(e.target.value)}
                            className={`h-8 px-2.5 rounded-lg border text-xs font-medium cursor-pointer transition-all ${
                                selectedSize !== "all"
                                    ? "border-emerald-500 bg-emerald-50 text-emerald-800 font-semibold"
                                    : "border-[var(--elan-line)] bg-[var(--elan-paper)] text-[var(--elan-slate)] hover:text-[var(--elan-ink)]"
                            }`}
                        >
                            <option value="all">Toutes les tailles</option>
                            {filterOptions.sizes.map(([s, count]) => (
                                <option key={s} value={s}>
                                    {s} ({count})
                                </option>
                            ))}
                        </select>
                    )}

                    <div className="hidden sm:block h-4 w-px bg-slate-200 mx-1" />

                    {/* Filter Badges / Quick Toggles */}
                    <button
                        type="button"
                        onClick={() => setHasPhoneOnly(!hasPhoneOnly)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                            hasPhoneOnly
                                ? "bg-emerald-600 text-white shadow-xs"
                                : "bg-[var(--elan-paper)] text-[var(--elan-slate)] hover:text-[var(--elan-ink)] border border-[var(--elan-line)]"
                        }`}
                    >
                        <Phone className="w-3 h-3" />
                        <span>Téléphone dispo</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setHasEmailOnly(!hasEmailOnly)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                            hasEmailOnly
                                ? "bg-sky-600 text-white shadow-xs"
                                : "bg-[var(--elan-paper)] text-[var(--elan-slate)] hover:text-[var(--elan-ink)] border border-[var(--elan-line)]"
                        }`}
                    >
                        <Mail className="w-3 h-3" />
                        <span>Email direct</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setHasLinkedinOnly(!hasLinkedinOnly)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                            hasLinkedinOnly
                                ? "bg-blue-600 text-white shadow-xs"
                                : "bg-[var(--elan-paper)] text-[var(--elan-slate)] hover:text-[var(--elan-ink)] border border-[var(--elan-line)]"
                        }`}
                    >
                        <Linkedin className="w-3 h-3" />
                        <span>LinkedIn</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setHasActionOnly(!hasActionOnly)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                            hasActionOnly
                                ? "bg-indigo-600 text-white shadow-xs"
                                : "bg-[var(--elan-paper)] text-[var(--elan-slate)] hover:text-[var(--elan-ink)] border border-[var(--elan-line)]"
                        }`}
                    >
                        <PhoneCall className="w-3 h-3" />
                        <span>Déjà prospecté</span>
                    </button>

                    {/* Reset Button */}
                    {activeFiltersCount > 0 && (
                        <button
                            type="button"
                            onClick={resetAllFilters}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 transition-all ml-auto"
                        >
                            <X className="w-3 h-3" />
                            <span>Réinitialiser ({activeFiltersCount})</span>
                        </button>
                    )}
                </div>
            </div>

            {/* ============================================================ */}
            {/* CONTENT AREA: TABLE / CARDS / CONTACTS */}
            {/* ============================================================ */}
            {isLoading ? (
                /* Shimmer Skeletons */
                <div className="bg-[var(--elan-surface)] rounded-2xl border border-[var(--elan-line)] p-6 space-y-4">
                    <div className="flex items-center justify-between pb-4 border-b border-[var(--elan-line)]">
                        <div className="h-4 w-48 bg-slate-200 rounded animate-pulse" />
                        <div className="h-4 w-24 bg-slate-200 rounded animate-pulse" />
                    </div>
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                        <div key={i} className="flex items-center gap-4 py-3 border-b border-slate-100 last:border-0">
                            <div className="w-10 h-10 rounded-xl bg-slate-200 animate-pulse shrink-0" />
                            <div className="flex-1 space-y-2">
                                <div className="h-4 w-40 bg-slate-200 rounded animate-pulse" />
                                <div className="h-3 w-64 bg-slate-100 rounded animate-pulse" />
                            </div>
                            <div className="w-28 h-6 bg-slate-200 rounded-lg animate-pulse" />
                            <div className="w-20 h-4 bg-slate-200 rounded animate-pulse" />
                        </div>
                    ))}
                </div>
            ) : totalItems === 0 ? (
                /* Empty state */
                <div className="bg-[var(--elan-surface)] border-2 border-dashed border-[var(--elan-line)] rounded-3xl py-16 px-6 text-center">
                    <div className="mx-auto mb-4 w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-xs">
                        <Building2 className="w-8 h-8" />
                    </div>
                    <h3 className="text-base font-bold text-[var(--elan-ink)]">
                        Aucune entreprise ou contact ne correspond aux critères
                    </h3>
                    <p className="mt-1.5 text-xs text-[var(--elan-slate)] max-w-sm mx-auto">
                        Essayez de modifier vos termes de recherche ou de réinitialiser vos filtres sectoriels et de prospection.
                    </p>
                    {activeFiltersCount > 0 || search ? (
                        <button
                            type="button"
                            onClick={resetAllFilters}
                            className="mt-5 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm transition-all"
                        >
                            <RefreshCw className="w-3.5 h-3.5" />
                            <span>Effacer tous les filtres</span>
                        </button>
                    ) : null}
                </div>
            ) : viewMode === "table" ? (
                /* MODE TABLEAU */
                <div className="bg-[var(--elan-surface)] rounded-2xl border border-[var(--elan-line)] overflow-hidden shadow-xs">
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-left border-collapse text-xs">
                            <thead>
                                <tr className="bg-[var(--elan-paper)] border-b border-[var(--elan-line)] text-[11px] font-bold text-[var(--elan-slate)] uppercase tracking-wider">
                                    <th className="py-3.5 px-4">Entreprise</th>
                                    <th className="py-3.5 px-4">Secteur & Taille</th>
                                    <th className="py-3.5 px-4">Standard & Pays</th>
                                    <th className="py-3.5 px-4">Campagne / Liste</th>
                                    <th className="py-3.5 px-4">Décideurs Répertoriés</th>
                                    <th className="py-3.5 px-4">Statut Prospection</th>
                                    <th className="py-3.5 px-4 text-right">Fiche</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--elan-line)]">
                                {paginatedCompanies.map((company) => {
                                    const latestAction = company.actions && company.actions[0];
                                    const statusCfg = latestAction
                                        ? ACTION_RESULT_MAP[latestAction.result] || { label: latestAction.result, bg: "bg-slate-100", text: "text-slate-700", dot: "bg-slate-400" }
                                        : null;

                                    return (
                                        <tr
                                            key={company.id}
                                            onClick={() => handleOpenDrawer(company)}
                                            className="hover:bg-emerald-50/25 transition-colors cursor-pointer group"
                                        >
                                            {/* Entreprise */}
                                            <td className="py-3.5 px-4 align-middle">
                                                <div className="flex items-center gap-3">
                                                    <div
                                                        className={`w-9 h-9 rounded-xl bg-gradient-to-tr ${getCompanyGradient(
                                                            company.name
                                                        )} flex items-center justify-center font-bold text-xs shadow-xs shrink-0`}
                                                    >
                                                        {getInitials(company.name)}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="font-bold text-[var(--elan-ink)] text-xs sm:text-sm truncate group-hover:text-emerald-700 transition-colors">
                                                            {company.name}
                                                        </p>
                                                        {company.website ? (
                                                            <a
                                                                href={company.website}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                onClick={(e) => e.stopPropagation()}
                                                                className="inline-flex items-center gap-1 text-[11px] text-emerald-600 hover:text-emerald-800 hover:underline transition-colors mt-0.5"
                                                            >
                                                                <Globe2 className="w-3 h-3 shrink-0" />
                                                                <span className="truncate max-w-[160px]">
                                                                    {cleanWebsiteUrl(company.website)}
                                                                </span>
                                                                <ArrowUpRight className="w-2.5 h-2.5 opacity-60" />
                                                            </a>
                                                        ) : (
                                                            <span className="text-[11px] text-slate-400">Site non renseigné</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Secteur & Taille */}
                                            <td className="py-3.5 px-4 align-middle">
                                                <div className="flex flex-col gap-1 max-w-[180px]">
                                                    {company.industry ? (
                                                        <span className="inline-flex items-center gap-1 font-medium text-[var(--elan-ink)] truncate">
                                                            <Briefcase className="w-3 h-3 text-slate-400 shrink-0" />
                                                            <span className="truncate">{company.industry}</span>
                                                        </span>
                                                    ) : (
                                                        <span className="text-slate-400">—</span>
                                                    )}
                                                    {company.size && (
                                                        <span className="inline-flex items-center gap-1 text-[11px] text-[var(--elan-slate)] font-medium">
                                                            <Users className="w-3 h-3 text-slate-400" />
                                                            {company.size}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Standard & Pays */}
                                            <td className="py-3.5 px-4 align-middle">
                                                <div className="flex flex-col gap-1 text-[11px]">
                                                    {company.phone ? (
                                                        <div className="flex items-center gap-1.5">
                                                            <a
                                                                href={`tel:${company.phone}`}
                                                                onClick={(e) => e.stopPropagation()}
                                                                className="inline-flex items-center gap-1 text-[var(--elan-ink)] hover:text-emerald-700 font-medium"
                                                            >
                                                                <Phone className="w-3 h-3 text-emerald-600" />
                                                                {company.phone}
                                                            </a>
                                                            <button
                                                                type="button"
                                                                title="Copier le numéro"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleCopy(company.phone!, `phone-${company.id}`, "Standard");
                                                                }}
                                                                className="text-slate-400 hover:text-slate-600"
                                                            >
                                                                {copiedKey === `phone-${company.id}` ? (
                                                                    <Check className="w-3 h-3 text-emerald-600" />
                                                                ) : (
                                                                    <Copy className="w-3 h-3" />
                                                                )}
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <span className="text-slate-400">Standard non renseigné</span>
                                                    )}
                                                    {company.country && (
                                                        <span className="inline-flex items-center gap-1 text-slate-500">
                                                            <MapPin className="w-3 h-3 text-slate-400" />
                                                            {company.country}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Campagne / Liste */}
                                            <td className="py-3.5 px-4 align-middle">
                                                {company.list?.mission?.name || company.list?.name ? (
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-slate-100 text-slate-700 max-w-[160px] truncate">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                                                        <span className="truncate">{company.list?.mission?.name || company.list?.name}</span>
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-400">—</span>
                                                )}
                                            </td>

                                            {/* Décideurs Répertoriés */}
                                            <td className="py-3.5 px-4 align-middle">
                                                <div className="flex flex-col gap-1.5">
                                                    <div className="flex items-center gap-2">
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                            <Users className="w-3 h-3" />
                                                            {company.contacts.length} contact{company.contacts.length > 1 ? "s" : ""}
                                                        </span>
                                                        {company.contacts.some((c) => !!c.linkedin) && (
                                                            <span title="Profils LinkedIn disponibles" className="text-blue-600">
                                                                <Linkedin className="w-3.5 h-3.5" />
                                                            </span>
                                                        )}
                                                    </div>

                                                    {/* Contact snippets */}
                                                    {company.contacts.slice(0, 2).map((ct) => {
                                                        const name = [ct.firstName, ct.lastName].filter(Boolean).join(" ") || "Contact";
                                                        return (
                                                            <div key={ct.id} className="text-[11px] flex items-center gap-1.5 text-slate-600 truncate max-w-[200px]">
                                                                <span className="font-semibold text-slate-800 truncate">{name}</span>
                                                                {ct.title && <span className="text-slate-400 truncate">· {ct.title}</span>}
                                                            </div>
                                                        );
                                                    })}
                                                    {company.contacts.length > 2 && (
                                                        <span className="text-[10px] font-medium text-slate-400">
                                                            + {company.contacts.length - 2} autre{company.contacts.length - 2 > 1 ? "s" : ""}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Statut Prospection */}
                                            <td className="py-3.5 px-4 align-middle">
                                                {statusCfg ? (
                                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${statusCfg.bg} ${statusCfg.text}`}>
                                                        <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />
                                                        {statusCfg.label}
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] text-slate-400 bg-slate-50">
                                                        Non contacté
                                                    </span>
                                                )}
                                            </td>

                                            {/* Action / View Fiche */}
                                            <td className="py-3.5 px-4 align-middle text-right">
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleOpenDrawer(company);
                                                    }}
                                                    className="inline-flex items-center gap-1 p-2 rounded-xl text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 transition-all"
                                                    title="Ouvrir la fiche complète"
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
                </div>
            ) : viewMode === "cards" ? (
                /* MODE CARTES */
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {paginatedCompanies.map((company) => {
                        const latestAction = company.actions && company.actions[0];
                        const statusCfg = latestAction
                            ? ACTION_RESULT_MAP[latestAction.result] || { label: latestAction.result, bg: "bg-slate-100", text: "text-slate-700", dot: "bg-slate-400" }
                            : null;

                        return (
                            <div
                                key={company.id}
                                className="bg-[var(--elan-surface)] rounded-2xl border border-[var(--elan-line)] p-4 flex flex-col justify-between gap-4 hover:border-emerald-300 hover:shadow-lg hover:shadow-emerald-500/5 transition-all duration-200 group"
                            >
                                <div className="space-y-3">
                                    {/* Card Header */}
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex items-start gap-3 min-w-0">
                                            <div
                                                className={`w-11 h-11 rounded-2xl bg-gradient-to-tr ${getCompanyGradient(
                                                    company.name
                                                )} flex items-center justify-center font-bold text-sm shadow-xs shrink-0`}
                                            >
                                                {getInitials(company.name)}
                                            </div>
                                            <div className="min-w-0">
                                                <h3
                                                    onClick={() => handleOpenDrawer(company)}
                                                    className="font-bold text-sm sm:text-base text-[var(--elan-ink)] truncate cursor-pointer hover:text-emerald-700 transition-colors"
                                                >
                                                    {company.name}
                                                </h3>
                                                <div className="flex flex-wrap items-center gap-1.5 mt-0.5 text-xs text-slate-500">
                                                    {company.industry && (
                                                        <span className="font-medium text-slate-700">{company.industry}</span>
                                                    )}
                                                    {company.size && <span>· {company.size}</span>}
                                                    {company.country && (
                                                        <span className="inline-flex items-center gap-0.5 text-slate-500">
                                                            · <MapPin className="w-2.5 h-2.5" />
                                                            {company.country}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {statusCfg && (
                                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border shrink-0 ${statusCfg.bg} ${statusCfg.text}`}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />
                                                {statusCfg.label}
                                            </span>
                                        )}
                                    </div>

                                    {/* Phone & Website Bar */}
                                    <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-slate-600">
                                        {company.phone && (
                                            <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100">
                                                <Phone className="w-3 h-3 text-emerald-600" />
                                                <a href={`tel:${company.phone}`} className="hover:text-emerald-700 font-medium">
                                                    {company.phone}
                                                </a>
                                                <button
                                                    type="button"
                                                    title="Copier le numéro"
                                                    onClick={() => handleCopy(company.phone!, `phone-card-${company.id}`, "Numéro")}
                                                    className="text-slate-400 hover:text-slate-600"
                                                >
                                                    {copiedKey === `phone-card-${company.id}` ? (
                                                        <Check className="w-3 h-3 text-emerald-600" />
                                                    ) : (
                                                        <Copy className="w-3 h-3" />
                                                    )}
                                                </button>
                                            </div>
                                        )}
                                        {company.website && (
                                            <a
                                                href={company.website}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-1 text-emerald-600 hover:text-emerald-800 font-medium bg-emerald-50/50 hover:bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100 transition-colors"
                                            >
                                                <Globe2 className="w-3 h-3" />
                                                <span>{cleanWebsiteUrl(company.website)}</span>
                                                <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                                            </a>
                                        )}
                                    </div>

                                    {/* Campaign pill */}
                                    {(company.list?.mission?.name || company.list?.name) && (
                                        <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                                            <span className="font-medium">Campagne :</span>
                                            <span className="px-2 py-0.5 rounded-md bg-slate-100 font-medium text-slate-700 truncate">
                                                {company.list?.mission?.name || company.list?.name}
                                            </span>
                                        </div>
                                    )}

                                    {/* Contacts Accordion / Roster */}
                                    <div className="border-t border-slate-100 pt-2.5">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                                                <Users className="w-3.5 h-3.5 text-emerald-600" />
                                                Décideurs ({company.contacts.length})
                                            </span>
                                        </div>

                                        <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                                            {company.contacts.length === 0 ? (
                                                <p className="text-xs text-slate-400 italic">Aucun décideur référencé pour le moment</p>
                                            ) : (
                                                company.contacts.map((ct) => {
                                                    const name = [ct.firstName, ct.lastName].filter(Boolean).join(" ") || "Contact";
                                                    return (
                                                        <div
                                                            key={ct.id}
                                                            className="p-2 rounded-xl bg-slate-50/80 border border-slate-100 hover:bg-slate-100/80 transition-colors space-y-1"
                                                        >
                                                            <div className="flex items-center justify-between gap-1">
                                                                <div className="min-w-0">
                                                                    <p className="text-xs font-bold text-slate-800 truncate">{name}</p>
                                                                    {ct.title && (
                                                                        <p className="text-[11px] text-slate-500 truncate">{ct.title}</p>
                                                                    )}
                                                                </div>
                                                                {ct.linkedin && (
                                                                    <a
                                                                        href={ct.linkedin}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        className="p-1 rounded text-blue-600 hover:bg-blue-50 transition-colors"
                                                                        title="Voir le profil LinkedIn"
                                                                    >
                                                                        <Linkedin className="w-3.5 h-3.5" />
                                                                    </a>
                                                                )}
                                                            </div>

                                                            {/* Contact action links */}
                                                            <div className="flex flex-wrap items-center gap-2 pt-0.5 text-[11px]">
                                                                {ct.email && (
                                                                    <div className="flex items-center gap-1 text-slate-600 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                                                                        <a
                                                                            href={`mailto:${ct.email}`}
                                                                            className="hover:text-emerald-700 flex items-center gap-1 font-medium truncate max-w-[150px]"
                                                                        >
                                                                            <Mail className="w-2.5 h-2.5 text-slate-400" />
                                                                            <span className="truncate">{ct.email}</span>
                                                                        </a>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => handleCopy(ct.email!, `mail-${ct.id}`, "Email")}
                                                                            title="Copier l'email"
                                                                            className="text-slate-400 hover:text-slate-700"
                                                                        >
                                                                            {copiedKey === `mail-${ct.id}` ? (
                                                                                <Check className="w-2.5 h-2.5 text-emerald-600" />
                                                                            ) : (
                                                                                <Copy className="w-2.5 h-2.5" />
                                                                            )}
                                                                        </button>
                                                                    </div>
                                                                )}
                                                                {ct.phone && (
                                                                    <div className="flex items-center gap-1 text-slate-600 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                                                                        <a
                                                                            href={`tel:${ct.phone}`}
                                                                            className="hover:text-emerald-700 flex items-center gap-1 font-medium"
                                                                        >
                                                                            <Phone className="w-2.5 h-2.5 text-slate-400" />
                                                                            <span>{ct.phone}</span>
                                                                        </a>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => handleCopy(ct.phone!, `ct-phone-${ct.id}`, "Ligne directe")}
                                                                            title="Copier le numéro"
                                                                            className="text-slate-400 hover:text-slate-700"
                                                                        >
                                                                            {copiedKey === `ct-phone-${ct.id}` ? (
                                                                                <Check className="w-2.5 h-2.5 text-emerald-600" />
                                                                            ) : (
                                                                                <Copy className="w-2.5 h-2.5" />
                                                                            )}
                                                                        </button>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                })
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Card Footer Button */}
                                <button
                                    type="button"
                                    onClick={() => handleOpenDrawer(company)}
                                    className="w-full mt-2 py-2 px-3 rounded-xl border border-[var(--elan-line)] bg-slate-50 hover:bg-emerald-50 text-xs font-semibold text-slate-700 hover:text-emerald-700 flex items-center justify-center gap-1.5 transition-all"
                                >
                                    <Eye className="w-3.5 h-3.5" />
                                    <span>Consulter la fiche détaillée</span>
                                </button>
                            </div>
                        );
                    })}
                </div>
            ) : (
                /* MODE DECIDEURS DIRECTORY */
                <div className="bg-[var(--elan-surface)] rounded-2xl border border-[var(--elan-line)] overflow-hidden shadow-xs">
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-left border-collapse text-xs">
                            <thead>
                                <tr className="bg-[var(--elan-paper)] border-b border-[var(--elan-line)] text-[11px] font-bold text-[var(--elan-slate)] uppercase tracking-wider">
                                    <th className="py-3.5 px-4">Décideur</th>
                                    <th className="py-3.5 px-4">Poste / Fonction</th>
                                    <th className="py-3.5 px-4">Entreprise</th>
                                    <th className="py-3.5 px-4">Email Direct</th>
                                    <th className="py-3.5 px-4">Ligne Directe</th>
                                    <th className="py-3.5 px-4">LinkedIn</th>
                                    <th className="py-3.5 px-4">Campagne</th>
                                    <th className="py-3.5 px-4 text-right">Fiche</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--elan-line)]">
                                {paginatedContacts.map(({ contact, company }) => {
                                    const fullName = [contact.firstName, contact.lastName].filter(Boolean).join(" ") || "Contact";

                                    return (
                                        <tr
                                            key={`${company.id}-${contact.id}`}
                                            className="hover:bg-emerald-50/25 transition-colors cursor-pointer group"
                                            onClick={() => handleOpenDrawer(company)}
                                        >
                                            {/* Décideur */}
                                            <td className="py-3.5 px-4 align-middle">
                                                <div className="flex items-center gap-2.5">
                                                    <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs shrink-0">
                                                        {getInitials(fullName)}
                                                    </div>
                                                    <span className="font-bold text-[var(--elan-ink)] text-xs sm:text-sm group-hover:text-emerald-700 transition-colors">
                                                        {fullName}
                                                    </span>
                                                </div>
                                            </td>

                                            {/* Poste */}
                                            <td className="py-3.5 px-4 align-middle font-medium text-slate-700">
                                                {contact.title || <span className="text-slate-400">—</span>}
                                            </td>

                                            {/* Entreprise */}
                                            <td className="py-3.5 px-4 align-middle font-semibold text-[var(--elan-ink)]">
                                                <div className="flex items-center gap-1.5">
                                                    <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                                    <span className="truncate max-w-[160px]">{company.name}</span>
                                                </div>
                                            </td>

                                            {/* Email */}
                                            <td className="py-3.5 px-4 align-middle">
                                                {contact.email ? (
                                                    <div className="flex items-center gap-1.5">
                                                        <a
                                                            href={`mailto:${contact.email}`}
                                                            onClick={(e) => e.stopPropagation()}
                                                            className="text-emerald-700 hover:underline font-medium truncate max-w-[180px]"
                                                        >
                                                            {contact.email}
                                                        </a>
                                                        <button
                                                            type="button"
                                                            title="Copier l'email"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleCopy(contact.email!, `dir-mail-${contact.id}`, "Email");
                                                            }}
                                                            className="text-slate-400 hover:text-slate-700"
                                                        >
                                                            {copiedKey === `dir-mail-${contact.id}` ? (
                                                                <Check className="w-3 h-3 text-emerald-600" />
                                                            ) : (
                                                                <Copy className="w-3 h-3" />
                                                            )}
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <span className="text-slate-400">—</span>
                                                )}
                                            </td>

                                            {/* Phone */}
                                            <td className="py-3.5 px-4 align-middle">
                                                {contact.phone ? (
                                                    <div className="flex items-center gap-1.5">
                                                        <a
                                                            href={`tel:${contact.phone}`}
                                                            onClick={(e) => e.stopPropagation()}
                                                            className="text-slate-800 hover:text-emerald-700 font-medium whitespace-nowrap"
                                                        >
                                                            {contact.phone}
                                                        </a>
                                                        <button
                                                            type="button"
                                                            title="Copier le numéro"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleCopy(contact.phone!, `dir-ph-${contact.id}`, "Ligne directe");
                                                            }}
                                                            className="text-slate-400 hover:text-slate-700"
                                                        >
                                                            {copiedKey === `dir-ph-${contact.id}` ? (
                                                                <Check className="w-3 h-3 text-emerald-600" />
                                                            ) : (
                                                                <Copy className="w-3 h-3" />
                                                            )}
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <span className="text-slate-400">—</span>
                                                )}
                                            </td>

                                            {/* LinkedIn */}
                                            <td className="py-3.5 px-4 align-middle">
                                                {contact.linkedin ? (
                                                    <a
                                                        href={contact.linkedin}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        onClick={(e) => e.stopPropagation()}
                                                        className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 hover:underline font-semibold"
                                                    >
                                                        <Linkedin className="w-3.5 h-3.5" />
                                                        <span>Profil</span>
                                                    </a>
                                                ) : (
                                                    <span className="text-slate-400">—</span>
                                                )}
                                            </td>

                                            {/* Campagne */}
                                            <td className="py-3.5 px-4 align-middle text-slate-500">
                                                <span className="truncate max-w-[130px] block">
                                                    {company.list?.mission?.name || company.list?.name || "—"}
                                                </span>
                                            </td>

                                            {/* Actions */}
                                            <td className="py-3.5 px-4 align-middle text-right">
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleOpenDrawer(company);
                                                    }}
                                                    className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 transition-all"
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
                </div>
            )}

            {/* ============================================================ */}
            {/* PAGINATION FOOTER */}
            {/* ============================================================ */}
            {totalItems > 0 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
                    <div className="flex items-center gap-3 text-xs text-[var(--elan-slate)]">
                        <span>
                            Affichage de{" "}
                            <strong className="text-[var(--elan-ink)] font-semibold">
                                {Math.min(totalItems, (page - 1) * pageSize + 1)}
                            </strong>{" "}
                            à{" "}
                            <strong className="text-[var(--elan-ink)] font-semibold">
                                {Math.min(totalItems, page * pageSize)}
                            </strong>{" "}
                            sur <strong className="text-[var(--elan-ink)] font-semibold">{totalItems}</strong>{" "}
                            {viewMode === "contacts" ? "décideurs" : "entreprises"}
                        </span>

                        <div className="flex items-center gap-1.5 ml-2">
                            <span>Par page :</span>
                            <select
                                value={pageSize}
                                onChange={(e) => {
                                    setPageSize(Number(e.target.value));
                                    setPage(1);
                                }}
                                className="h-7 px-2 rounded-lg border border-[var(--elan-line)] bg-[var(--elan-surface)] text-xs font-semibold cursor-pointer"
                            >
                                <option value={10}>10</option>
                                <option value={25}>25</option>
                                <option value={50}>50</option>
                                <option value={100}>100</option>
                            </select>
                        </div>
                    </div>

                    {totalPages > 1 && (
                        <div className="flex items-center gap-1">
                            <button
                                type="button"
                                onClick={() => setPage((p) => Math.max(1, p - 1))}
                                disabled={page <= 1}
                                className="px-3 py-1.5 rounded-lg border border-[var(--elan-line)] bg-[var(--elan-surface)] text-xs font-semibold text-[var(--elan-slate)] hover:text-[var(--elan-ink)] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                            >
                                Précédent
                            </button>

                            <div className="flex items-center gap-1 px-2 text-xs font-semibold text-[var(--elan-slate)]">
                                Page <span className="text-[var(--elan-ink)] px-1">{page}</span> sur {totalPages}
                            </div>

                            <button
                                type="button"
                                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                disabled={page >= totalPages}
                                className="px-3 py-1.5 rounded-lg border border-[var(--elan-line)] bg-[var(--elan-surface)] text-xs font-semibold text-[var(--elan-slate)] hover:text-[var(--elan-ink)] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                            >
                                Suivant
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* ============================================================ */}
            {/* SLIDE-OVER DRAWER: FICHE ENTREPRISE & DECIDEURS */}
            {/* ============================================================ */}
            {/* ============================================================ */}
            {/* FULL-SCREEN DOSSIER / SLIDE-OVER: FICHE ENTREPRISE & DECIDEURS */}
            {/* ============================================================ */}
            {mounted && isDrawerOpen && selectedCompany && createPortal(
                <div className="fixed inset-0 z-[9999] overflow-hidden flex justify-end">
                    {/* Full-screen Backdrop */}
                    <div
                        onClick={handleCloseDrawer}
                        className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
                    />

                    {/* Full-screen Drawer Panel */}
                    <div className={`relative w-full ${isFullScreen ? "max-w-full" : "max-w-4xl lg:max-w-5xl"} bg-[var(--elan-surface)] shadow-2xl h-full flex flex-col z-10 transition-all duration-300 animate-in slide-in-from-right`}>
                        {/* Drawer Top Header */}
                        <div className="px-6 py-4 border-b border-[var(--elan-line)] flex items-center justify-between gap-4 bg-[var(--elan-paper)] shrink-0">
                            <div className="flex items-center gap-3.5 min-w-0">
                                <button
                                    type="button"
                                    onClick={handleCloseDrawer}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[var(--elan-line)] bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 hover:text-emerald-700 transition-all shadow-xs cursor-pointer shrink-0"
                                >
                                    <ArrowLeft className="w-3.5 h-3.5" />
                                    <span>Retour</span>
                                </button>

                                <div className="h-6 w-px bg-slate-200 shrink-0 hidden sm:block" />

                                <div className="flex items-center gap-3 min-w-0">
                                    <div
                                        className={`w-10 h-10 rounded-xl bg-gradient-to-tr ${getCompanyGradient(
                                            selectedCompany.name
                                        )} flex items-center justify-center text-sm font-bold shadow-xs text-white shrink-0`}
                                    >
                                        {getInitials(selectedCompany.name)}
                                    </div>
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2">
                                            <h2 className="text-base sm:text-lg font-bold text-[var(--elan-ink)] tracking-tight truncate">
                                                {selectedCompany.name}
                                            </h2>
                                            {selectedCompany.status && (
                                                <span className="hidden sm:inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                    {selectedCompany.status}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
                                            {selectedCompany.industry && (
                                                <span className="font-medium text-slate-700">
                                                    {selectedCompany.industry}
                                                </span>
                                            )}
                                            {selectedCompany.size && <span>· {selectedCompany.size}</span>}
                                            {selectedCompany.country && (
                                                <span className="inline-flex items-center gap-1">
                                                    · <MapPin className="w-3 h-3 text-slate-400" />
                                                    {selectedCompany.country}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Header Actions */}
                            <div className="flex items-center gap-2 shrink-0">
                                <button
                                    type="button"
                                    onClick={() => setIsFullScreen(!isFullScreen)}
                                    title={isFullScreen ? "Réduire la largeur" : "Plein écran"}
                                    className="hidden md:inline-flex items-center gap-1 p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 transition-colors"
                                >
                                    {isFullScreen ? (
                                        <Minimize2 className="w-4 h-4" />
                                    ) : (
                                        <Maximize2 className="w-4 h-4" />
                                    )}
                                </button>

                                <button
                                    type="button"
                                    onClick={handleCloseDrawer}
                                    title="Fermer (Échap)"
                                    className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        {/* Drawer Scrollable Body */}
                        <div className="flex-1 overflow-y-auto p-6 md:p-8">
                            <div className={`mx-auto w-full ${isFullScreen ? "max-w-7xl" : ""} grid grid-cols-1 lg:grid-cols-12 gap-6`}>
                                {/* LEFT COLUMN: Company Details & Overview (5 cols) */}
                                <div className="lg:col-span-5 space-y-5">
                                    {/* Quick action buttons */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2.5">
                                        {selectedCompany.website && (
                                            <a
                                                href={selectedCompany.website}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center gap-2 p-3 rounded-xl border border-[var(--elan-line)] bg-[var(--elan-paper)] hover:border-emerald-300 hover:bg-emerald-50/50 transition-all text-xs font-semibold text-emerald-700"
                                            >
                                                <Globe2 className="w-4 h-4 shrink-0" />
                                                <span className="truncate">Visiter le site ({cleanWebsiteUrl(selectedCompany.website)})</span>
                                                <ArrowUpRight className="w-3.5 h-3.5 ml-auto opacity-60" />
                                            </a>
                                        )}

                                        {selectedCompany.phone && (
                                            <div className="flex items-center justify-between p-3 rounded-xl border border-[var(--elan-line)] bg-[var(--elan-paper)] text-xs font-semibold text-slate-800">
                                                <a
                                                    href={`tel:${selectedCompany.phone}`}
                                                    className="flex items-center gap-2 hover:text-emerald-700 truncate"
                                                >
                                                    <Phone className="w-4 h-4 text-emerald-600 shrink-0" />
                                                    <span className="truncate">Standard : {selectedCompany.phone}</span>
                                                </a>
                                                <button
                                                    type="button"
                                                    title="Copier le numéro"
                                                    onClick={() => handleCopy(selectedCompany.phone!, "drawer-std-phone", "Standard")}
                                                    className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
                                                >
                                                    {copiedKey === "drawer-std-phone" ? (
                                                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                                                    ) : (
                                                        <Copy className="w-3.5 h-3.5" />
                                                    )}
                                                </button>
                                            </div>
                                        )}

                                        <button
                                            type="button"
                                            onClick={() => {
                                                const emails = selectedCompany.contacts.map((c) => c.email).filter(Boolean);
                                                if (emails.length > 0) {
                                                    handleCopy(emails.join("; "), "all-emails", "Tous les emails");
                                                } else {
                                                    showError("Emails", "Aucun email disponible pour cette entreprise");
                                                }
                                            }}
                                            className="flex items-center gap-2 p-3 rounded-xl border border-[var(--elan-line)] bg-[var(--elan-paper)] hover:border-slate-300 hover:bg-slate-100 transition-all text-xs font-semibold text-slate-700 cursor-pointer"
                                        >
                                            <Copy className="w-4 h-4 shrink-0 text-slate-500" />
                                            <span className="truncate">Copier tous les emails ({selectedCompany.contacts.filter(c => !!c.email).length})</span>
                                        </button>
                                    </div>

                                    {/* Section: Informations Générales */}
                                    <div className="bg-[var(--elan-paper)] rounded-2xl border border-[var(--elan-line)] p-5 space-y-4">
                                        <h4 className="text-xs font-bold text-[var(--elan-slate)] uppercase tracking-wider flex items-center gap-1.5">
                                            <Building2 className="w-4 h-4 text-emerald-600" />
                                            Informations du Compte
                                        </h4>
                                        <div className="space-y-3 text-xs">
                                            <div className="flex justify-between items-center py-1.5 border-b border-slate-200/60">
                                                <span className="text-slate-500">Campagne / Liste</span>
                                                <span className="font-semibold text-slate-800 text-right">
                                                    {selectedCompany.list?.mission?.name || selectedCompany.list?.name || "Non assigné"}
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-center py-1.5 border-b border-slate-200/60">
                                                <span className="text-slate-500">Secteur d&apos;activité</span>
                                                <span className="font-semibold text-slate-800 text-right">
                                                    {selectedCompany.industry || "—"}
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-center py-1.5 border-b border-slate-200/60">
                                                <span className="text-slate-500">Effectif / Taille</span>
                                                <span className="font-semibold text-slate-800 text-right">
                                                    {selectedCompany.size || "—"}
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-center py-1.5 border-b border-slate-200/60">
                                                <span className="text-slate-500">Localisation / Pays</span>
                                                <span className="font-semibold text-slate-800 text-right">
                                                    {selectedCompany.country || "—"}
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-center py-1.5">
                                                <span className="text-slate-500">Date d&apos;ajout</span>
                                                <span className="font-semibold text-slate-800 text-right">
                                                    {selectedCompany.createdAt ? new Date(selectedCompany.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }) : "—"}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Section: Historique de prospection SDR */}
                                    <div className="bg-[var(--elan-paper)] rounded-2xl border border-[var(--elan-line)] p-5 space-y-3">
                                        <h4 className="text-xs font-bold text-[var(--elan-slate)] uppercase tracking-wider flex items-center gap-1.5">
                                            <PhoneCall className="w-3.5 h-3.5 text-slate-500" />
                                            État de prospection
                                        </h4>
                                        {selectedCompany.actions && selectedCompany.actions.length > 0 ? (
                                            <div className="space-y-2">
                                                {selectedCompany.actions.map((act) => {
                                                    const cfg = ACTION_RESULT_MAP[act.result] || { label: act.result, bg: "bg-slate-100", text: "text-slate-700", dot: "bg-slate-400" };
                                                    return (
                                                        <div
                                                            key={act.id}
                                                            className="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-200 text-xs"
                                                        >
                                                            <div className="flex items-center gap-2">
                                                                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-semibold border ${cfg.bg} ${cfg.text}`}>
                                                                    <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                                                                    {cfg.label}
                                                                </span>
                                                                <span className="text-slate-500 font-medium">via {act.channel}</span>
                                                            </div>
                                                            <span className="text-slate-400 text-[11px]">
                                                                {new Date(act.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                                                            </span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        ) : (
                                            <p className="text-xs text-slate-500 leading-relaxed">
                                                Ce compte n&apos;a pas encore fait l&apos;objet d&apos;un appel ou d&apos;une interaction répertoriée.
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {/* RIGHT COLUMN: Decision Makers / Contacts (7 cols) */}
                                <div className="lg:col-span-7 space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h4 className="text-xs font-bold text-[var(--elan-slate)] uppercase tracking-wider flex items-center gap-1.5">
                                            <Users className="w-4 h-4 text-emerald-600" />
                                            Décideurs Référencés ({selectedCompany.contacts.length})
                                        </h4>
                                        <span className="text-xs text-slate-500">
                                            {selectedCompany.contacts.filter(c => !!c.phone).length} avec téléphone · {selectedCompany.contacts.filter(c => !!c.email).length} avec email
                                        </span>
                                    </div>

                                    {selectedCompany.contacts.length === 0 ? (
                                        <div className="p-8 rounded-2xl border border-dashed border-slate-200 text-center text-xs text-slate-400">
                                            Aucun décideur renseigné pour ce compte.
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {selectedCompany.contacts.map((contact) => {
                                                const name = [contact.firstName, contact.lastName].filter(Boolean).join(" ") || "Contact";

                                                return (
                                                    <div
                                                        key={contact.id}
                                                        className="p-4 rounded-2xl border border-[var(--elan-line)] bg-[var(--elan-paper)] hover:border-emerald-300 transition-all space-y-3"
                                                    >
                                                        <div className="flex items-start justify-between gap-3">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-11 h-11 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-sm">
                                                                    {getInitials(name)}
                                                                </div>
                                                                <div>
                                                                    <h5 className="font-bold text-sm sm:text-base text-[var(--elan-ink)]">
                                                                        {name}
                                                                    </h5>
                                                                    {contact.title ? (
                                                                        <p className="text-xs text-[var(--elan-slate)] font-medium">
                                                                            {contact.title}
                                                                        </p>
                                                                    ) : (
                                                                        <p className="text-xs text-slate-400 italic">Fonction non précisée</p>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            {contact.linkedin && (
                                                                <a
                                                                    href={contact.linkedin}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-xl border border-blue-100 transition-colors"
                                                                >
                                                                    <Linkedin className="w-3.5 h-3.5" />
                                                                    <span>LinkedIn</span>
                                                                </a>
                                                            )}
                                                        </div>

                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 border-t border-slate-200/60 text-xs">
                                                            {contact.email ? (
                                                                <div className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-slate-200">
                                                                    <a
                                                                        href={`mailto:${contact.email}`}
                                                                        className="flex items-center gap-1.5 font-medium text-emerald-700 hover:underline truncate"
                                                                    >
                                                                        <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                                                        <span className="truncate">{contact.email}</span>
                                                                    </a>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleCopy(contact.email!, `drawer-mail-${contact.id}`, "Email")}
                                                                        title="Copier l'email"
                                                                        className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
                                                                    >
                                                                        {copiedKey === `drawer-mail-${contact.id}` ? (
                                                                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                                                                        ) : (
                                                                            <Copy className="w-3.5 h-3.5" />
                                                                        )}
                                                                    </button>
                                                                </div>
                                                            ) : (
                                                                <div className="flex items-center gap-1.5 p-2.5 rounded-xl bg-white border border-dashed border-slate-200 text-slate-400">
                                                                    <Mail className="w-3.5 h-3.5" />
                                                                    <span>Email non renseigné</span>
                                                                </div>
                                                            )}

                                                            {contact.phone ? (
                                                                <div className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-slate-200">
                                                                    <a
                                                                        href={`tel:${contact.phone}`}
                                                                        className="flex items-center gap-1.5 font-medium text-slate-800 hover:text-emerald-700 truncate"
                                                                    >
                                                                        <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                                                        <span>{contact.phone}</span>
                                                                    </a>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleCopy(contact.phone!, `drawer-ph-${contact.id}`, "Numéro")}
                                                                        title="Copier le numéro"
                                                                        className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
                                                                    >
                                                                        {copiedKey === `drawer-ph-${contact.id}` ? (
                                                                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                                                                        ) : (
                                                                            <Copy className="w-3.5 h-3.5" />
                                                                        )}
                                                                    </button>
                                                                </div>
                                                            ) : (
                                                                <div className="flex items-center gap-1.5 p-2.5 rounded-xl bg-white border border-dashed border-slate-200 text-slate-400">
                                                                    <Phone className="w-3.5 h-3.5" />
                                                                    <span>Ligne directe non renseignée</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Drawer Bottom Footer */}
                        <div className="p-4 border-t border-[var(--elan-line)] bg-[var(--elan-paper)] flex items-center justify-between gap-3 shrink-0">
                            <button
                                type="button"
                                onClick={() => {
                                    const c = selectedCompany;
                                    const header = "Entreprise;Contact;Poste;Email;Telephone;LinkedIn\n";
                                    const lines = c.contacts.map((ct) => {
                                        const cName = [ct.firstName, ct.lastName].filter(Boolean).join(" ");
                                        return `"${c.name}";"${cName}";"${ct.title || ""}";"${ct.email || ""}";"${ct.phone || ""}";"${ct.linkedin || ""}"`;
                                    }).join("\n");
                                    const blob = new Blob(["\uFEFF" + header + lines], { type: "text/csv;charset=utf-8;" });
                                    const url = URL.createObjectURL(blob);
                                    const link = document.createElement("a");
                                    link.href = url;
                                    link.download = `fiche_${c.name.replace(/[^a-zA-Z0-9]/g, "_")}.csv`;
                                    link.click();
                                    showSuccess("Fiche exportée", "Fichier CSV téléchargé avec succès.");
                                }}
                                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition-all shadow-xs cursor-pointer"
                            >
                                <Download className="w-3.5 h-3.5" />
                                <span>Exporter cette fiche</span>
                            </button>

                            <button
                                type="button"
                                onClick={handleCloseDrawer}
                                className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 transition-all shadow-xs cursor-pointer"
                            >
                                Fermer (Échap)
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}
