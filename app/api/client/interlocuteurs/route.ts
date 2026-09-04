import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
    successResponse,
    errorResponse,
    requireRole,
    withErrorHandler,
    validateRequest,
} from "@/lib/api-utils";

// ============================================
// /api/client/interlocuteurs  (CLIENT, own account only)
// ============================================
// Lets a client declare its own sales reps during onboarding. Scoped to the
// session's clientId — a client can never touch another account's records.
// (The manager-side equivalent is /api/clients/[id]/interlocuteurs.)

async function resolveClientId(userId: string): Promise<string | null> {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { clientId: true },
    });
    return user?.clientId ?? null;
}

export const GET = withErrorHandler(async (request: NextRequest) => {
    const session = await requireRole(["CLIENT"], request);
    const clientId = await resolveClientId(session.user.id);
    if (!clientId) return errorResponse("Aucun compte client rattaché", 403);

    const interlocuteurs = await prisma.clientInterlocuteur.findMany({
        where: { clientId },
        select: {
            id: true,
            firstName: true,
            lastName: true,
            title: true,
            territory: true,
            emails: true,
            phones: true,
            bookingLinks: true,
            isActive: true,
        },
        orderBy: { createdAt: "asc" },
    });

    return successResponse(interlocuteurs);
});

const createSchema = z.object({
    firstName: z.string().min(1, "Prénom requis").trim(),
    lastName: z.string().min(1, "Nom requis").trim(),
    title: z.string().trim().optional(),
    territory: z.string().trim().optional(),
    email: z.string().email("Email invalide").trim().toLowerCase(),
    phone: z.string().trim().optional(),
    bookingUrl: z.string().url("Lien de visio invalide").optional().or(z.literal("")),
    bookingLabel: z.string().trim().optional(),
});

export const POST = withErrorHandler(async (request: NextRequest) => {
    const session = await requireRole(["CLIENT"], request);
    const clientId = await resolveClientId(session.user.id);
    if (!clientId) return errorResponse("Aucun compte client rattaché", 403);

    const data = await validateRequest(request, createSchema);

    const interlocuteur = await prisma.clientInterlocuteur.create({
        data: {
            clientId,
            firstName: data.firstName,
            lastName: data.lastName,
            title: data.title || null,
            territory: data.territory || null,
            emails: [{ value: data.email, label: "Professionnel", isPrimary: true }] as never,
            phones: data.phone
                ? ([{ value: data.phone, label: "Mobile", isPrimary: true }] as never)
                : ([] as never),
            bookingLinks: data.bookingUrl
                ? ([
                      {
                          label: data.bookingLabel || "Prise de rendez-vous",
                          url: data.bookingUrl,
                          durationMinutes: 30,
                      },
                  ] as never)
                : ([] as never),
            isActive: true,
        },
        select: {
            id: true,
            firstName: true,
            lastName: true,
            title: true,
            territory: true,
            emails: true,
            phones: true,
            bookingLinks: true,
            isActive: true,
        },
    });

    return successResponse(interlocuteur, 201);
});
