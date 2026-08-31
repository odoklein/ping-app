import { SettingsSubNav } from "@/components/manager/SettingsSubNav";

// Phase 2 — Design system adoption sweep.
// Settings hub gets the same sub-nav treatment as Billing/Email Hub, replacing
// per-page ad-hoc navigation with the shared SubNav primitive.
export default function ManagerSettingsLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Paramètres
                </p>
                <SettingsSubNav />
            </div>
            {children}
        </div>
    );
}
