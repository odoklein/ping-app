import type { LucideIcon } from "lucide-react";
import {
    Activity,
    ArrowRight,
    Boxes,
    BrainCircuit,
    CheckCircle2,
    Cloud,
    Database,
    FileStack,
    Gauge,
    GitBranch,
    HardDrive,
    Layers3,
    LockKeyhole,
    Mail,
    Network,
    PhoneCall,
    Route,
    Search,
    Server,
    ShieldCheck,
    TimerReset,
    TriangleAlert,
    Webhook,
    Workflow,
} from "lucide-react";

type Tone = "petrol" | "amber" | "eucalyptus" | "paper";

const toneStyles: Record<Tone, { shell: string; icon: string; rule: string }> = {
    petrol: {
        shell: "border-petrol/20 bg-petrol text-paper",
        icon: "bg-white/10 text-amber",
        rule: "text-paper/65",
    },
    amber: {
        shell: "border-amber-deep/20 bg-amber text-ink",
        icon: "bg-ink/8 text-petrol",
        rule: "text-ink/65",
    },
    eucalyptus: {
        shell: "border-petrol/10 bg-eucalyptus text-ink",
        icon: "bg-surface text-petrol",
        rule: "text-slate",
    },
    paper: {
        shell: "border-line bg-surface text-ink",
        icon: "bg-paper-2 text-petrol",
        rule: "text-slate",
    },
};

const requestPath = [
    {
        icon: Route,
        number: "01",
        title: "Interfaces par rôle",
        detail: "Manager, SDR, client, commercial et développeur",
        tone: "paper" as Tone,
    },
    {
        icon: ShieldCheck,
        number: "02",
        title: "Frontière d’accès",
        detail: "Middleware, JWT 8 h, RBAC et permissions fines",
        tone: "eucalyptus" as Tone,
    },
    {
        icon: Server,
        number: "03",
        title: "Application Next.js",
        detail: "Rendu React, routes API, services de domaine",
        tone: "petrol" as Tone,
    },
    {
        icon: Database,
        number: "04",
        title: "Système de référence",
        detail: "PostgreSQL, Prisma, 107 modèles métier",
        tone: "amber" as Tone,
    },
];

const planes = [
    {
        icon: Layers3,
        title: "Plan d’expérience",
        description: "Une application multi-rôle, une navigation et des contrats API cohérents.",
        items: ["React 19 et Next.js 16", "Portails segmentés par rôle", "Composants et tokens Prospecto"],
        className: "lg:col-span-7",
        tone: "petrol" as Tone,
    },
    {
        icon: Boxes,
        title: "Plan de domaine",
        description: "Le monolithe modulaire reste le bon compromis tant que les limites sont explicites.",
        items: ["Missions et prospection", "Email et communications", "Planning, facturation et support"],
        className: "lg:col-span-5",
        tone: "paper" as Tone,
    },
    {
        icon: Database,
        title: "Plan de données",
        description: "Postgres conserve l’autorité. Les fichiers quittent le runtime applicatif.",
        items: ["Prisma avec pool limité", "Stockage S3 ou MinIO", "URLs signées temporaires"],
        className: "lg:col-span-5",
        tone: "eucalyptus" as Tone,
    },
    {
        icon: Workflow,
        title: "Plan asynchrone",
        description: "Les tâches longues sont rejouables, observables et découplées des requêtes utilisateur.",
        items: ["BullMQ et Redis", "Workers email et prospects", "QStash pour les déclenchements planifiés"],
        className: "lg:col-span-7",
        tone: "amber" as Tone,
    },
];

const integrations: Array<{
    icon: LucideIcon;
    title: string;
    detail: string;
    protocol: string;
}> = [
    { icon: Mail, title: "Messagerie", detail: "Gmail, Outlook, SMTP et IMAP", protocol: "OAuth · Webhooks" },
    { icon: PhoneCall, title: "Téléphonie", detail: "Allo et enrichissement des appels", protocol: "REST · Reprise" },
    { icon: Search, title: "Données marché", detail: "Apollo, Apify et Explorium", protocol: "REST · Limites" },
    { icon: BrainCircuit, title: "Intelligence", detail: "Gemini et analyses assistées", protocol: "API · Budget" },
    { icon: FileStack, title: "Contenu", detail: "Leexi et Google Drive", protocol: "OAuth · Sync" },
    { icon: Webhook, title: "Événements", detail: "Callbacks entrants et suivi email", protocol: "Signatures · Idempotence" },
];

