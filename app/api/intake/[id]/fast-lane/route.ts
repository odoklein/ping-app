import { NextRequest } from "next/server";
import { successResponse, errorResponse, requireRole, withErrorHandler } from "@/lib/api-utils";
import { fastLaneDispatch } from "@/lib/intake/service";

// POST /api/intake/[id]/fast-lane - Fast-Lane Dispatch (MANAGER only)
export const POST = withErrorHandler(async (
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) => {
    const session = await requireRole(["MANAGER"], request);
    const { id } = await params;
    const body = await request.json();

    const { projectId, assigneeId } = body;
    if (!projectId) {
        return errorResponse("Projet requis", 400);
    }
    if (!assigneeId) {
        return errorResponse("Assigné requis (dispatch immédiat)", 400);
    }

    try {
        const ticket = await fastLaneDispatch(id, session.user.id, session.user.name || "Un manager", {
            projectId,
            assigneeId,
        });
        return successResponse(ticket);
    } catch (error) {
        if (error instanceof Error && error.message === "ALREADY_TRIAGED") {
            return errorResponse("Ce ticket a déjà été trié", 409);
        }
        if (error instanceof Error && error.message === "NOT_FOUND") {
            return errorResponse("Ticket introuvable", 404);
        }
        throw error;
    }
});
