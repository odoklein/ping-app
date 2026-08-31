import { NextRequest } from "next/server";
import { successResponse, errorResponse, requireRole, withErrorHandler } from "@/lib/api-utils";
import { linkToExistingTask } from "@/lib/intake/service";

// POST /api/intake/[id]/link - Link to Existing Task -> DUPLICATE (MANAGER only)
export const POST = withErrorHandler(async (
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) => {
    const session = await requireRole(["MANAGER"], request);
    const { id } = await params;
    const body = await request.json();

    const { taskId } = body;
    if (!taskId) {
        return errorResponse("Tâche existante requise", 400);
    }

    try {
        const ticket = await linkToExistingTask(id, session.user.id, { taskId });
        return successResponse(ticket);
    } catch (error) {
        if (error instanceof Error && error.message === "ALREADY_TRIAGED") {
            return errorResponse("Ce ticket a déjà été trié", 409);
        }
        if (error instanceof Error && error.message === "NOT_FOUND") {
            return errorResponse("Ticket introuvable", 404);
        }
        if (error instanceof Error && error.message === "TASK_NOT_FOUND") {
            return errorResponse("Tâche cible introuvable", 404);
        }
        throw error;
    }
});
