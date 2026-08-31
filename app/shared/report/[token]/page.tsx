import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";

interface Props {
    params: Promise<{ token: string }>;
}

const MONTH_NAMES = [
    "", "Janvier", "Fevrier", "Mars", "Avril", "Mai", "Juin",
    "Juillet", "Aout", "Septembre", "Octobre", "Novembre", "Decembre",
];

export default async function SharedReportPage({ params }: Props) {
    const { token } = await params;

    const link = await prisma.sharedReportLink.findUnique({
        where: { token },
        include: {
            client: { select: { name: true } },
            mission: { select: { name: true, id: true } },
        },
    });

    if (!link) return notFound();

    if (new Date() > link.expiresAt) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-[var(--elan-paper)] via-[var(--elan-paper)] to-[var(--elan-paper-2)] flex items-center justify-center p-6">
                <div className="bg-[var(--elan-surface)] rounded-2xl border border-[var(--elan-line)] p-10 max-w-md text-center shadow-xl">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <h1 className="text-xl font-bold text-[var(--elan-ink)] mb-2">Ce lien a expire</h1>
                    <p className="text-sm text-[var(--elan-slate)]">
                        Demandez un nouveau lien a votre contact pour acceder au rapport.
                    </p>
                </div>
            </div>
        );
    }

    const missionIds = link.missionId
        ? [link.missionId]
        : (await prisma.mission.findMany({
            where: { clientId: link.clientId },
            select: { id: true },
        })).map((m) => m.id);

    const actions = await prisma.action.findMany({
        where: {
            campaign: { missionId: { in: missionIds } },
            createdAt: { gte: link.dateFrom, lte: link.dateTo },
        },
        include: {
            contact: {
                include: { company: { select: { name: true } } },
            },
        },
    });

    const totalCalls = actions.length;
    const meetings = actions.filter((a) => a.result === "MEETING_BOOKED");
    const contactsReached = new Set(actions.filter((a) => a.contactId).map((a) => a.contactId)).size;
    const contactRate = totalCalls > 0 ? Math.round((contactsReached / totalCalls) * 100) : 0;

    const fromMonth = link.dateFrom.getMonth() + 1;
    const fromYear = link.dateFrom.getFullYear();
    const toMonth = link.dateTo.getMonth() + 1;
    const toYear = link.dateTo.getFullYear();
    const periodLabel = fromMonth === toMonth && fromYear === toYear
        ? `${MONTH_NAMES[fromMonth]} ${fromYear}`
        : `${MONTH_NAMES[fromMonth]} ${fromYear} — ${MONTH_NAMES[toMonth]} ${toYear}`;

    const statItems = [
        { label: "RDV obtenus", value: meetings.length.toString(), accent: "from-[#ff9e1b] to-[#e07c00]" },
        { label: "Appels realises", value: totalCalls.toString(), accent: "from-blue-500 to-cyan-500" },
        { label: "Taux de contact", value: `${contactRate}%`, accent: "from-emerald-500 to-teal-500" },
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-[var(--elan-paper)] via-[var(--elan-paper)] to-[var(--elan-paper-2)]">
            <div className="max-w-3xl mx-auto p-6 md:p-10 space-y-8">
                {/* Header */}
                <div className="relative overflow-hidden rounded-2xl shadow-xl" style={{ background: "#0C3B38" }}>
                    <div className="absolute top-0 right-0 w-48 h-48 rounded-full bg-[var(--elan-surface)]/5 -translate-y-1/2 translate-x-1/3" />
                    <div className="absolute bottom-0 left-0 w-32 h-32 rounded-full bg-[var(--elan-surface)]/5 translate-y-1/2 -translate-x-1/4" />
                    <div className="relative p-8 text-center">
                        <p className="text-xs font-bold text-indigo-200 uppercase tracking-[0.2em] mb-3">
                            Rapport de prospection
                        </p>
                        <h1 className="text-2xl font-black text-[var(--elan-surface)]">{link.client.name}</h1>
                        {link.mission && (
                            <p className="text-sm text-indigo-200/80 mt-1.5 font-medium">Mission : {link.mission.name}</p>
                        )}
                        <p className="text-sm text-indigo-200/60 mt-1">{periodLabel}</p>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {statItems.map((item) => (
                        <div key={item.label} className="bg-[var(--elan-surface)] rounded-2xl border border-[var(--elan-line)] p-6 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 text-center">
                            <p className="text-sm font-medium text-[var(--elan-slate)] mb-2">{item.label}</p>
                            <p className={`text-4xl font-black bg-gradient-to-r ${item.accent} bg-clip-text text-transparent tabular-nums`}>
                                {item.value}
                            </p>
                        </div>
                    ))}
                </div>

                {/* Meeting List */}
                {meetings.length > 0 && (
                    <div className="bg-[var(--elan-surface)] rounded-2xl border border-[var(--elan-line)] overflow-hidden shadow-sm">
                        <div className="px-6 py-4 border-b border-[var(--elan-line)] bg-gradient-to-r from-[#F8F7FF] to-white">
                            <h2 className="text-sm font-bold text-[var(--elan-ink)] uppercase tracking-wider">
                                Rendez-vous ({meetings.length})
                            </h2>
                        </div>
                        <div className="p-6 space-y-3">
                            {meetings.map((m) => {
                                const contactName = [m.contact?.firstName, m.contact?.lastName].filter(Boolean).join(" ") || "Contact";
                                const companyName = m.contact?.company?.name || "—";
                                const date = new Date(m.callbackDate || m.createdAt).toLocaleDateString("fr-FR", {
                                    day: "numeric",
                                    month: "long",
                                    year: "numeric",
                                });
                                return (
                                    <div key={m.id} className="p-4 rounded-xl bg-gradient-to-r from-[#f4f0e8] to-[#ece5d8] border border-[var(--elan-line)]/50 hover:border-[rgba(12,59,56,0.15)] transition-all duration-200">
                                        <p className="font-bold text-[var(--elan-ink)]">
                                            {contactName}
                                            <span className="font-normal text-[var(--elan-slate)]"> &middot; {companyName}</span>
                                        </p>
                                        <p className="text-sm text-[#899892] mt-1">{date}</p>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Footer */}
                <div className="text-center text-xs text-[#899892] py-4">
                    Rapport généré via <span className="font-semibold text-[#0C3B38]">Prospecto</span>
                </div>
            </div>
        </div>
    );
}
