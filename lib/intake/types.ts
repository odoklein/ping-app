import type {
    IntakeTicket,
    IntakeTicketSeverity,
    IntakeTicketStatus,
    IntakeTicketType,
    File as PrismaFile,
} from "@prisma/client";

export type { IntakeTicketSeverity, IntakeTicketStatus, IntakeTicketType };

export interface CreateIntakeTicketInput {
    type: IntakeTicketType;
    title: string;
    description: string;
    severity: IntakeTicketSeverity;
    sourceRoute: string;
    userAgent: string;
    viewport?: string | null;
    fileIds?: string[];
}

export interface ConvertToTaskInput {
    projectId: string;
    assigneeId: string;
    priority?: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
}

export interface FastLaneDispatchInput {
    projectId: string;
    assigneeId: string;
}

export interface LinkExistingTaskInput {
    taskId: string;
}

export interface RejectTicketInput {
    rejectionReason: string;
}

export type IntakeTicketWithRelations = IntakeTicket & {
    reportedBy: { id: string; name: string; email: string; role: string };
    triagedBy: { id: string; name: string } | null;
    files: PrismaFile[];
    convertedTask: { id: string; title: string; projectId: string } | null;
    linkedTask: { id: string; title: string; projectId: string } | null;
};
