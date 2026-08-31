import { ProspectsSubNav } from "@/components/manager/ProspectsSubNav";

// Phase 2 — Design system adoption sweep.
// Prospects already has multiple sub-routes (review, rules, sources, sandbox)
// but no sub-nav. Same SubNav treatment as Billing/Email/Settings.
//
// Note: /manager/prospects/[id] (single prospect detail) inherits this layout
// too. The sub-nav stays visible as a breadcrumb-ish anchor; if it becomes
// noisy on the detail page we can swap to a route group like (list)/.
export default function ManagerProspectsLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Prospects
                </p>
                <ProspectsSubNav />
            </div>
            {children}
        </div>
    );
}
