import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
    successResponse,
    errorResponse,
    withErrorHandler,
    validateRequest,
} from "@/lib/api-utils";
import { getClientIp } from "@/lib/geo-ip";
import { checkIpRateLimit, checkRateLimit } from "@/lib/rate-limit";
import { hashInvitationToken, resolveAppBaseUrl } from "@/lib/invitations";
import { sendTransactionalEmail } from "@/lib/email/transactional";

// ============================================
// POST /api/invitations/request-resend  (PUBLIC, rate-limited)
// ============================================
// An invitee whose link expired asks for a new one. This deliberately does NOT
// mint a token: it notifies the inviting manager, who re-sends from the console.
// That keeps issuing accounts a manager-only action.

const requestResendSchema = z.object({
    token: z.string().min(1, "Jeton manquant"),
});

export const POST = withErrorHandler(async (request: NextRequest) => {
    const ip = getClientIp({ headers: request.headers });

    if (ip && !checkIpRateLimit(ip)) {
        return errorResponse("Trop de demandes. Réessayez dans une minute.", 429);
    }
    const limit = checkRateLimit(`invite-resend-request:${ip ?? "unknown"}`, 3, 60 * 60 * 1000);
    if (!limit.allowed) {
        return errorResponse("Demande déjà envoyée. Contactez votre manager directement.", 429);
    }

    const { token } = await validateRequest(request, requestResendSchema);

    const invitation = await prisma.userInvitation.findUnique({
        where: { tokenHash: hashInvitationToken(token) },
        select: {
            id: true,
            email: true,
            name: true,
            role: true,
            status: true,
            invitedBy: { select: { id: true, name: true, email: true } },
        },
    });

    // Same response whether or not the token resolves — no enumeration signal.
    if (!invitation || invitation.status === "ACCEPTED" || !invitation.invitedBy) {
        return successResponse({ requested: true });
    }

    const inviteeLabel = invitation.name
        ? `${invitation.name} (${invitation.email})`
        : invitation.email;
    const consoleUrl = `${resolveAppBaseUrl(request.url)}/manager/utilisateurs`;

    await prisma.notification.create({
        data: {
            userId: invitation.invitedBy.id,
            title: "Demande de renvoi d'invitation",
            message: `${inviteeLabel} demande un nouveau lien d'activation (${invitation.role}).`,
            type: "warning",
            link: "/manager/utilisateurs",
        },
    });

    await sendTransactionalEmail({
        to: invitation.invitedBy.email,
        subject: `Renvoi d'invitation demandé — ${invitation.email}`,
        html: `<p>Bonjour ${invitation.invitedBy.name ?? ""},</p>
<p><strong>${inviteeLabel}</strong> a ouvert un lien d'invitation expiré et demande un nouveau lien d'activation.</p>
<p>Renvoyez-le depuis l'onglet « Invitations en cours » : <a href="${consoleUrl}">${consoleUrl}</a></p>`,
        text: `${inviteeLabel} a ouvert un lien d'invitation expiré et demande un nouveau lien.\nRenvoyez-le depuis ${consoleUrl}`,
    });

    return successResponse({ requested: true });
});
