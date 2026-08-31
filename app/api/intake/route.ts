import { NextRequest } from "next/server";
import {
    successResponse,
    errorResponse,
    requireAuth,
    requireRole,
    withErrorHandler,
} from "@/lib/api-utils";
import { createTicket, listTickets } from "@/lib/intake/service";

// POST /api/intake - Submit a ticket (any authenticated user)
export const POST = withErrorHandler(async (request: NextRequest) => {
    const session = await requireAuth(request);
    const body = await request.json();

    const { type, title, description, severity, sourceRoute, userAgent, viewport, fileIds } = body;

    if (!title?.trim()) {
        return errorResponse("Titre requis", 400);
    }
    if (!description?.trim()) {
        return errorResponse("Description requise", 400);
    }
    if (!["BUG", "FEATURE_REQUEST"].includes(type)) {
        return errorResponse("Type invalide", 400);
    }
    if (!["LOW", "MEDIUM", "HIGH", "CRITICAL"].includes(severity)) {
        return errorResponse("Sévérité invalide", 400);
    }

    const ticket = await createTicket(session.user.id, {
        type,
        title,
        description,
        severity,
        sourceRoute: sourceRoute || "unknown",
        userAgent: userAgent || "unknown",
        viewport: viewport || null,
        fileIds: Array.isArray(fileIds) ? fileIds : [],
    });

    return successResponse(ticket, 201);
});

// GET /api/intake - List tickets for triage (MANAGER only)
export const GET = withErrorHandler(async (request: NextRequest) => {
    await requireRole(["MANAGER"], request);

    const { searchParams } = new URL(request.url);
    const tickets = await listTickets({
        status: searchParams.get("status"),
        type: searchParams.get("type"),
        severity: searchParams.get("severity"),
        search: searchParams.get("search"),
    });

    return successResponse(tickets);
});
