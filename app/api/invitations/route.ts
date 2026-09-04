import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
    successResponse,
    errorResponse,
    requireRole,
    requireOrganization,
    withErrorHandler,
    validateRequest,
} from "@/lib/api-utils";
import {
    generateInvitationToken,
    invitationExpiryDate,
    sendInvitationEmail,
    roleRequiresClient,
    type InvitationMetadata,
} from "@/lib/invitations";
import { getRoleLabel } from "@/lib/email/templates/invitation";

// ============================================
// GET /api/invitations - List invitations (MANAGER)
// ============================================
// ?status=PENDING|ACCEPTED|EXPIRED|REVOKED|all  (default: PENDING)

export const GET = withErrorHandler(async (request: NextRequest) => {
    const { organizationId } = await requireOrganization(request);

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") ?? "PENDING";

    // Lazily flip stale PENDING rows — scoped to this org only.
    await prisma.userInvitation.updateMany({
        where: { organizationId, status: "PENDING", expiresAt: { lt: new Date() } },
        data: { status: "EXPIRED" },
    });

    const invitations = await prisma.userInvitation.findMany({
        where: status === "all" ? { organizationId } : { organizationId, status: status as never },
        select: {
            id: true,
            email: true,
            name: true,
            role: true,
            status: true,
            expiresAt: true,
            acceptedAt: true,
            revokedAt: true,
            createdAt: true,
            updatedAt: true,
            metadata: true,
            invitedBy: { select: { id: true, name: true, email: true } },
            client: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 200,
    });

    return successResponse({ invitations, total: invitations.length });
});

// ============================================
// POST /api/invitations - Create & send an invitation (MANAGER)
// ============================================

const createInvitationSchema = z
    .object({
        email: z.string().email("Adresse email invalide").trim().toLowerCase(),
        name: z.string().min(2, "Le nom doit comporter au moins 2 caractères").trim(),
        role: z.enum([
            "MANAGER",
            "SDR",
            "CLIENT",
            "COMMERCIAL",
            "BOOKER",
            "DEVELOPER",
            "BUSINESS_DEVELOPER",
        ]),
        clientId: z.string().optional().nullable(),
        voipProvider: z.enum(["ALLO", "ONOFF", "RINGOVER", "NONE"]).optional(),
        phone: z.string().optional(),
        alloPhoneNumber: z.string().optional(),
        onoffNumber: z.string().optional(),
        onoffUserId: z.string().optional(),
        ringoverNumber: z.string().optional(),
        assignedMissionIds: z.array(z.string()).optional(),
    })
    .refine((data) => !(roleRequiresClient(data.role) && !data.clientId), {
        message: "Un client doit être obligatoirement sélectionné pour ce rôle",
        path: ["clientId"],
    });

export const POST = withErrorHandler(async (request: NextRequest) => {
    const { session, organizationId } = await requireOrganization(request);
    const data = await validateRequest(request, createInvitationSchema);

    // 1. Reject if the account already exists.
    const existingUser = await prisma.user.findUnique({
        where: { email: data.email },
        select: { id: true },
    });
    if (existingUser) {
        return errorResponse("Un utilisateur avec cet email existe déjà", 409);
    }

    // 2. Validate the client attachment when the role requires one.
    let clientName: string | null = null;
    const clientId = roleRequiresClient(data.role) ? data.clientId || null : null;
    if (clientId) {
        const client = await prisma.client.findUnique({
            where: { id: clientId },
            select: { id: true, name: true },
        });
        if (!client) {
            return errorResponse("Client introuvable", 404);
        }
        clientName = client.name;
    }

    // 3. Validate pre-assigned missions (SDR / Booker).
    const requestedMissionIds = [...new Set(data.assignedMissionIds ?? [])];
    let assignedMissionIds: string[] = [];
    if (requestedMissionIds.length > 0) {
        const missions = await prisma.mission.findMany({
            where: { id: { in: requestedMissionIds }, organizationId },
            select: { id: true },
        });
        assignedMissionIds = missions.map((m) => m.id);
        if (assignedMissionIds.length !== requestedMissionIds.length) {
            return errorResponse("Une ou plusieurs missions sélectionnées sont introuvables", 404);
        }
    }

    const metadata: InvitationMetadata = {
        voipProvider: data.voipProvider,
        phone: data.phone?.trim() || null,
        alloPhoneNumber: data.alloPhoneNumber?.trim() || null,
        onoffNumber: data.onoffNumber?.trim() || null,
        onoffUserId: data.onoffUserId?.trim() || null,
        ringoverNumber: data.ringoverNumber?.trim() || null,
        assignedMissionIds,
    };

    const { rawToken, tokenHash } = generateInvitationToken();

    // 4. Revoke any previous live invitation for this email, then create the new one.
    const invitation = await prisma.$transaction(async (tx) => {
        await tx.userInvitation.updateMany({
            where: { email: data.email, status: { in: ["PENDING", "EXPIRED"] } },
            data: { status: "REVOKED", revokedAt: new Date() },
        });

        return tx.userInvitation.create({
            data: {
                email: data.email,
                name: data.name,
                role: data.role,
                status: "PENDING",
                tokenHash,
                expiresAt: invitationExpiryDate(),
                invitedById: session.user.id,
                organizationId,
                clientId,
                metadata: metadata as never,
            },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                status: true,
                expiresAt: true,
                createdAt: true,
                metadata: true,
                invitedBy: { select: { id: true, name: true, email: true } },
                client: { select: { id: true, name: true } },
            },
        });
    });

    // 5. Send the email. A delivery failure does not roll back the invitation —
    //    the manager can still copy the activation link from the console.
    const { sent, inviteUrl } = await sendInvitationEmail({
        email: data.email,
        recipientName: data.name,
        role: data.role,
        inviterName: session.user.name || "Votre manager",
        rawToken,
        clientName,
        requestUrl: request.url,
    });

    return successResponse(
        {
            invitation,
            emailSent: sent,
            roleLabel: getRoleLabel(data.role),
            // Returned once, at creation time: the raw token is never retrievable again.
            inviteUrl,
        },
        201,
    );
});
