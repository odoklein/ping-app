import { NextRequest } from "next/server";
import { successResponse, errorResponse, requireRole, withErrorHandler } from "@/lib/api-utils";
import { getTicket } from "@/lib/intake/service";

// GET /api/intake/[id] - Ticket detail (MANAGER only)
export const GET = withErrorHandler(async (request: NextRequest, context: { params: Promise<{ id: string }> }) => {
    await requireRole(["MANAGER"], request);
    const { id } = await context.params;

    const ticket = await getTicket(id);
    if (!ticket) {
        return errorResponse("Ticket introuvable", 404);
    }

    return successResponse(ticket);
});
