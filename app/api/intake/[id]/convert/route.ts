import { NextRequest } from "next/server";
import { successResponse, errorResponse, requireRole, withErrorHandler } from "@/lib/api-utils";
import { convertToTask } from "@/lib/intake/service";

// POST /api/intake/[id]/convert - Convert to Task (MANAGER only)
export const POST = withErrorHandler(async (
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) => {
    const session = await requireRole(["MANAGER"], request);
    const { id } = await params;
    const body = await request.json();

    const { projectId, assigneeId, priority } = body;
    if (!projectId) {
        return errorResponse("Projet requis", 400);
    }
    if (!assigneeId) {
        return errorResponse("Assigné requis", 400);
    }

    try {
        const ticket = await convertToTask(id, session.user.id, session.user.name || "Un manager", {
            projectId,
            assigneeId,
            priority,
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
