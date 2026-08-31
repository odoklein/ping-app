import { EmailHubTabs } from "@/components/email/EmailHubTabs";

// Phase 1 — Inbox unification.
// Wraps every /manager/email/<sub-route> with the canonical Hub tab bar.
// The Inbox itself (/manager/email exact) lives outside this group and renders
// without tabs so it can fill the full viewport via AppLayoutShell's isEmailHub
// branch.
export default function ManagerEmailHubLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="space-y-5">
            <div className="rounded-xl border border-[#DDE5E2] bg-white p-2 shadow-sm">
                <EmailHubTabs />
            </div>
            {children}
        </div>
    );
}
