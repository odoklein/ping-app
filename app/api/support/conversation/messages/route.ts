// ============================================
// POST /api/support/conversation/messages
// Client sends a support message. Auto-creates the conversation.
// ============================================

import { NextRequest } from "next/server";
import { z } from "zod";
import {
    successResponse,
    requireAuth,
    withErrorHandler,
    validateRequest,
    AuthError,
    NotFoundError,
} from "@/lib/api-utils";
import {
    getConversationIdForClientUser,
    postMessage,
} from "@/lib/support/service";
import { notifyManagersClientSupportMessage } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";
import type { SupportIntent } from "@prisma/client";

const PostBody = z.object({
    content: z.string().min(1).max(4000),
    intent: z.enum(["RDV", "RAPPORT", "PROBLEME", "AUTRE"]).optional(),
    context: z
        .object({
            pageLabel: z.string().max(120).optional(),
            pathname: z.string().max(200).optional(),
            rdvRefs: z.array(z.string().max(160)).max(10).optional(),
            intent: z.enum(["RDV", "RAPPORT", "PROBLEME", "AUTRE"]).optional(),
        })
        .optional(),
});

export const POST = withErrorHandler(async (request: NextRequest) => {
    const session = await requireAuth(request);
    if (session.user.role !== "CLIENT" && session.user.role !== "COMMERCIAL") {
        throw new AuthError("Réservé aux clients/commerciaux", 403);
    }
    const body = await validateRequest(request, PostBody);

    const conversationId = await getConversationIdForClientUser(session.user.id);
    if (!conversationId) {
        throw new NotFoundError("Aucune conversation de support disponible");
    }

    const message = await postMessage(
        conversationId,
        session.user.id,
        {
            content: body.content,
            intent: body.intent as SupportIntent | undefined,
            context: body.context,
        },
        "CLIENT",
    );

    const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { client: { select: { name: true } } },
    });
    notifyManagersClientSupportMessage({
        clientName: user?.client?.name ?? "Client",
        messagePreview: body.content,
        intent: body.intent ?? null,
    }).catch(() => {});

    return successResponse(message, 201);
});