const decisions = [
    {
        id: "ADR 01",
        title: "Monolithe modulaire avant microservices",
        body: "Réduire le coût d’exploitation, puis extraire un domaine seulement avec une contrainte de charge ou d’isolation mesurée.",
        status: "Retenu",
    },
    {
        id: "ADR 02",
        title: "PostgreSQL comme source de vérité",
        body: "Les files transportent du travail, jamais l’état métier canonique. Chaque traitement reste idempotent et traçable.",
        status: "Retenu",
    },
    {
        id: "ADR 03",
        title: "Adaptateurs pour chaque fournisseur",
        body: "Email, stockage, IA et enrichissement passent par des contrats internes afin de limiter le verrouillage fournisseur.",
        status: "Retenu",
    },
    {
        id: "ADR 04",
        title: "Observabilité centrée sur le parcours",
        body: "Corréler requête, tâche asynchrone et appel externe avec un identifiant commun avant d’ajouter de nouveaux services.",
        status: "À livrer",
    },
];

const hardening = [
    {
        icon: LockKeyhole,
        title: "Sécurité de la frontière API",
        current: "Sessions par rôle et clés API disponibles.",
        target: "Validation centralisée de chaque clé, périmètre d’endpoint, rotation et journal d’audit.",
        priority: "P0",
    },
    {
        icon: Activity,
        title: "Télémétrie de production",
        current: "Sentry client présent, instrumentation serveur désactivée.",
        target: "Traces échantillonnées, PII masquée, alertes par SLO et corrélation des tâches.",
        priority: "P0",
    },
    {
        icon: TimerReset,
        title: "Traitements durables",
        current: "BullMQ pour email et prospects, file locale pour un enrichissement.",
        target: "Migration de la dernière file locale vers Redis avec reprise, DLQ et backoff.",
        priority: "P1",
    },
    {
        icon: HardDrive,
        title: "Stockage de production",
        current: "Abstraction locale, S3 et MinIO déjà implémentée.",
        target: "S3 ou MinIO obligatoire en production, politique de rétention et scan des fichiers.",
        priority: "P1",
    },
];

const rollout = [
    {
        step: "Maintenant",
        title: "Fermer la frontière",
        detail: "Clés API, secrets, Sentry, PII et identifiants de corrélation.",
    },
    {
        step: "Ensuite",
        title: "Durcir l’asynchrone",
        detail: "Une file durable, DLQ, déduplication, reprises et budgets fournisseurs.",
    },
    {
        step: "Puis",
        title: "Piloter par les SLO",
        detail: "Disponibilité, latence, fraîcheur des synchronisations et taux d’échec.",
    },
];

function SectionHeading({
    number,
    title,
    detail,
}: {
    number: string;
    title: string;
    detail: string;
}) {
    return (
        <div className="mb-6 max-w-3xl">
            <div className="mb-3 flex items-center gap-3 font-elan-monospace text-[11px] font-medium text-amber-deep">
                <span>{number}</span>
                <span className="h-px w-8 bg-amber-deep/40" aria-hidden="true" />
            </div>
            <h2 className="font-display text-2xl font-semibold tracking-[-0.035em] text-ink sm:text-3xl">{title}</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate sm:text-[15px]">{detail}</p>
        </div>
    );
}

function FlowNode({ item }: { item: (typeof requestPath)[number] }) {
    const Icon = item.icon;
    const styles = toneStyles[item.tone];

    return (
        <article className={`min-w-0 rounded-elan-lg border p-4 shadow-elan-sm ${styles.shell}`}>
            <div className="flex items-start justify-between gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-elan ${styles.icon}`}>
                    <Icon className="h-5 w-5" aria-hidden="true" />
                </div>
                <span className={`font-elan-monospace text-[10px] ${styles.rule}`}>{item.number}</span>
            </div>
            <h3 className="mt-8 font-display text-base font-semibold tracking-[-0.02em]">{item.title}</h3>
            <p className={`mt-1 text-xs leading-5 ${styles.rule}`}>{item.detail}</p>
        </article>
    );
}

