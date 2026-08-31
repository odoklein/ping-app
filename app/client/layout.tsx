"use client";

import { AppLayoutShell } from "@/components/layout/AppLayoutShell";
import { CLIENT_NAV } from "@/lib/navigation/config";
import ClientSupportRoot from "@/components/support/ClientSupportRoot";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
    return (
        <AppLayoutShell
            allowedRoles={["CLIENT", "COMMERCIAL"]}
            customNavigation={CLIENT_NAV}
        >
            {children}
            {/* Global floating support launcher — available on every /client/* route. */}
            <ClientSupportRoot />
        </AppLayoutShell>
    );
}
