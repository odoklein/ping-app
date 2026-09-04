import { NextRequest } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import {
    successResponse,
    errorResponse,
    withErrorHandler,
    validateRequest,
} from "@/lib/api-utils";
import { getClientIp } from "@/lib/geo-ip";
import { checkIpRateLimit, checkRateLimit } from "@/lib/rate-limit";
import { recordAuthEvent } from "@/lib/auth-event";
import { assignDefaultPermissions } from "@/lib/permissions/role-defaults";
import {
    hashInvitationToken,
    INVITATION_MIN_PASSWORD_LENGTH,
    type InvitationMetadata,
} from "@/lib/invitations";
import { getRedirectPath } from "@/lib/auth";

// ============================================
// POST /api/invitations/accept  (PUBLIC, rate-limited)
// ============================================
// Finalizes an invitation: creates the User, grants the role's default
// permissions, applies the pre-configured VoIP / mission attribution and
// marks the invitation ACCEPTED — all inside one transaction, so a failure
// anywhere leaves the token replayable rather than a half-built account.

const acceptInvitationSchema = z.object({
    token: z.string().min(1, "Jeton manquant"),
    password: z
        .string()
        .min(
            INVITATION_MIN_PASSWORD_LENGTH,
            `Le mot de passe doit comporter au moins ${INVITATION_MIN_PASSWORD_LENGTH} caractères`,
        )
        .max(200, "Mot de passe trop long"),
    name: z.string().trim().optional(),
});

class InvitationAcceptError extends Error {
    code: string;
    constructor(code: string, message: string) {
        super(message);
        this.code = code;
    }
}

export const POST = withErrorHandler(async (request: NextRequest) => {
    const ip = getClientIp({ headers: request.headers });
    const userAgent = request.headers.get("user-agent");

    // Rate limit before touching the DB: this endpoint is unauthenticated.
    if (ip && !checkIpRateLimit(ip)) {
        return errorResponse("Trop de tentatives. Réessayez dans une minute.", 429);
    }
    const limit = checkRateLimit(`invite-accept:${ip ?? "unknown"}`, 10, 15 * 60 * 1000);
    if (!limit.allowed) {
        return errorResponse("Trop de tentatives. Réessayez plus tard.", 429);
    }

    const data = await validateRequest(request, acceptInvitationSchema);
    const tokenHash = hashInvitationToken(data.token);

    try {
        const user = await prisma.$transaction(
            async (tx) => {
                const invitation = await tx.userInvitation.findUnique({
                    where: { tokenHash },
                    include: { client: { select: { id: true, name: true } } },
                });

                if (!invitation) {
                    throw new InvitationAcceptError("INVALID_TOKEN", "Invitation invalide");
                }
                if (invitation.status === "ACCEPTED") {
                    throw new InvitationAcceptError(
                        "ALREADY_ACCEPTED",
                        "Cette invitation a déjà été utilisée",
                    );
                }
                if (invitation.status === "REVOKED") {
                    throw new InvitationAcceptError("REVOKED", "Cette invitation a été révoquée");
                }
                if (invitation.status !== "PENDING" || invitation.expiresAt < new Date()) {
                    throw new InvitationAcceptError("EXPIRED", "Cette invitation a expiré");
                }

                // Guard against a user created between the invite and now.
                const existing = await tx.user.findUnique({
                    where: { email: invitation.email },
                    select: { id: true },
                });
                if (existing) {
                    throw new InvitationAcceptError(
                        "USER_EXISTS",
                        "Un compte existe déjà pour cette adresse. Connectez-vous.",
                    );
                }

                const metadata = (invitation.metadata ?? {}) as InvitationMetadata;
                const hashedPassword = await bcrypt.hash(data.password, 12);

                const createdUser = await tx.user.create({
                    data: {
                        email: invitation.email,
                        name:
                            data.name?.trim() ||
                            invitation.name?.trim() ||
                            invitation.email.split("@")[0],
                        password: hashedPassword,
                        role: invitation.role,
                        isActive: true,
                        organizationId: invitation.organizationId || null,
                        organizationRole: (metadata.organizationRole as any) || (invitation.organizationId ? "OWNER" : "MEMBER"),
                        clientId: invitation.clientId,
                        invitedById: invitation.invitedById,
                        hasCompletedRoleOnboarding: false,
                        phone: metadata.phone || null,
                        voipProvider: metadata.voipProvider ?? "NONE",
                        alloPhoneNumber: metadata.alloPhoneNumber || null,
                        onoffNumber: metadata.onoffNumber || null,
                        onoffUserId: metadata.onoffUserId || null,
                        ringoverNumber: metadata.ringoverNumber || null,
                    },
                    select: {
                        id: true,
                        email: true,
                        name: true,
                        role: true,
                        clientId: true,
                    },
                });

                await assignDefaultPermissions(tx, createdUser.id, createdUser.role);

                const missionIds = Array.isArray(metadata.assignedMissionIds)
                    ? metadata.assignedMissionIds
                    : [];
                if (missionIds.length > 0) {
                    await tx.sDRAssignment.createMany({
                        data: missionIds.map((missionId) => ({
                            missionId,
                            sdrId: createdUser.id,
                        })),
                        skipDuplicates: true,
                    });
                }

                await tx.userInvitation.update({
                    where: { id: invitation.id },
                    data: { status: "ACCEPTED", acceptedAt: new Date() },
                });

                return createdUser;
            },
            { timeout: 25000 }, // MANAGER seats create ~55 permission rows
        );

        recordAuthEvent({
            outcome: "SUCCESS",
            userId: user.id,
            email: user.email,
            ip,
            userAgent,
            eventTag: "INVITATION_ACCEPTED",
        });

        return successResponse(
            {
                user: { id: user.id, email: user.email, name: user.name, role: user.role },
                redirectPath: getRedirectPath(user.role),
            },
            201,
        );
    } catch (error) {
        if (error instanceof InvitationAcceptError) {
            const status = error.code === "USER_EXISTS" ? 409 : 400;
            return errorResponse(error.message, status);
        }
        throw error;
    }
});
