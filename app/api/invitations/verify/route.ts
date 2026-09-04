import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { successResponse, withErrorHandler } from "@/lib/api-utils";
import { hashInvitationToken, daysUntil } from "@/lib/invitations";
import { getRoleLabel } from "@/lib/email/templates/invitation";

// ============================================
// GET /api/invitations/verify?token=<rawToken>  (PUBLIC)
// ============================================
// Called by /invite/[token] before rendering the activation form. Always
// returns 200 so the page can render a specific state; `valid` + `error`
// carry the outcome. Nothing beyond what the invitee already knows is exposed.

export type InvitationVerifyError =
    | "MISSING_TOKEN"
    | "INVALID_TOKEN"
    | "ALREADY_ACCEPTED"
    | "EXPIRED"
    | "REVOKED";

export const GET = withErrorHandler(async (request: NextRequest) => {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token")?.trim();

    if (!token) {
        return successResponse({ valid: false, error: "MISSING_TOKEN" as InvitationVerifyError });
    }

    const invitation = await prisma.userInvitation.findUnique({
        where: { tokenHash: hashInvitationToken(token) },
        select: {
            id: true,
            email: true,
            name: true,
            role: true,
            status: true,
            expiresAt: true,
            client: { select: { name: true } },
            invitedBy: { select: { name: true } },
        },
    });

    if (!invitation) {
        return successResponse({ valid: false, error: "INVALID_TOKEN" as InvitationVerifyError });
    }

    if (invitation.status === "REVOKED") {
        return successResponse({ valid: false, error: "REVOKED" as InvitationVerifyError });
    }

    if (invitation.status === "ACCEPTED") {
        return successResponse({
            valid: false,
            error: "ALREADY_ACCEPTED" as InvitationVerifyError,
            invitation: { email: invitation.email },
        });
    }

    if (invitation.expiresAt < new Date()) {
        if (invitation.status !== "EXPIRED") {
            await prisma.userInvitation.update({
                where: { id: invitation.id },
                data: { status: "EXPIRED" },
            });
        }
        return successResponse({
            valid: false,
            error: "EXPIRED" as InvitationVerifyError,
            invitation: { email: invitation.email, inviterName: invitation.invitedBy?.name ?? null },
        });
    }

    return successResponse({
        valid: true,
        invitation: {
            email: invitation.email,
            name: invitation.name,
            role: invitation.role,
            roleLabel: getRoleLabel(invitation.role),
            clientName: invitation.client?.name ?? null,
            inviterName: invitation.invitedBy?.name ?? null,
            expiresAt: invitation.expiresAt.toISOString(),
            daysRemaining: daysUntil(invitation.expiresAt),
        },
    });
});
