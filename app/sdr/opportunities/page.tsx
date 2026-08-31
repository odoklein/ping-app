"use client";

import { useState, useEffect } from "react";
import { Card, Badge, Button } from "@/components/ui";
import {
    Briefcase,
    Building2,
    User,
    Clock,
    TrendingUp,
    Calendar,
    ChevronRight,
    Loader2,
    Sparkles,
    DollarSign,
    ArrowUpRight,
    Filter,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ============================================
// TYPES
// ============================================

interface Opportunity {
    id: string;
    needSummary: string;
    urgency: "SHORT" | "MEDIUM" | "LONG";
    estimatedMin: number | null;
    estimatedMax: number | null;
    handedOff: boolean;
    handedOffAt: string | null;
    notes: string | null;
    createdAt: string;
    contact: {
        id: string;
        firstName: string | null;
        lastName: string | null;
        title: string | null;
        email: string | null;
    };
    company: {
        id: string;
        name: string;
        industry: string | null;
    };
}

// ============================================
// URGENCY STYLES
// ============================================

const URGENCY_STYLES = {
    SHORT: { label: "Court terme", color: "bg-red-50 text-red-600", icon: "🔴" },
    MEDIUM: { label: "Moyen terme", color: "bg-amber-50 text-amber-600", icon: "🟠" },
    LONG: { label: "Long terme", color: "bg-emerald-50 text-emerald-600", icon: "🟢" },
};

// ============================================
// SDR OPPORTUNITIES PAGE
// ============================================

export default function SDROpportunitiesPage() {
    const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filter, setFilter] = useState<"all" | "pending" | "handed_off">("all");

    // ============================================
    // FETCH OPPORTUNITIES
    // ============================================

    useEffect(() => {
        const fetchOpportunities = async () => {
            setIsLoading(true);
            try {
                const res = await fetch("/api/opportunities");
                const json = await res.json();
                if (json.success) {
                    setOpportunities(json.data);
                }
            } catch (err) {
                console.error("Failed to fetch opportunities:", err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchOpportunities();
    }, []);

    // ============================================
    // FILTER OPPORTUNITIES
    // ============================================

    const filteredOpportunities = opportunities.filter(opp => {
        if (filter === "pending") return !opp.handedOff;
        if (filter === "handed_off") return opp.handedOff;
        return true;
    });

    // ============================================
    // STATS
    // ============================================

    const stats = {
        total: opportunities.length,
        pending: opportunities.filter(o => !o.handedOff).length,
        handedOff: opportunities.filter(o => o.handedOff).length,
        totalValue: opportunities.reduce((acc, o) => {
            const avg = ((o.estimatedMin || 0) + (o.estimatedMax || 0)) / 2;
            return acc + avg;
        }, 0),
    };

    // ============================================
    // FORMAT CURRENCY
    // ============================================

    const formatCurrency = (value: number) => {
        if (value >= 1000000) {
            return `${(value / 1000000).toFixed(1)}M€`;
        }
        if (value >= 1000) {
            return `${(value / 1000).toFixed(0)}K€`;
        }
        return `${value}€`;
    };

    // ============================================
    // LOADING STATE
    // ============================================

    if (isLoading) {
        return (
            <div className="elan-page items-center justify-center py-20">
                <div className="text-center">
                <Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin text-[#0C3B38] motion-reduce:animate-none" />
                    <p className="text-slate-500">Chargement des opportunités...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="elan-page animate-fade-in">
            {/* Header */}
            <div>
                <h1 className="text-xl font-bold text-slate-900">Opportunités</h1>
                <p className="text-sm text-slate-500 mt-1">
                    Prospects intéressés identifiés lors de vos actions
                </p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-3">
                <Card className="!p-4">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#E5EFEC]">
                            <Briefcase className="h-5 w-5 text-[#0C3B38]" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
                            <p className="text-xs text-slate-500">Total</p>
                        </div>
                    </div>
                </Card>

                <Card className="!p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                            <DollarSign className="w-5 h-5 text-emerald-500" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-emerald-600">
                                {formatCurrency(stats.totalValue)}
                            </p>
                            <p className="text-xs text-slate-500">Valeur estimée</p>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-2 p-1 bg-slate-100 rounded-xl">
                {[
                    { value: "all", label: "Tous", count: stats.total },
                    { value: "pending", label: "En attente", count: stats.pending },
                    { value: "handed_off", label: "Transmis", count: stats.handedOff },
                ].map((tab) => (
                    <button
                        key={tab.value}
                        onClick={() => setFilter(tab.value as typeof filter)}
                        className={cn(
                            "flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all",
                            filter === tab.value
                                ? "bg-white text-slate-900 shadow-sm"
                                : "text-slate-500 hover:text-slate-700"
                        )}
                    >
                        {tab.label}
                        <span className={cn(
                            "ml-1.5 px-1.5 py-0.5 rounded-full text-xs",
                            filter === tab.value
                                ? "bg-indigo-100 text-indigo-600"
                                : "bg-slate-200 text-slate-500"
                        )}>
                            {tab.count}
                        </span>
                    </button>
                ))}
            </div>

            {/* Opportunities List */}
            {filteredOpportunities.length === 0 ? (
                <Card className="text-center py-12">
                    <Briefcase className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-slate-700">
                        {filter === "all"
                            ? "Aucune opportunité"
                            : filter === "pending"
                                ? "Aucune opportunité en attente"
                                : "Aucune opportunité transmise"}
                    </h3>
                    <p className="text-slate-500 mt-1">
                        {filter === "all"
                            ? "Les opportunités apparaîtront ici quand vous identifierez des prospects intéressés"
                            : "Changez de filtre pour voir d'autres opportunités"}
                    </p>
                </Card>
            ) : (
                <div className="space-y-3">
                    {filteredOpportunities.map((opp) => (
                        <Card
                            key={opp.id}
                            className={cn(
                                "!p-4 transition-all",
                                opp.handedOff ? "opacity-75" : "hover:border-[#AFC5BF]"
                            )}
                        >
                            {/* Header */}
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                                        <Building2 className="w-5 h-5 text-slate-500" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-slate-900">{opp.company.name}</h3>
                                        <p className="text-xs text-slate-500">
                                            {opp.contact.firstName} {opp.contact.lastName}
                                            {opp.contact.title && ` · ${opp.contact.title}`}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className={cn(
                                        "text-xs px-2 py-1 rounded-full",
                                        URGENCY_STYLES[opp.urgency].color
                                    )}>
                                        {URGENCY_STYLES[opp.urgency].icon} {URGENCY_STYLES[opp.urgency].label}
                                    </span>
                                    {opp.handedOff && (
                                        <Badge variant="success">Transmis</Badge>
                                    )}
                                </div>
                            </div>

                            {/* Need Summary */}
                            <div className="p-3 bg-slate-50 rounded-lg mb-3">
                                <p className="text-sm text-slate-700 line-clamp-2">{opp.needSummary}</p>
                            </div>

                            {/* Footer */}
                            <div className="flex items-center justify-between text-xs text-slate-500">
                                <div className="flex items-center gap-4">
                                    {(opp.estimatedMin || opp.estimatedMax) && (
                                        <span className="flex items-center gap-1">
                                            <DollarSign className="w-3 h-3" />
                                            {opp.estimatedMin && opp.estimatedMax
                                                ? `${formatCurrency(opp.estimatedMin)} - ${formatCurrency(opp.estimatedMax)}`
                                                : formatCurrency(opp.estimatedMin || opp.estimatedMax || 0)}
                                        </span>
                                    )}
                                    <span className="flex items-center gap-1">
                                        <Calendar className="w-3 h-3" />
                                        {new Date(opp.createdAt).toLocaleDateString("fr-FR")}
                                    </span>
                                </div>
                                {opp.handedOff && opp.handedOffAt && (
                                    <span className="flex items-center gap-1 text-emerald-600">
                                        <ArrowUpRight className="w-3 h-3" />
                                        Transmis le {new Date(opp.handedOffAt).toLocaleDateString("fr-FR")}
                                    </span>
                                )}
                            </div>
                        </Card>
                    ))}
                </div>
            )}

            {/* Empty state motivation */}
            {opportunities.length === 0 && (
                <Card className="!border-[#D7E3DF] !bg-[#F0F5F3] !p-4">
                    <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-[#DBE4DF]">
                            <Sparkles className="h-5 w-5 text-[#0C3B38]" />
                        </div>
                        <div>
                            <h3 className="font-medium text-[#173F3A]">Créez vos premières opportunités</h3>
                            <p className="mt-1 text-sm text-[#2F6B62]">
                                Lorsque vous marquez un contact comme "Intéressé" avec une note descriptive,
                                une opportunité est automatiquement créée ici.
                            </p>
                        </div>
                    </div>
                </Card>
            )}
        </div>
    );
}
