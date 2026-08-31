// ============================================
// MAILBOX API ROUTES
// GET /api/email/mailboxes - List mailboxes
// POST /api/email/mailboxes - Create custom IMAP/SMTP mailbox
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { encrypt } from '@/lib/encryption';
import { MailboxType } from '@prisma/client';
import { scheduleEmailSync } from '@/lib/email/queue';
import { ImapProvider } from '@/lib/email/providers/imap';
import { emailSyncService } from '@/lib/email/services/sync-service';
import {
    MAX_EMAIL_SIGNATURE_LENGTH,
    sanitizeEmailSignatureHtml,
} from '@/lib/email/services/signature-service';

// ============================================
// GET - List user's mailboxes
// ============================================

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json(
                { success: false, error: 'Non autorisé' },
                { status: 401 }
            );
        }

        const { searchParams } = new URL(req.url);
        const includeShared = searchParams.get('includeShared') === 'true';
        const sendableOnly = searchParams.get('sendableOnly') === 'true';
        const includeInactive = searchParams.get('includeInactive') === 'true';
        const type = searchParams.get('type') as MailboxType | null;

        // Get owned mailboxes
        const whereClause = {
            ownerId: session.user.id,
            ...(!includeInactive && { isActive: true }),
            ...(type && { type }),
        };

        const ownedMailboxes = await prisma.mailbox.findMany({
            where: whereClause,
            select: {
                id: true,
                provider: true,
                email: true,
                displayName: true,
                type: true,
                syncStatus: true,
                warmupStatus: true,
                healthScore: true,
                dailySendLimit: true,
                sentToday: true,
                signature: true,
                signatureHtml: true,
                lastSyncAt: true,
                lastError: true,
                isActive: true,
                createdAt: true,
                _count: {
                    select: {
                        threads: true,
                        emails: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        // Get shared mailboxes if requested
        let sharedMailboxes: typeof ownedMailboxes = [];
        if (includeShared) {
            const permissions = await prisma.mailboxPermission.findMany({
                where: {
                    userId: session.user.id,
                    ...(sendableOnly ? { canSend: true } : { canRead: true }),
                },
                include: {
                    mailbox: {
                        select: {
                            id: true,
                            provider: true,
                            email: true,
                            displayName: true,
                            type: true,
                            syncStatus: true,
                            warmupStatus: true,
                            healthScore: true,
                            dailySendLimit: true,
                            sentToday: true,
                            signature: true,
                            signatureHtml: true,
                            lastSyncAt: true,
                            lastError: true,
                            isActive: true,
                            createdAt: true,
                            _count: {
                                select: {
                                    threads: true,
                                    emails: true,
                                },
                            },
                        },
                    },
                },
            });

            sharedMailboxes = permissions
                .map(p => p.mailbox)
                .filter(m => m.isActive);
        }

        // Merge and dedupe
        const allMailboxes = [...ownedMailboxes];
        for (const shared of sharedMailboxes) {
            if (!allMailboxes.find(m => m.id === shared.id)) {
                allMailboxes.push(shared);
            }
        }

        return NextResponse.json({
            success: true,
            data: allMailboxes.map((mailbox) => ({
                ...mailbox,
                signatureHtml: sanitizeEmailSignatureHtml(
                    mailbox.signatureHtml?.slice(0, MAX_EMAIL_SIGNATURE_LENGTH) ?? null
                ),
            })),
        });
    } catch (error) {
        console.error('GET /api/email/mailboxes error:', error);
        return NextResponse.json(
            { success: false, error: 'Erreur serveur' },
            { status: 500 }
        );
    }
}

// ============================================
// POST - Create custom IMAP/SMTP mailbox
// ============================================

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json(
                { success: false, error: 'Non autorisé' },
                { status: 401 }
            );
        }

        // Only allow certain roles (CLIENT for portal IMAP connection)
        const allowedRoles = ['MANAGER', 'SDR', 'BUSINESS_DEVELOPER', 'CLIENT'];
        if (!allowedRoles.includes(session.user.role)) {
            return NextResponse.json(
                { success: false, error: 'Rôle non autorisé' },
                { status: 403 }
            );
        }

        const body = await req.json();
        const {
            email,
            displayName,
            imapHost,
            imapPort,
            smtpHost,
            smtpPort,
            password,
            type: requestedType,
        } = body;

        const type = session.user.role === 'CLIENT' ? 'CLIENT' : (requestedType || 'PERSONAL');
        const normalizedImapPort = Number(imapPort || 993);
        const normalizedSmtpPort = Number(smtpPort || 587);

        // Validate required fields
        if (!email?.trim()) {
            return NextResponse.json(
                { success: false, error: 'Email requis' },
                { status: 400 }
            );
        }

        if (!imapHost || !smtpHost || !password) {
            return NextResponse.json(
                { success: false, error: 'Configuration IMAP/SMTP requise' },
                { status: 400 }
            );
        }

        if (
            !Number.isInteger(normalizedImapPort) || normalizedImapPort < 1 || normalizedImapPort > 65535 ||
            !Number.isInteger(normalizedSmtpPort) || normalizedSmtpPort < 1 || normalizedSmtpPort > 65535
        ) {
            return NextResponse.json(
                { success: false, error: 'Ports IMAP/SMTP invalides' },
                { status: 400 }
            );
        }

        if (!process.env.ENCRYPTION_KEY) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Configuration serveur incompl\u00e8te: ENCRYPTION_KEY est manquante. Les identifiants mail ne peuvent pas \u00eatre enregistr\u00e9s.',
                },
                { status: 503 }
            );
        }

        // Never persist credentials until both protocols have been verified.
        const connection = await new ImapProvider({
            email: email.trim(),
            password,
            imapHost: imapHost.trim(),
            imapPort: normalizedImapPort,
            smtpHost: smtpHost.trim(),
            smtpPort: normalizedSmtpPort,
        }).testConnection();

        if (!connection.success) {
            return NextResponse.json(
                {
                    success: false,
                    error: connection.error || 'Connexion IMAP/SMTP impossible',
                    imapOk: connection.imapOk ?? false,
                    smtpOk: connection.smtpOk ?? false,
                },
                { status: 400 }
            );
        }

        // Check if mailbox already exists
        const existing = await prisma.mailbox.findFirst({
            where: {
                ownerId: session.user.id,
                email: email.trim(),
            },
        });

        if (existing) {
            return NextResponse.json(
                { success: false, error: 'Cette boîte mail est déjà connectée' },
                { status: 400 }
            );
        }

        // Create mailbox
        const mailbox = await prisma.mailbox.create({
            data: {
                ownerId: session.user.id,
                provider: 'CUSTOM',
                email: email.trim(),
                displayName: displayName?.trim() || null,
                imapHost: imapHost.trim(),
                imapPort: normalizedImapPort,
                smtpHost: smtpHost.trim(),
                smtpPort: normalizedSmtpPort,
                password: encrypt(password),
                type: type as MailboxType,
                syncStatus: 'PENDING',
                isActive: true,
            },
            select: {
                id: true,
                provider: true,
                email: true,
                displayName: true,
                type: true,
                syncStatus: true,
                isActive: true,
                createdAt: true,
            },
        });

        // Schedule initial sync (queue-based if Redis available, or trigger synchronously)
        let initialSync: { mode: 'queue' | 'inline'; success: boolean; error?: string };
        try {
            await scheduleEmailSync({
                mailboxId: mailbox.id,
                userId: session.user.id,
                fullSync: true,
                maxThreads: 100,
            });
            console.log('[Mailbox] Initial sync scheduled via queue');
            initialSync = { mode: 'queue', success: true };
        } catch (syncError) {
            console.warn('[Mailbox] Queue not available, running initial sync inline:', syncError instanceof Error ? syncError.message : syncError);
            try {
                const inlineResult = await emailSyncService.syncMailbox(mailbox.id, {
                    fullSync: false,
                    maxThreads: 25,
                });
                initialSync = {
                    mode: 'inline',
                    success: inlineResult.success,
                    error: inlineResult.success ? undefined : inlineResult.errors.join(', '),
                };
            } catch (inlineError) {
                initialSync = {
                    mode: 'inline',
                    success: false,
                    error: inlineError instanceof Error ? inlineError.message : 'Synchronisation initiale impossible',
                };
            }
        }

        return NextResponse.json({
            success: true,
            data: mailbox,
            connection: { imapOk: true, smtpOk: true },
            initialSync,
        });
    } catch (error) {
        console.error('POST /api/email/mailboxes error:', error);
        return NextResponse.json(
            { success: false, error: 'Erreur serveur' },
            { status: 500 }
        );
    }
}
