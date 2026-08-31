// ============================================
// MAILBOX CONNECTION TEST API
// POST /api/email/mailboxes/test - Test IMAP/SMTP connection
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { ImapProvider } from '@/lib/email/providers/imap';

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json(
                { success: false, error: 'Non autorisé' },
                { status: 401 }
            );
        }

        if (!['MANAGER', 'SDR', 'BUSINESS_DEVELOPER', 'CLIENT'].includes(session.user.role)) {
            return NextResponse.json(
                { success: false, error: 'R\u00f4le non autoris\u00e9' },
                { status: 403 }
            );
        }

        const body = await req.json();
        const {
            email,
            password,
            imapHost,
            imapPort,
            smtpHost,
            smtpPort,
        } = body;

        // Validate required fields
        if (!email || !password || !imapHost || !smtpHost) {
            return NextResponse.json(
                { success: false, error: 'Configuration incomplète' },
                { status: 400 }
            );
        }

        const normalizedImapPort = Number(imapPort || 993);
        const normalizedSmtpPort = Number(smtpPort || 587);
        if (
            !Number.isInteger(normalizedImapPort) || normalizedImapPort < 1 || normalizedImapPort > 65535 ||
            !Number.isInteger(normalizedSmtpPort) || normalizedSmtpPort < 1 || normalizedSmtpPort > 65535
        ) {
            return NextResponse.json(
                { success: false, error: 'Ports IMAP/SMTP invalides', imapOk: false, smtpOk: false },
                { status: 400 }
            );
        }

        // Create provider with config
        const provider = new ImapProvider({
            email: email.trim(),
            password,
            imapHost: imapHost.trim(),
            imapPort: normalizedImapPort,
            smtpHost: smtpHost.trim(),
            smtpPort: normalizedSmtpPort,
        });

        // Test connection
        const result = await provider.testConnection();

        return NextResponse.json({
            success: result.success,
            imapOk: result.imapOk,
            smtpOk: result.smtpOk,
            error: result.error,
        });
    } catch (error) {
        console.error('POST /api/email/mailboxes/test error:', error);
        return NextResponse.json(
            { 
                success: false, 
                error: error instanceof Error ? error.message : 'Erreur de test' 
            },
            { status: 500 }
        );
    }
}
