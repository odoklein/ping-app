"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { ManagerOnboardingModal } from "./ManagerOnboardingModal";
import { SdrOnboardingModal } from "./SdrOnboardingModal";
import { ClientOnboardingModal } from "./ClientOnboardingModal";
import { CommercialOnboardingModal } from "./CommercialOnboardingModal";
import type { OnboardingContext } from "./types";

// ============================================
// ONBOARDING CONTROLLER
// ============================================
// Mounted once inside the app providers. On an authenticated route it asks the
// server whether the role wizard still has to run, then injects the wizard for
// the session's role. Roles without a wizard (BD, DEVELOPER) are closed out
// silently so they are never asked again.

const ROLES_WITH_WIZARD = new Set(["MANAGER", "SDR", "BOOKER", "CLIENT", "COMMERCIAL"]);

// Routes that must never be interrupted: public pages and the activation flow.
const EXCLUDED_PREFIXES = [
    "/login",
    "/invite",
    "/reset-password",
    "/forgot-password",
    "/blocked",
    "/unauthorized",
];

export function OnboardingController() {
    const { data: session, status } = useSession();
    const pathname = usePathname();
    const router = useRouter();

    const [open, setOpen] = useState(false);
    const [context, setContext] = useState<OnboardingContext | null>(null);
    const [resolved, setResolved] = useState(false);

    const excluded =
        !pathname || EXCLUDED_PREFIXES.some((prefix) => pathname.startsWith(prefix));

    useEffect(() => {
        if (status !== "authenticated" || excluded || resolved) return;

        let cancelled = false;

        (async () => {
            try {
                const statusRes = await fetch("/api/users/me/complete-onboarding", {
                    cache: "no-store",
                });
                const statusJson = await statusRes.json();
                if (cancelled) return;

                if (!statusJson?.success || statusJson.data?.hasCompletedRoleOnboarding !== false) {
                    setResolved(true);
                    return;
                }

                const role: string = statusJson.data.role;

                // No wizard for this role — mark it done rather than re-asking every load.
                if (!ROLES_WITH_WIZARD.has(role)) {
                    await fetch("/api/users/me/complete-onboarding", { method: "PATCH" });
                    if (!cancelled) setResolved(true);
                    return;
                }

                const ctxRes = await fetch("/api/users/me/onboarding-context", {
                    cache: "no-store",
                });
                const ctxJson = await ctxRes.json();
                if (cancelled) return;

                setContext(ctxJson?.success ? (ctxJson.data as OnboardingContext) : { role });
                setOpen(true);
                setResolved(true);
            } catch {
                // Onboarding is a nicety: never block the app on a failed probe.
                if (!cancelled) setResolved(true);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [status, excluded, resolved]);

    const markComplete = useCallback(async () => {
        try {
            await fetch("/api/users/me/complete-onboarding", { method: "PATCH" });
        } catch {
            // The wizard still closes: the worst case is it reappears next login.
        }
    }, []);

    const handleComplete = useCallback(
        async (redirectTo?: string) => {
            await markComplete();
            setOpen(false);
            if (redirectTo && pathname !== redirectTo) {
                router.push(redirectTo);
            }
        },
        [markComplete, pathname, router],
    );

    const handleSkip = useCallback(async () => {
        await markComplete();
        setOpen(false);
    }, [markComplete]);

    if (!open || excluded) return null;

    const role = context?.role ?? session?.user?.role;

    switch (role) {
        case "MANAGER":
            return (
                <ManagerOnboardingModal
                    isOpen={open}
                    context={context}
                    onComplete={handleComplete}
                    onSkip={handleSkip}
                />
            );
        case "SDR":
        case "BOOKER":
            return (
                <SdrOnboardingModal
                    isOpen={open}
                    context={context}
                    onComplete={handleComplete}
                    onSkip={handleSkip}
                />
            );
        case "CLIENT":
            return (
                <ClientOnboardingModal
                    isOpen={open}
                    context={context}
                    onComplete={handleComplete}
                    onSkip={handleSkip}
                />
            );
        case "COMMERCIAL":
            return (
                <CommercialOnboardingModal
                    isOpen={open}
                    context={context}
                    onComplete={handleComplete}
                    onSkip={handleSkip}
                />
            );
        default:
            return null;
    }
}
