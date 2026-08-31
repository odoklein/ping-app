"use client";

import {
    Inbox,
    LayoutDashboard,
    Send,
    Users,
    Zap,
    Mailbox,
    FileText,
    BarChart3,
} from "lucide-react";
import { SubNav, SubNavItem } from "@/components/ui/SubNav";

// EmailHubTabs — Phase 1 inbox unification, refactored in Phase 2 to use
// the shared SubNav primitive. Canonical email surface is /manager/email;
// the Inbox itself (/manager/email exact) renders without these tabs.
const ITEMS: SubNavItem[] = [
    { href: "/manager/email", label: "Boîte de réception", icon: Inbox, exact: true },
    { href: "/manager/email/overview", label: "Vue d'ensemble", icon: LayoutDashboard },
    { href: "/manager/email/sent", label: "Envoyés", icon: Send },
    { href: "/manager/email/contacts", label: "Contacts", icon: Users },
    { href: "/manager/email/sequences", label: "Séquences", icon: Zap },
    { href: "/manager/email/templates", label: "Modèles", icon: FileText },
    { href: "/manager/email/mailboxes", label: "Boîtes mail", icon: Mailbox },
    { href: "/manager/email/analytics", label: "Analytics", icon: BarChart3 },
];

export function EmailHubTabs() {
    return <SubNav items={ITEMS} tone="email" aria-label="Navigation email" />;
}

export default EmailHubTabs;
