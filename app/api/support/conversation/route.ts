// ============================================
// GET /api/support/conversation
// Returns the single support conversation for the authenticated client.
// Creates the conversation on first access.
// ============================================

import { NextRequest } from "next/server";
import {
    successResponse,
    errorResponse,
    requireAuth,
    withErrorHandler,
    AuthError,
} from "@/lib/api-utils";
import { getConversationForClientUser } from "@/lib/support/service";

export const GET = withErrorHandler(async (request: NextRequest) => {
    const session = await requireAuth(request);
    if (session.user.role !== "CLIENT" && session.user.role !== "COMMERCIAL") {
        throw new AuthError("Réservé aux clients/commerciaux", 403);
    }
    const conversation = await getConversationForClientUser(session.user.id);
    if (!conversation) {
        return errorResponse(
            "Aucune société cliente n'est associée à votre compte",
            404,
        );
    }
    return successResponse(conversation);
});
