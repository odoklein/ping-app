import crypto from "crypto";
import type { UserRole } from "@prisma/client";
import { sendTransactionalEmail } from "@/lib/email/transactional";
import { renderInvitationEmail } from "@/lib/email/templates/invitation";

// ============================================
// INVITATION TOKENS (Phase 2)
// ============================================
// The raw token only ever lives in the invitation email / URL. The database
// stores SHA-256(rawToken) so a database leak cannot be replayed to activate
// an account. SHA-256 (not bcrypt) is used deliberately: the token is 256 bits
// of entropy, so it is not brute-forceable and lookups stay indexable.

export const INVITATION_EXPIRY_DAYS = 7;
export const INVITATION_MIN_PASSWORD_LENGTH = 8;

export interface InvitationMetadata {
    voipProvider?: "ALLO" | "ONOFF" | "RINGOVER" | "NONE";
    phone?: string | null;
    alloPhoneNumber?: string | null;
    onoffNumber?: string | null;
    onoffUserId?: string | null;
    ringoverNumber?: string | null;
    assignedMissionIds?: string[];
}

export function generateInvitationToken(): { rawToken: string; tokenHash: string } {
    const rawToken = crypto.randomBytes(32).toString("hex");
    return { rawToken, tokenHash: hashInvitationToken(rawToken) };
}

export function hashInvitationToken(rawToken: string): string {
    return crypto.createHash("sha256").update(rawToken).digest("hex");
}

export function invitationExpiryDate(from: Date = new Date()): Date {
    return new Date(from.getTime() + INVITATION_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
}

/** Resolve the public base URL used to build the activation link. */
export function resolveAppBaseUrl(requestUrl?: string): string {
    const configured =
        process.env.NEXT_PUBLIC_APP_URL ||
        process.env.NEXTAUTH_URL ||
        (requestUrl ? new URL(requestUrl).origin : null);
    return (configured || "http://localhost:5000").replace(/\/+$/, "");
}

export function buildInviteUrl(rawToken: string, requestUrl?: string): string {
    return `${resolveAppBaseUrl(requestUrl)}/invite/${rawToken}`;
}

/** Roles that must be attached to a Client record. */
export function roleRequiresClient(role: UserRole | string): boolean {
    return role === "CLIENT" || role === "COMMERCIAL";
}

/** Days remaining before an invitation expires (0 when already past). */
export function daysUntil(date: Date): number {
    const ms = date.getTime() - Date.now();
    return ms <= 0 ? 0 : Math.ceil(ms / (24 * 60 * 60 * 1000));
}

/**
 * Renders and sends the invitation email.
 * Returns false when SMTP is not configured or delivery failed — callers keep
 * the invitation row so the manager can copy the link manually.
 */
export async function sendInvitationEmail(params: {
    email: string;
    recipientName: string;
    role: UserRole | string;
    inviterName: string;
    rawToken: string;
    clientName?: string | null;
    requestUrl?: string;
}): Promise<{ sent: boolean; inviteUrl: string }> {
    const inviteUrl = buildInviteUrl(params.rawToken, params.requestUrl);

    const { subject, html, text } = renderInvitationEmail({
        role: params.role,
        recipientName: params.recipientName,
        inviterName: params.inviterName,
        inviteUrl,
        expiryDays: INVITATION_EXPIRY_DAYS,
        companyName: process.env.NEXT_PUBLIC_APP_NAME || "Prospecto",
        clientName: params.clientName ?? null,
    });

    const sent = await sendTransactionalEmail({
        to: params.email,
        subject,
        html,
        text,
    });

    if (!sent) {
        // Dev / unconfigured SMTP: surface the link so the flow stays testable.
        console.warn(
            `[invitations] Email not delivered to ${params.email}. Activation link: ${inviteUrl}`,
        );
    }

    return { sent, inviteUrl };
}

/**
 * Password strength scoring shared by the activation UI and the accept endpoint.
 * Returns a 0-4 score plus the individual checks.
 */
export function scorePassword(password: string): {
    score: number;
    checks: { length: boolean; upper: boolean; lower: boolean; digit: boolean; symbol: boolean };
} {
    const checks = {
        length: password.length >= INVITATION_MIN_PASSWORD_LENGTH,
        upper: /[A-Z]/.test(password),
        lower: /[a-z]/.test(password),
        digit: /\d/.test(password),
        symbol: /[^A-Za-z0-9]/.test(password),
    };
    const passed = Object.values(checks).filter(Boolean).length;
    // Length is a hard gate: without it the password can never rank above "faible".
    if (!checks.length) return { score: Math.min(1, passed), checks };
    return { score: Math.max(1, passed - 1), checks };
}
