"use client";

import {
    Users,
    ClipboardCheck,
    SlidersHorizontal,
    Database,
    FlaskConical,
} from "lucide-react";
import { SubNav, SubNavItem } from "@/components/ui/SubNav";

const ITEMS: SubNavItem[] = [
    { href: "/manager/prospects", label: "Liste", icon: Users, exact: true },
    { href: "/manager/prospects/review", label: "Revue", icon: ClipboardCheck },
    { href: "/manager/prospects/rules", label: "Règles", icon: SlidersHorizontal },
    { href: "/manager/prospects/sources", label: "Sources", icon: Database },
    { href: "/manager/prospects/sandbox", label: "Sandbox", icon: FlaskConical },
];

export function ProspectsSubNav() {
    return <SubNav items={ITEMS} aria-label="Prospects" />;
}

export default ProspectsSubNav;
