// ============================================
// POST /api/support/conversation/email-notification
// Client toggles the "email me on reply" preference.
// ============================================

import { NextRequest } from "next/server";
import { z } from "zod";
import { successResponse, requireRole, withErrorHandler, validateRequest } from "@/lib/api-utils";
import { getConversationIdForClientUser, setEmailNotificationPreference } from "@/lib/support/service";

const Body = z.object({
    enabled: z.boolean(),
});

export const POST = withErrorHandler(async (request: NextRequest) => {
    const session = await requireRole(["CLIENT"], request);
    const body = await validateRequest(request, Body);

    const conversationId = await getConversationIdForClientUser(session.user.id);
    if (!conversationId) {
        return successResponse({ updated: false });
    }

    await setEmailNotificationPreference(conversationId, body.enabled);
    return successResponse({ updated: true, enabled: body.enabled });
});
