import { NextRequest } from "next/server";
import { successResponse, errorResponse, requireRole, withErrorHandler } from "@/lib/api-utils";
import { rejectTicket } from "@/lib/intake/service";

// POST /api/intake/[id]/reject - Reject (MANAGER only, reason required)
export const POST = withErrorHandler(async (
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) => {
    const session = await requireRole(["MANAGER"], request);
    const { id } = await params;
    const body = await request.json();

    const { rejectionReason } = body;
    if (!rejectionReason?.trim()) {
        return errorResponse("Motif de rejet requis", 400);
    }

    try {
        const ticket = await rejectTicket(id, session.user.id, { rejectionReason });
        return successResponse(ticket);
    } catch (error) {
        if (error instanceof Error && error.message === "ALREADY_TRIAGED") {
            return errorResponse("Ce ticket a déjà été trié", 409);
        }
        if (error instanceof Error && error.message === "NOT_FOUND") {
            return errorResponse("Ticket introuvable", 404);
        }
        if (error instanceof Error && error.message === "REJECTION_REASON_REQUIRED") {
            return errorResponse("Motif de rejet requis", 400);
        }
        throw error;
    }
});