export default function SystemArchitecturePage() {
    return (
        <div className="pb-16">
            <header className="relative overflow-hidden rounded-elan-lg border border-petrol/15 bg-petrol px-5 py-7 text-paper shadow-elan-md sm:px-8 sm:py-9">
                <div
                    className="pointer-events-none absolute inset-0 opacity-[0.14]"
                    style={{
                        backgroundImage:
                            "linear-gradient(rgba(255,255,255,.16) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.16) 1px, transparent 1px)",
                        backgroundSize: "32px 32px",
                        maskImage: "linear-gradient(to left, black, transparent 76%)",
                    }}
                    aria-hidden="true"
                />
                <div className="relative flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
                    <div className="max-w-3xl">
                        <div className="mb-5 flex items-center gap-2 font-elan-monospace text-[11px] text-paper/65">
                            <Network className="h-4 w-4 text-amber" aria-hidden="true" />
                            <span>SYSTÈME · REVUE 18.07.2026</span>
                        </div>
                        <h1 className="max-w-2xl font-display text-4xl font-semibold leading-[1.02] tracking-[-0.045em] sm:text-5xl">
                            Une architecture lisible, avant d’être distribuée.
                        </h1>
                        <p className="mt-5 max-w-2xl text-sm leading-6 text-paper/70 sm:text-base">
                            La carte opérationnelle de Prospecto relie les parcours métier, le calcul, les données et les fournisseurs externes sans masquer les limites actuelles.
                        </p>
                    </div>
                    <div className="grid grid-cols-2 gap-x-8 gap-y-4 border-l border-white/12 pl-5 sm:grid-cols-4 lg:grid-cols-2">
                        {[
                            ["Runtime", "Next.js 16"],
                            ["Données", "107 modèles"],
                            ["Session", "JWT · 8 h"],
                            ["Pool SQL", "5 connexions"],
                        ].map(([label, value]) => (
                            <div key={label}>
                                <p className="font-elan-monospace text-[10px] text-paper/50">{label}</p>
                                <p className="mt-1 text-sm font-semibold text-paper">{value}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </header>

            <nav className="mt-4 flex gap-2 overflow-x-auto pb-2" aria-label="Sections de la carte système">
                {[
                    ["#flux", "Flux principal"],
                    ["#plans", "Plans système"],
                    ["#perimetre", "Périmètre"],
                    ["#durcissement", "Durcissement"],
                ].map(([href, label]) => (
                    <a
                        key={href}
                        href={href}
                        className="whitespace-nowrap rounded-elan border border-line bg-surface px-3 py-2 text-xs font-medium text-slate transition-colors hover:border-petrol/25 hover:text-petrol focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                    >
                        {label}
                    </a>
                ))}
            </nav>

            <section id="flux" className="scroll-mt-24 pt-12">
                <SectionHeading
                    number="01"
                    title="Le chemin critique d’une requête"
                    detail="Un trajet synchrone court. Les traitements lents partent vers une file durable et reviennent par état, événement ou notification."
                />
                <div className="rounded-elan-lg border border-line bg-paper p-4 shadow-elan-sm sm:p-6">
                    <div className="grid gap-3 lg:grid-cols-[1fr_32px_1fr_32px_1fr_32px_1fr] lg:items-center">
                        {requestPath.map((item, index) => (
                            <div className="contents" key={item.title}>
                                <FlowNode item={item} />
                                {index < requestPath.length - 1 ? (
                                    <div className="flex justify-center text-amber-deep" aria-hidden="true">
                                        <ArrowRight className="h-4 w-4 rotate-90 lg:rotate-0" />
                                    </div>
                                ) : null}
                            </div>
                        ))}
                    </div>
                    <div className="mt-4 flex flex-col gap-3 rounded-elan border border-petrol/10 bg-surface px-4 py-3 sm:flex-row sm:items-center">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-elan bg-eucalyptus text-petrol">
                            <GitBranch className="h-4 w-4" aria-hidden="true" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-ink">Branche asynchrone</p>
                            <p className="text-xs leading-5 text-slate">Email, prospects, enrichissement et agrégations partent vers Redis et BullMQ.</p>
                        </div>
                        <div className="flex items-center gap-2 font-elan-monospace text-[10px] text-petrol">
                            <span>RETRY</span><span>·</span><span>IDEMPOTENCE</span><span>·</span><span>DLQ CIBLE</span>
                        </div>
                    </div>
                </div>
            </section>

            <section id="plans" className="scroll-mt-24 pt-14">
                <SectionHeading
                    number="02"
                    title="Quatre plans, une seule responsabilité chacun"
                    detail="La séparation est logique avant d’être physique. Elle garde le produit rapide à faire évoluer et prépare les extractions futures."
                />
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
                    {planes.map((plane) => {
                        const Icon = plane.icon;
                        const styles = toneStyles[plane.tone];
                        return (
                            <article key={plane.title} className={`${plane.className} rounded-elan-lg border p-5 shadow-elan-sm sm:p-6 ${styles.shell}`}>
                                <div className="flex items-start justify-between gap-6">
                                    <div>
                                        <h3 className="font-display text-xl font-semibold tracking-[-0.025em]">{plane.title}</h3>
                                        <p className={`mt-2 max-w-xl text-sm leading-6 ${styles.rule}`}>{plane.description}</p>
                                    </div>
                                    <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-elan ${styles.icon}`}>
                                        <Icon className="h-5 w-5" aria-hidden="true" />
                                    </div>
                                </div>
                                <ul className="mt-6 grid gap-2 sm:grid-cols-3">
                                    {plane.items.map((item) => (
                                        <li key={item} className={`flex items-start gap-2 text-xs leading-5 ${styles.rule}`}>
                                            <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                                            <span>{item}</span>
                                        </li>
                                    ))}
                                </ul>
                            </article>
                        );
                    })}
                </div>
            </section>

            <section id="perimetre" className="scroll-mt-24 pt-14">
                <SectionHeading
                    number="03"
                    title="Le périmètre externe reste remplaçable"
                    detail="Chaque fournisseur doit être vu comme une dépendance faillible avec quotas, délais, signatures et règles de reprise."
                />
                <div className="overflow-hidden rounded-elan-lg border border-line bg-surface shadow-elan-sm">
                    <div className="grid md:grid-cols-2 xl:grid-cols-3">
                        {integrations.map((item, index) => {
                            const Icon = item.icon;
                            return (
                                <article
                                    key={item.title}
                                    className={`p-5 ${index % 3 !== 2 ? "xl:border-r xl:border-line" : ""} ${index < 3 ? "xl:border-b xl:border-line" : ""} ${index % 2 === 0 ? "md:border-r md:border-line xl:border-r" : ""} ${index < 4 ? "md:border-b md:border-line" : ""}`}
                                >
                                    <div className="flex items-start gap-4">
                                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-elan bg-paper-2 text-petrol">
                                            <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-semibold text-ink">{item.title}</h3>
                                            <p className="mt-1 text-xs leading-5 text-slate">{item.detail}</p>
                                            <p className="mt-3 font-elan-monospace text-[10px] text-amber-deep">{item.protocol}</p>
                                        </div>
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                </div>
            </section>

            <section id="durcissement" className="scroll-mt-24 pt-14">
                <SectionHeading
                    number="04"
                    title="Durcir avant de distribuer"
                    detail="Les prochains gains viennent de la sécurité, de la durabilité et de l’observabilité, pas d’un découpage prématuré en services."
                />
                <div className="grid gap-4 lg:grid-cols-2">
                    {hardening.map((item) => {
                        const Icon = item.icon;
                        return (
                            <article key={item.title} className="rounded-elan-lg border border-line bg-surface p-5 shadow-elan-sm">
                                <div className="flex items-start gap-4">
                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-elan bg-petrol text-amber">
                                        <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-start justify-between gap-4">
                                            <h3 className="font-display text-base font-semibold tracking-[-0.02em] text-ink">{item.title}</h3>
                                            <span className={`rounded-md px-2 py-1 font-elan-monospace text-[10px] font-medium ${item.priority === "P0" ? "bg-danger/10 text-danger" : "bg-amber/20 text-amber-deep"}`}>
                                                {item.priority}
                                            </span>
                                        </div>
                                        <dl className="mt-4 space-y-3 text-xs leading-5">
                                            <div className="grid grid-cols-[58px_1fr] gap-3">
                                                <dt className="font-elan-monospace text-[10px] text-slate">ACTUEL</dt>
                                                <dd className="text-ink-soft">{item.current}</dd>
                                            </div>
                                            <div className="grid grid-cols-[58px_1fr] gap-3">
                                                <dt className="font-elan-monospace text-[10px] text-amber-deep">CIBLE</dt>
                                                <dd className="font-medium text-ink">{item.target}</dd>
                                            </div>
                                        </dl>
                                    </div>
                                </div>
                            </article>
                        );
                    })}
                </div>
            </section>

            <section className="pt-14">
                <SectionHeading
                    number="05"
                    title="Décisions d’architecture"
                    detail="Des règles assez fortes pour guider les prochains changements, assez simples pour être vérifiées pendant une revue de code."
                />
                <div className="rounded-elan-lg border border-line bg-paper px-4 shadow-elan-sm sm:px-6">
                    {decisions.map((decision, index) => (
                        <article key={decision.id} className={`grid gap-3 py-5 md:grid-cols-[90px_1fr_auto] md:items-start ${index < decisions.length - 1 ? "border-b border-line" : ""}`}>
                            <p className="font-elan-monospace text-[10px] text-amber-deep">{decision.id}</p>
                            <div>
                                <h3 className="text-sm font-semibold text-ink">{decision.title}</h3>
                                <p className="mt-1 max-w-2xl text-xs leading-5 text-slate">{decision.body}</p>
                            </div>
                            <span className={`w-fit rounded-md px-2 py-1 font-elan-monospace text-[10px] ${decision.status === "Retenu" ? "bg-eucalyptus text-petrol" : "bg-amber/20 text-amber-deep"}`}>
                                {decision.status}
                            </span>
                        </article>
                    ))}
                </div>
            </section>

            <section className="pt-14">
                <div className="rounded-elan-lg border border-petrol/15 bg-petrol p-5 text-paper shadow-elan-md sm:p-7">
                    <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
                        <div className="max-w-sm">
                            <div className="flex h-11 w-11 items-center justify-center rounded-elan bg-white/10 text-amber">
                                <Gauge className="h-5 w-5" aria-hidden="true" />
                            </div>
                            <h2 className="mt-5 font-display text-2xl font-semibold tracking-[-0.035em]">Ordre de livraison recommandé</h2>
                            <p className="mt-2 text-sm leading-6 text-paper/65">Trois horizons, chacun réduit un risque concret avant d’ajouter de la complexité.</p>
                        </div>
                        <ol className="grid flex-1 gap-3 md:grid-cols-3 lg:max-w-2xl">
                            {rollout.map((item, index) => (
                                <li key={item.step} className="rounded-elan border border-white/12 bg-white/[0.04] p-4">
                                    <div className="flex items-center justify-between gap-4">
                                        <span className="font-elan-monospace text-[10px] text-amber">{item.step}</span>
                                        <span className="font-elan-monospace text-[10px] text-paper/35">0{index + 1}</span>
                                    </div>
                                    <h3 className="mt-5 text-sm font-semibold text-paper">{item.title}</h3>
                                    <p className="mt-1 text-xs leading-5 text-paper/55">{item.detail}</p>
                                </li>
                            ))}
                        </ol>
                    </div>
                    <div className="mt-6 flex flex-col gap-3 border-t border-white/10 pt-5 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-2 text-xs text-paper/60">
                            <TriangleAlert className="h-4 w-4 text-amber" aria-hidden="true" />
                            <span>La carte décrit le code audité, pas une promesse d’infrastructure déjà déployée.</span>
                        </div>
                        <div className="flex items-center gap-2 font-elan-monospace text-[10px] text-paper/45">
                            <Cloud className="h-3.5 w-3.5" aria-hidden="true" />
                            VERCEL COMPATIBLE · POSTGRES · REDIS · OBJETS
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}
