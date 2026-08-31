// ============================================
// CLIENT SUPPORT MODULE — shared types
// ============================================
//
// The support surface is intentionally separate from the CommsModule:
// - Each client company has exactly ONE support conversation.
// - Every active MANAGER user is considered a participant (broadcast).
// - Messages carry a lightweight role tag so the same thread renders
//   for both the client panel and the manager workspace.

import type {
    SupportConversationStatus,
    SupportIntent,
    SupportMessageRole,
} from "@prisma/client";

export type {
    SupportConversationStatus,
    SupportIntent,
    SupportMessageRole,
};

export interface SupportMessageContext {
    /** Free-form page label injected via the context banner (e.g. "Tableau de bord"). */
    pageLabel?: string;
    /** Route that was active when the message was posted (used for manager triage). */
    pathname?: string;
    /** RDV references injected by the composer (`[@RDV:...]`). */
    rdvRefs?: string[];
    /** Selected intent chip when the message was sent. */
    intent?: SupportIntent;
}

export interface SupportMessageDTO {
    id: string;
    conversationId: string;
    role: SupportMessageRole;
    content: string;
    intent: SupportIntent | null;
    context: SupportMessageContext | null;
    author: {
        id: string;
        name: string;
        role: string;
    } | null;
    createdAt: string;
}

export interface SupportConversationSummaryDTO {
    id: string;
    status: SupportConversationStatus;
    clientId: string;
    clientName: string;
    lastMessageAt: string | null;
    lastMessagePreview: string | null;
    lastIntent: SupportIntent | null;
    messageCount: number;
    unreadCount: number;
    resolvedAt: string | null;
    resolvedBy: { id: string; name: string } | null;
    updatedAt: string;
    isPinned?: boolean;
    emailNotificationOnReply: boolean;
}

export interface SupportConversationDetailDTO extends SupportConversationSummaryDTO {
    messages: SupportMessageDTO[];
}

export interface CreateSupportMessageInput {
    content: string;
    intent?: SupportIntent;
    context?: SupportMessageContext;
}

export interface SupportResolveInput {
    /** Optional note appended as the resolution system message. */
    note?: string;
}

export interface ManagerInboxFilters {
    status?: SupportConversationStatus;
    unreadOnly?: boolean;
    search?: string;
}

/** Intent metadata shared between server responses and the client panel. */
export const SUPPORT_INTENTS: Array<{
    id: SupportIntent;
    icon: string;
    label: string;
}> = [
    { id: "RDV", icon: "📅", label: "Question RDV" },
    { id: "RAPPORT", icon: "📊", label: "Rapport" },
    { id: "PROBLEME", icon: "🔧", label: "Problème" },
    { id: "AUTRE", icon: "💬", label: "Autre" },
];
