// ============================================
// POST /api/support/conversation/reopen
// Client reopens their own support conversation after it was resolved.
// ============================================

import { NextRequest } from "next/server";
import {
    successResponse,
    requireAuth,
    withErrorHandler,
    AuthError,
    NotFoundError,
} from "@/lib/api-utils";
import {
    getConversationIdForClientUser,
    reopenConversation,
} from "@/lib/support/service";

export const POST = withErrorHandler(async (request: NextRequest) => {
    const session = await requireAuth(request);
    if (session.user.role !== "CLIENT" && session.user.role !== "COMMERCIAL") {
        throw new AuthError("Réservé aux clients/commerciaux", 403);
    }
    const conversationId = await getConversationIdForClientUser(session.user.id);
    if (!conversationId) {
        throw new NotFoundError("Aucune conversation de support disponible");
    }
    await reopenConversation(
        conversationId,
        session.user.id,
        session.user.name ?? "Client",
        "CLIENT",
    );
    return successResponse({ ok: true });
});
