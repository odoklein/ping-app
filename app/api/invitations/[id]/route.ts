import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
    successResponse,
    errorResponse,
    requireRole,
    withErrorHandler,
} from "@/lib/api-utils";

// ============================================
// DELETE /api/invitations/[id] - Revoke an invitation (MANAGER)
// ============================================
// The row is kept (audit trail) and flipped to REVOKED, which makes the
// activation URL dead immediately: /verify and /accept both reject REVOKED.

export const DELETE = withErrorHandler(
    async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
        await requireRole(["MANAGER"], request);
        const { id } = await params;

        const invitation = await prisma.userInvitation.findUnique({
            where: { id },
            select: { id: true, status: true, email: true },
        });

        if (!invitation) {
            return errorResponse("Invitation introuvable", 404);
        }
        if (invitation.status === "ACCEPTED") {
            return errorResponse(
                "Cette invitation a déjà été acceptée. Désactivez le compte utilisateur à la place.",
                409,
            );
        }
        if (invitation.status === "REVOKED") {
            return successResponse({ id: invitation.id, status: "REVOKED", alreadyRevoked: true });
        }

        const revoked = await prisma.userInvitation.update({
            where: { id },
            data: { status: "REVOKED", revokedAt: new Date() },
            select: { id: true, email: true, status: true, revokedAt: true },
        });

        return successResponse(revoked);
    },
);
