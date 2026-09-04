"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import {
    LayoutDashboard,
    CalendarCheck,
    FolderOpen,
    MessageSquare,
    User,
    PhoneCall,
    Target,
    Users,
    Menu,
    X,
    FileText,
    CreditCard,
    Calendar,
    Briefcase,
    LogOut,
    ExternalLink,
    ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useNativeDevice } from "@/hooks/useNativeDevice";
import { UserRole } from "@prisma/client";

interface NavTabItem {
    label: string;
    href: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number;
}

export function MobileBottomNav() {
    const pathname = usePathname();
    const { data: session } = useSession();
    const { triggerHaptic } = useNativeDevice();
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const userRole = session?.user?.role as UserRole | undefined;

    if (!userRole || (userRole !== "CLIENT" && userRole !== "MANAGER")) {
        return null;
    }

    const isClient = userRole === "CLIENT";
    const isManager = userRole === "MANAGER";

    const clientTabs: NavTabItem[] = [
        { label: "Accueil", href: "/client/portal", icon: LayoutDashboard },
        { label: "Mes RDV", href: "/client/portal/meetings", icon: CalendarCheck },
        { label: "Fichiers", href: "/client/portal/files", icon: FolderOpen },
        { label: "Messages", href: "/client/contact", icon: MessageSquare },
        { label: "Compte", href: "/client/portal/settings", icon: User },
    ];

    const managerTabs: NavTabItem[] = [
        { label: "Dashboard", href: "/manager/dashboard", icon: LayoutDashboard },
        { label: "Prospection", href: "/manager/prospection", icon: PhoneCall },
        { label: "Missions", href: "/manager/missions", icon: Target },
        { label: "Équipe", href: "/manager/team", icon: Users },
        { label: "Messages", href: "/manager/comms", icon: MessageSquare },
    ];

    const tabs = isClient ? clientTabs : managerTabs;

    const isActive = (href: string) => {
        if (href === "/manager/dashboard" || href === "/client/portal") {
            return pathname === href;
        }
        return pathname.startsWith(href);
    };

    return (
        <>
            {/* Manager "Plus" Drawer Modal */}
            {isManager && isMenuOpen && (
                <div
                    className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex flex-col justify-end lg:hidden animate-in fade-in duration-200"
                    onClick={() => setIsMenuOpen(false)}
                >
                    <div
                        className="bg-white rounded-t-3xl p-5 shadow-2xl border-t border-slate-200 safe-bottom-nav max-h-[80vh] overflow-y-auto"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                            <div>
                                <h3 className="text-base font-bold text-slate-900">Espace Manager</h3>
                                <p className="text-xs text-slate-500">{session?.user?.name || session?.user?.email}</p>
                            </div>
                            <button
                                onClick={() => setIsMenuOpen(false)}
                                className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="grid grid-cols-2 gap-2.5 py-4">
                            <Link
                                href="/manager/billing/invoices"
                                onClick={() => {
                                    triggerHaptic();
                                    setIsMenuOpen(false);
                                }}
                                className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50 hover:bg-slate-100 text-slate-800 text-sm font-medium transition-colors"
                            >
                                <CreditCard className="w-4 h-4 text-[#2890F8]" />
                                <span>Facturation</span>
                            </Link>

                            <Link
                                href="/manager/planning"
                                onClick={() => {
                                    triggerHaptic();
                                    setIsMenuOpen(false);
                                }}
                                className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50 hover:bg-slate-100 text-slate-800 text-sm font-medium transition-colors"
                            >
                                <Calendar className="w-4 h-4 text-[#2890F8]" />
                                <span>Planning</span>
                            </Link>

                            <Link
                                href="/manager/projects"
                                onClick={() => {
                                    triggerHaptic();
                                    setIsMenuOpen(false);
                                }}
                                className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50 hover:bg-slate-100 text-slate-800 text-sm font-medium transition-colors"
                            >
                                <Briefcase className="w-4 h-4 text-[#2890F8]" />
                                <span>Projets</span>
                            </Link>

                            <Link
                                href="/manager/files"
                                onClick={() => {
                                    triggerHaptic();
                                    setIsMenuOpen(false);
                                }}
                                className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50 hover:bg-slate-100 text-slate-800 text-sm font-medium transition-colors"
                            >
                                <FolderOpen className="w-4 h-4 text-[#2890F8]" />
                                <span>Fichiers</span>
                            </Link>
                        </div>

                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                            <button
                                onClick={() => signOut({ callbackUrl: "/login" })}
                                className="flex items-center gap-2 text-rose-600 text-sm font-semibold p-2 rounded-lg hover:bg-rose-50 w-full justify-center transition-colors"
                            >
                                <LogOut className="w-4 h-4" />
                                <span>Se déconnecter</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Bottom Navigation Bar */}
            <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/80 safe-bottom-nav lg:hidden shadow-[0_-4px_20px_rgba(0,0,0,0.04)]">
                <div className="flex items-center justify-around px-2 py-1.5 max-w-lg mx-auto">
                    {tabs.map((tab) => {
                        const active = isActive(tab.href);
                        const Icon = tab.icon;

                        return (
                            <Link
                                key={tab.href}
                                href={tab.href}
                                onClick={() => triggerHaptic()}
                                className={cn(
                                    "flex flex-col items-center justify-center py-1 px-2.5 min-w-[56px] rounded-xl transition-all duration-150 active:scale-95",
                                    active
                                        ? "text-[#2890F8] font-bold"
                                        : "text-slate-500 hover:text-slate-800 font-medium"
                                )}
                            >
                                <div className="relative">
                                    <Icon
                                        className={cn(
                                            "w-5 h-5 transition-transform duration-150",
                                            active && "scale-110 stroke-[2.5]"
                                        )}
                                    />
                                    {active && (
                                        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-[#2890F8]" />
                                    )}
                                </div>
                                <span className="text-[10px] mt-1 tracking-tight leading-none truncate max-w-[64px]">
                                    {tab.label}
                                </span>
                            </Link>
                        );
                    })}

                    {/* Manager "More" button */}
                    {isManager && (
                        <button
                            type="button"
                            onClick={() => {
                                triggerHaptic();
                                setIsMenuOpen(true);
                            }}
                            className={cn(
                                "flex flex-col items-center justify-center py-1 px-2.5 min-w-[56px] rounded-xl transition-all duration-150 active:scale-95",
                                isMenuOpen
                                    ? "text-[#2890F8] font-bold"
                                    : "text-slate-500 hover:text-slate-800 font-medium"
                            )}
                        >
                            <Menu className="w-5 h-5" />
                            <span className="text-[10px] mt-1 tracking-tight leading-none">
                                Plus
                            </span>
                        </button>
                    )}
                </div>
            </nav>
        </>
    );
}

export default MobileBottomNav;
