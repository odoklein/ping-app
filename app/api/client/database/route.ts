import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, successResponse, withErrorHandler } from "@/lib/api-utils";

export const GET = withErrorHandler(async (request: NextRequest) => {
    const session = await requireRole(["CLIENT", "COMMERCIAL"], request);
    let clientId = (session.user as { clientId?: string | null }).clientId;

    if (!clientId && session.user.role === "COMMERCIAL") {
        const commercialUser = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { interlocuteur: { select: { clientId: true } } },
        });
        clientId = commercialUser?.interlocuteur?.clientId ?? null;
    }

    if (!clientId) {
        return successResponse({ companies: [] });
    }

    const companies = await prisma.company.findMany({
        where: {
            list: {
                mission: {
                    clientId,
                },
            },
        },
        orderBy: { createdAt: "desc" },
        select: {
            id: true,
            name: true,
            country: true,
            industry: true,
            size: true,
            phone: true,
            website: true,
            createdAt: true,
            status: true,
            list: {
                select: {
                    id: true,
                    name: true,
                    mission: {
                        select: {
                            id: true,
                            name: true,
                        },
                    },
                },
            },
            contacts: {
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    title: true,
                    email: true,
                    phone: true,
                    linkedin: true,
                    additionalPhones: true,
                    additionalEmails: true,
                },
            },
            actions: {
                take: 1,
                orderBy: { createdAt: "desc" },
                select: {
                    id: true,
                    result: true,
                    channel: true,
                    createdAt: true,
                },
            },
            _count: {
                select: {
                    contacts: true,
                    actions: true,
                },
            },
        },
    });

    return successResponse({ companies });
});

