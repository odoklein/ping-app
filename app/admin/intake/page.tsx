"use client";

import { useCallback, useEffect, useState } from "react";
import { Bug, Lightbulb, LifeBuoy } from "lucide-react";
import { PageHeader, Badge, Select, DataTable, EmptyState } from "@/components/ui";
import type { Column } from "@/components/ui";
import { TriageDetailDrawer } from "./_components/TriageDetailDrawer";

interface Ticket {
    id: string;
    type: "BUG" | "FEATURE_REQUEST";
    title: string;
    description: string;
    severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
    status: "NEW" | "IN_REVIEW" | "CONVERTED" | "FAST_LANE" | "DUPLICATE" | "REJECTED";
    sourceRoute: string;
    userAgent: string;
    viewport: string | null;
    reportedBy: { id: string; name: string; email: string; role: string };
    files: { id: string; originalName: string; url: string | null }[];
    createdAt: string;
    rejectionReason: string | null;
    convertedTask: { id: string; title: string } | null;
    linkedTask: { id: string; title: string } | null;
}

const STATUS_OPTIONS = [
    { value: "", label: "Tous les statuts" },
    { value: "NEW,IN_REVIEW", label: "À trier" },
    { value: "NEW", label: "Nouveau" },
    { value: "CONVERTED,FAST_LANE", label: "Converti" },
    { value: "DUPLICATE", label: "Doublon" },
    { value: "REJECTED", label: "Rejeté" },
];

const SEVERITY_VARIANT: Record<string, "default" | "warning" | "danger"> = {
    LOW: "default",
    MEDIUM: "warning",
    HIGH: "warning",
    CRITICAL: "danger",
};

const STATUS_LABEL: Record<string, string> = {
    NEW: "Nouveau",
    IN_REVIEW: "En revue",
    CONVERTED: "Converti",
    FAST_LANE: "Fast-Lane",
    DUPLICATE: "Doublon",
    REJECTED: "Rejeté",
};

export default function IntakeTriagePage() {
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState("NEW,IN_REVIEW");
    const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);

    const loadTickets = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (statusFilter) params.set("status", statusFilter);
            const res = await fetch(`/api/intake?${params.toString()}`, { cache: "no-store" });
            const json = await res.json();
            if (json.success) {
                setTickets(json.data);
            }
        } finally {
            setLoading(false);
        }
    }, [statusFilter]);

    useEffect(() => {
        void loadTickets();
    }, [loadTickets]);

    const columns: Column<Ticket>[] = [
        {
            key: "title",
            header: "Ticket",
            sortable: true,
            render: (_v, row) => (
                <div className="flex items-center gap-2 min-w-0">
                    {row.type === "BUG" ? (
                        <Bug className="w-4 h-4 text-red-500 shrink-0" />
                    ) : (
                        <Lightbulb className="w-4 h-4 text-amber-500 shrink-0" />
                    )}
                    <span className="truncate font-medium text-[#12122A]">{row.title}</span>
                </div>
            ),
        },
        {
            key: "severity",
            header: "Sévérité",
            render: (_v, row) => <Badge variant={SEVERITY_VARIANT[row.severity]}>{row.severity}</Badge>,
        },
        {
            key: "reportedBy",
            header: "Signalé par",
            render: (_v, row) => (
                <span className="truncate">{row.reportedBy.name} <span className="text-[#8B8BA7]">({row.reportedBy.role})</span></span>
            ),
        },
        {
            key: "sourceRoute",
            header: "Route",
            render: (_v, row) => <span className="truncate text-[#8B8BA7]">{row.sourceRoute}</span>,
        },
        {
            key: "status",
            header: "Statut",
            render: (_v, row) => <Badge variant="outline">{STATUS_LABEL[row.status]}</Badge>,
        },
        {
            key: "createdAt",
            header: "Reçu",
            sortable: true,
            render: (_v, row) => new Date(row.createdAt).toLocaleString("fr-FR"),
        },
    ];

    return (
        <div className="space-y-5">
            <PageHeader
                title="Intake technique"
                subtitle="Triez les bugs et demandes remontés depuis toute l'application"
                icon={<LifeBuoy className="w-5 h-5" />}
                onRefresh={() => void loadTickets()}
                isRefreshing={loading}
            />

            <div className="max-w-xs">
                <Select
                    options={STATUS_OPTIONS}
                    value={statusFilter}
                    onChange={setStatusFilter}
                    placeholder="Filtrer par statut"
                />
            </div>

            {!loading && tickets.length === 0 ? (
                <EmptyState
                    icon={LifeBuoy}
                    title="Aucun ticket"
                    description="Aucun signalement ne correspond à ce filtre."
                />
            ) : (
                <DataTable
                    data={tickets}
                    columns={columns}
                    keyField="id"
                    loading={loading}
                    searchable
                    searchFields={["title", "sourceRoute"]}
                    onRowClick={(row) => setSelectedTicket(row)}
                    pagination
                    pageSize={20}
                    emptyMessage="Aucun ticket"
                />
            )}

            <TriageDetailDrawer
                ticket={selectedTicket}
                onClose={() => setSelectedTicket(null)}
                onUpdated={(updated) => {
                    setTickets((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
                    setSelectedTicket(updated);
                }}
            />
        </div>
    );
}
