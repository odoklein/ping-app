import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";
import type {
    ConvertToTaskInput,
    CreateIntakeTicketInput,
    FastLaneDispatchInput,
    LinkExistingTaskInput,
    RejectTicketInput,
} from "./types";

const TICKET_INCLUDE = {
    reportedBy: { select: { id: true, name: true, email: true, role: true } },
    triagedBy: { select: { id: true, name: true } },
    files: true,
    convertedTask: { select: { id: true, title: true, projectId: true } },
    linkedTask: { select: { id: true, title: true, projectId: true } },
} as const;

export async function createTicket(reportedById: string, input: CreateIntakeTicketInput) {
    const ticket = await prisma.intakeTicket.create({
        data: {
            type: input.type,
            title: input.title.trim(),
            description: input.description.trim(),
            severity: input.severity,
            sourceRoute: input.sourceRoute,
            userAgent: input.userAgent,
            viewport: input.viewport || null,
            reportedById,
            files: input.fileIds?.length
                ? { connect: input.fileIds.map((id) => ({ id })) }
                : undefined,
        },
        include: TICKET_INCLUDE,
    });

    // Best-effort: notify every active manager that a new ticket landed in the queue.
    try {
        const managers = await prisma.user.findMany({
            where: { role: "MANAGER", isActive: true },
            select: { id: true },
        });
        await Promise.all(
            managers.map((manager) =>
                createNotification({
                    userId: manager.id,
                    title: "Nouveau ticket à trier",
                    message: `"${ticket.title}" (${ticket.type === "BUG" ? "Bug" : "Feature"}) signalé par ${ticket.reportedBy.name}`,
                    type: "info",
                    link: "/admin/intake",
                }),
            ),
        );
    } catch (error) {
        console.error("Failed to notify managers of new intake ticket:", error);
    }

    return ticket;
}

export async function listTickets(filters: {
    status?: string | null;
    type?: string | null;
    severity?: string | null;
    search?: string | null;
}) {
    const where: any = {};

    if (filters.status) {
        where.status = filters.status.includes(",")
            ? { in: filters.status.split(",") }
            : filters.status;
    }
    if (filters.type) {
        where.type = filters.type;
    }
    if (filters.severity) {
        where.severity = filters.severity;
    }
    if (filters.search) {
        where.OR = [
            { title: { contains: filters.search, mode: "insensitive" } },
            { description: { contains: filters.search, mode: "insensitive" } },
        ];
    }

    return prisma.intakeTicket.findMany({
        where,
        include: TICKET_INCLUDE,
        orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    });
}

export async function getTicket(id: string) {
    return prisma.intakeTicket.findUnique({
        where: { id },
        include: TICKET_INCLUDE,
    });
}

async function assertTriageable(id: string) {
    const ticket = await prisma.intakeTicket.findUnique({ where: { id } });
    if (!ticket) {
        throw new Error("NOT_FOUND");
    }
    if (["CONVERTED", "FAST_LANE", "DUPLICATE", "REJECTED"].includes(ticket.status)) {
        throw new Error("ALREADY_TRIAGED");
    }
    return ticket;
}

export async function convertToTask(
    id: string,
    triagedById: string,
    triagedByName: string,
    input: ConvertToTaskInput,
) {
    await assertTriageable(id);

    return prisma.$transaction(async (tx) => {
        const ticket = await tx.intakeTicket.findUniqueOrThrow({ where: { id } });

        const lastTask = await tx.task.findFirst({
            where: { projectId: input.projectId, status: "TODO", parentTaskId: null },
            orderBy: { position: "desc" },
            select: { position: true },
        });

        const task = await tx.task.create({
            data: {
                projectId: input.projectId,
                title: ticket.title,
                description: ticket.description,
                priority: input.priority || "MEDIUM",
                assigneeId: input.assigneeId,
                createdById: triagedById,
                position: (lastTask?.position ?? -1) + 1,
                labels: [ticket.type === "BUG" ? "Bug" : "Feature Request"],
            },
            include: { project: { select: { name: true } } },
        });

        await tx.projectActivity.create({
            data: {
                projectId: input.projectId,
                taskId: task.id,
                userId: triagedById,
                action: "task_created",
                details: { title: task.title, source: "intake_ticket", intakeTicketId: id },
            },
        });

        const updated = await tx.intakeTicket.update({
            where: { id },
            data: {
                status: "CONVERTED",
                triagedById,
                triagedAt: new Date(),
                convertedTaskId: task.id,
            },
            include: TICKET_INCLUDE,
        });

        await createNotification({
            userId: input.assigneeId,
            title: "Nouvelle tâche assignée",
            message: `"${task.title}" dans le projet ${task.project.name} - assignée par ${triagedByName}`,
            type: "info",
            link: "/developer/tasks",
        });

        return updated;
    });
}

export async function fastLaneDispatch(
    id: string,
    triagedById: string,
    triagedByName: string,
    input: FastLaneDispatchInput,
) {
    await assertTriageable(id);

    return prisma.$transaction(async (tx) => {
        const ticket = await tx.intakeTicket.findUniqueOrThrow({ where: { id } });

        const lastTask = await tx.task.findFirst({
            where: { projectId: input.projectId, status: "TODO", parentTaskId: null },
            orderBy: { position: "desc" },
            select: { position: true },
        });

        const task = await tx.task.create({
            data: {
                projectId: input.projectId,
                title: ticket.title,
                description: ticket.description,
                priority: "URGENT",
                assigneeId: input.assigneeId,
                createdById: triagedById,
                position: (lastTask?.position ?? -1) + 1,
                labels: ["Fast-Lane", ticket.type === "BUG" ? "Bug" : "Feature Request"],
            },
            include: { project: { select: { name: true } } },
        });

        await tx.projectActivity.create({
            data: {
                projectId: input.projectId,
                taskId: task.id,
                userId: triagedById,
                action: "task_created",
                details: { title: task.title, source: "intake_ticket_fast_lane", intakeTicketId: id },
            },
        });

        const updated = await tx.intakeTicket.update({
            where: { id },
            data: {
                status: "FAST_LANE",
                triagedById,
                triagedAt: new Date(),
                convertedTaskId: task.id,
            },
            include: TICKET_INCLUDE,
        });

        await createNotification({
            userId: input.assigneeId,
            title: "Tâche Fast-Lane assignée",
            message: `"${task.title}" (urgent) dans le projet ${task.project.name} - assignée par ${triagedByName}`,
            type: "warning",
            link: "/developer/tasks",
        });

        return updated;
    });
}

export async function linkToExistingTask(id: string, triagedById: string, input: LinkExistingTaskInput) {
    await assertTriageable(id);

    const task = await prisma.task.findUnique({ where: { id: input.taskId }, select: { id: true } });
    if (!task) {
        throw new Error("TASK_NOT_FOUND");
    }

    return prisma.intakeTicket.update({
        where: { id },
        data: {
            status: "DUPLICATE",
            triagedById,
            triagedAt: new Date(),
            linkedTaskId: input.taskId,
        },
        include: TICKET_INCLUDE,
    });
}

export async function rejectTicket(id: string, triagedById: string, input: RejectTicketInput) {
    await assertTriageable(id);

    if (!input.rejectionReason?.trim()) {
        throw new Error("REJECTION_REASON_REQUIRED");
    }

    return prisma.intakeTicket.update({
        where: { id },
        data: {
            status: "REJECTED",
            triagedById,
            triagedAt: new Date(),
            rejectionReason: input.rejectionReason.trim(),
        },
        include: TICKET_INCLUDE,
    });
}
