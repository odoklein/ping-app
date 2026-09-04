// ============================================
// ONBOARDING CONTEXT (shape of GET /api/users/me/onboarding-context)
// ============================================

export interface OnboardingPerson {
    id: string;
    name: string;
    role: string;
}

export interface OnboardingMission {
    id: string;
    name: string;
    objective?: string | null;
    clientName?: string;
}

export interface OnboardingInterlocuteur {
    id: string;
    firstName: string;
    lastName: string;
    title?: string | null;
    territory?: string | null;
    emails?: unknown;
    phones?: unknown;
    bookingLinks?: unknown;
    isActive?: boolean;
}

export interface OnboardingContext {
    role: string;
    name?: string;
    email?: string;
    hasCompletedRoleOnboarding?: boolean;
    inviter?: OnboardingPerson | null;

    // SDR / BOOKER
    telephony?: {
        provider: string;
        assignedNumber: string | null;
        fallbackPhone: string | null;
    };
    missions?: OnboardingMission[];
    firstList?: { id: string; name: string } | null;

    // CLIENT
    client?: { id: string; name: string };
    team?: { manager: OnboardingPerson | null; sdrs: OnboardingPerson[] };
    playbook?: { pitch: string | null; icp: string | null; hasPlaybook: boolean };
    interlocuteurs?: OnboardingInterlocuteur[];

    // COMMERCIAL
    interlocuteur?:
        | (OnboardingInterlocuteur & { client?: { id: string; name: string } })
        | null;

    // MANAGER / BD / DEVELOPER
    cockpit?: {
        clientCount: number;
        missionCount: number;
        sdrCount: number;
        pendingInvitations: number;
    };
}

export interface BookingLink {
    label: string;
    url: string;
    durationMinutes?: number;
}
