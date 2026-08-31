"use client";

import {
    LayoutDashboard,
    FileText,
    Users,
    Tag,
    CalendarDays,
    Settings,
} from "lucide-react";
import { SubNav, SubNavItem } from "@/components/ui/SubNav";

const ITEMS: SubNavItem[] = [
    { href: "/manager/billing", label: "Accueil", icon: LayoutDashboard, exact: true },
    { href: "/manager/billing/invoices", label: "Factures", icon: FileText },
    { href: "/manager/billing/clients", label: "Clients", icon: Users },
    { href: "/manager/billing/offres", label: "Offres & Tarifs", icon: Tag },
    { href: "/manager/billing/engagements", label: "Engagements", icon: CalendarDays },
    { href: "/manager/billing/settings", label: "Paramètres", icon: Settings },
];

export function BillingSubNav() {
    return <SubNav items={ITEMS} aria-label="Facturation" />;
}
