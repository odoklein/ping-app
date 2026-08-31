// ============================================
// POST /api/support/manager/conversations/[id]/messages
// Manager replies to a support conversation.
// ============================================

import { NextRequest } from "next/server";
import { z } from "zod";
import {
    successResponse,
    requireRole,
    withErrorHandler,
    validateRequest,
} from "@/lib/api-utils";
import { postMessage, notifyClientByEmailIfEnabled } from "@/lib/support/service";

const PostBody = z.object({
    content: z.string().min(1).max(4000),
});

export const POST = withErrorHandler(async (
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) => {
    const session = await requireRole(["MANAGER"], request);
    const { id } = await params;
    const body = await validateRequest(request, PostBody);
    const message = await postMessage(
        id,
        session.user.id,
        { content: body.content },
        "MANAGER",
    );

    notifyClientByEmailIfEnabled(id, session.user.name ?? "L'équipe support", body.content).catch(
        () => undefined,
    );

    return successResponse(message, 201);
});
