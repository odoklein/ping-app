import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
    successResponse,
    errorResponse,
    requireRole,
    withErrorHandler,
} from "@/lib/api-utils";
import {
    generateInvitationToken,
    invitationExpiryDate,
    sendInvitationEmail,
    buildInviteUrl,
    INVITATION_EXPIRY_DAYS,
} from "@/lib/invitations";

// ============================================
// POST /api/invitations/[id]/resend  (MANAGER)
// ============================================
// Rotates the token, pushes the expiry back to +7 days and (by default) sends
// a fresh email. Because only the SHA-256 hash is stored, the previous link
// cannot be re-read — so this is also how the console obtains a shareable link
// after creation: call it with { sendEmail: false }.

const resendSchema = z.object({
    sendEmail: z.boolean().optional().default(true),
});

export const POST = withErrorHandler(
    async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
        const session = await requireRole(["MANAGER"], request);
        const { id } = await params;

        // Body is optional on this endpoint.
        let sendEmail = true;
        try {
            const raw = await request.json();
            sendEmail = resendSchema.parse(raw ?? {}).sendEmail;
        } catch {
            sendEmail = true;
        }

        const invitation = await prisma.userInvitation.findUnique({
            where: { id },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                status: true,
                client: { select: { name: true } },
            },
        });

        if (!invitation) {
            return errorResponse("Invitation introuvable", 404);
        }
        if (invitation.status === "ACCEPTED") {
            return errorResponse("Cette invitation a déjà été acceptée", 409);
        }

        // Guard the race where the account was created some other way.
        const existingUser = await prisma.user.findUnique({
            where: { email: invitation.email },
            select: { id: true },
        });
        if (existingUser) {
            return errorResponse("Un utilisateur avec cet email existe déjà", 409);
        }

        const { rawToken, tokenHash } = generateInvitationToken();

        const updated = await prisma.userInvitation.update({
            where: { id },
            data: {
                tokenHash,
                expiresAt: invitationExpiryDate(),
                status: "PENDING",
                revokedAt: null,
                invitedById: session.user.id,
            },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                status: true,
                expiresAt: true,
                createdAt: true,
                updatedAt: true,
                metadata: true,
                invitedBy: { select: { id: true, name: true, email: true } },
                client: { select: { id: true, name: true } },
            },
        });

        let emailSent = false;
        let inviteUrl = buildInviteUrl(rawToken, request.url);

        if (sendEmail) {
            const result = await sendInvitationEmail({
                email: invitation.email,
                recipientName: invitation.name || invitation.email.split("@")[0],
                role: invitation.role,
                inviterName: session.user.name || "Votre manager",
                rawToken,
                clientName: invitation.client?.name ?? null,
                requestUrl: request.url,
            });
            emailSent = result.sent;
            inviteUrl = result.inviteUrl;
        }

        return successResponse({
            invitation: updated,
            emailSent,
            inviteUrl,
            expiryDays: INVITATION_EXPIRY_DAYS,
        });
    },
);
