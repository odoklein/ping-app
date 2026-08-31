import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Prisma } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function csvCell(value: string | number | null | undefined) {
    const text = value == null ? "" : String(value);
    return `"${text.replace(/"/g, '""')}"`;
}

function formatDate(value: Date | null) {
    return value
        ? value.toLocaleString("fr-FR", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        })
        : "";
}

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ success: false, error: "Non autorisé" }, { status: 401 });
        }
        if (session.user.role !== "MANAGER" && session.user.role !== "DEVELOPER") {
            return NextResponse.json({ success: false, error: "Accès non autorisé" }, { status: 403 });
        }

        const { searchParams } = new URL(req.url);
        const missionId = searchParams.get("missionId")?.trim();
        const sdrId = searchParams.get("sdrId")?.trim();
        const status = searchParams.get("status")?.trim();
        const search = searchParams.get("search")?.trim();
        const dateFrom = searchParams.get("dateFrom")?.trim();
        const dateTo = searchParams.get("dateTo")?.trim();
        const hasOpened = searchParams.get("hasOpened");
        const hasClicked = searchParams.get("hasClicked");

        const where: Prisma.EmailWhereInput = {
            direction: "OUTBOUND",
            status: { not: "DRAFT" },
        };

        if (missionId) where.missionId = missionId;
        if (sdrId) where.sentById = sdrId;
        if (status) where.status = status as Prisma.EmailWhereInput["status"];
        if (hasOpened === "true") where.openCount = { gt: 0 };
        if (hasOpened === "false") where.openCount = 0;
        if (hasClicked === "true") where.clickCount = { gt: 0 };
        if (hasClicked === "false") where.clickCount = 0;
        if (dateFrom || dateTo) {
            where.sentAt = {
                ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
                ...(dateTo ? { lte: new Date(`${dateTo}T23:59:59.999`) } : {}),
            };
        }
        if (search) {
            where.OR = [
                { subject: { contains: search, mode: "insensitive" } },
                { contact: { firstName: { contains: search, mode: "insensitive" } } },
                { contact: { lastName: { contains: search, mode: "insensitive" } } },
                { contact: { email: { contains: search, mode: "insensitive" } } },
                { sentBy: { name: { contains: search, mode: "insensitive" } } },
            ];
        }

        const emails = await prisma.email.findMany({
            where,
            orderBy: { sentAt: "desc" },
            take: 5000,
            include: {
                contact: {
                    select: {
                        firstName: true,
                        lastName: true,
                        email: true,
                        company: { select: { name: true } },
                    },
                },
                mission: {
                    select: {
                        name: true,
                        client: { select: { name: true } },
                    },
                },
                sentBy: { select: { name: true, email: true } },
                mailbox: { select: { email: true } },
                template: { select: { name: true } },
            },
        });

        const rows = [
            [
                "Date d'envoi",
                "SDR",
                "Boîte d'envoi",
                "Destinataire",
                "Contact",
                "Société",
                "Mission",
                "Client",
                "Sujet",
                "Modèle",
                "Statut",
                "Ouvertures",
                "Clics",
                "Erreur",
            ],
            ...emails.map((email) => [
                formatDate(email.sentAt),
                email.sentBy?.name || email.sentBy?.email || "",
                email.mailbox.email,
                email.toAddresses.join("; "),
                [email.contact?.firstName, email.contact?.lastName].filter(Boolean).join(" "),
                email.contact?.company?.name || "",
                email.mission?.name || "",
                email.mission?.client?.name || "",
                email.subject,
                email.template?.name || "",
                email.status,
                email.openCount,
                email.clickCount,
                email.errorMessage || "",
            ]),
        ];

        const csv = `\uFEFF${rows.map((row) => row.map(csvCell).join(",")).join("\n")}`;
        const date = new Date().toISOString().slice(0, 10);

        return new NextResponse(csv, {
            headers: {
                "Content-Type": "text/csv; charset=utf-8",
                "Content-Disposition": `attachment; filename="emails-equipe-${date}.csv"`,
            },
        });
    } catch (error) {
        console.error("GET /api/manager/emails/sent/export error:", error);
        return NextResponse.json({ success: false, error: "Erreur serveur" }, { status: 500 });
    }
}
