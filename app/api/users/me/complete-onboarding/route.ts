import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { successResponse, requireAuth, withErrorHandler } from "@/lib/api-utils";

// ============================================
// GET /api/users/me/complete-onboarding
// Whether the role onboarding wizard still has to run for the current user.
// ============================================

export const GET = withErrorHandler(async (request: NextRequest) => {
    const session = await requireAuth(request);

    const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: {
            role: true,
            hasCompletedRoleOnboarding: true,
            onboardingCompletedAt: true,
        },
    });

    return successResponse({
        role: user?.role ?? session.user.role,
        hasCompletedRoleOnboarding: user?.hasCompletedRoleOnboarding ?? true,
        onboardingCompletedAt: user?.onboardingCompletedAt ?? null,
    });
});

// ============================================
// PATCH /api/users/me/complete-onboarding
// Closes the role onboarding wizard for the current user.
// ============================================

export const PATCH = withErrorHandler(async (request: NextRequest) => {
    const session = await requireAuth(request);

    const user = await prisma.user.update({
        where: { id: session.user.id },
        data: {
            hasCompletedRoleOnboarding: true,
            onboardingCompletedAt: new Date(),
        },
        select: { id: true, hasCompletedRoleOnboarding: true, onboardingCompletedAt: true },
    });

    return successResponse(user);
});
