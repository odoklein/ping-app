// ============================================
// OUTLOOK OAUTH CONNECT - Initiate OAuth flow
// GET /api/email/oauth/outlook/connect
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { outlookProvider } from '@/lib/email/providers';

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json(
                { success: false, error: 'Non autorisé' },
                { status: 401 }
            );
        }

        // Allow managers, SDRs, BDs, developers, and clients to connect email
        const allowedRoles = ['MANAGER', 'SDR', 'BUSINESS_DEVELOPER', 'DEVELOPER', 'CLIENT'];
        if (!allowedRoles.includes(session.user.role)) {
            return NextResponse.json(
                { success: false, error: 'Rôle non autorisé' },
                { status: 403 }
            );
        }

        if (
            !process.env.MICROSOFT_CLIENT_ID ||
            !process.env.MICROSOFT_CLIENT_SECRET ||
            !process.env.ENCRYPTION_KEY ||
            (!process.env.MICROSOFT_REDIRECT_URI && !process.env.NEXTAUTH_URL)
        ) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'OAuth Microsoft non configur\u00e9: MICROSOFT_CLIENT_ID, MICROSOFT_CLIENT_SECRET, ENCRYPTION_KEY et MICROSOFT_REDIRECT_URI (ou NEXTAUTH_URL) sont requis.',
                },
                { status: 503 }
            );
        }

        const defaultReturn = session.user.role === 'CLIENT' ? '/client/portal/email' : '/manager/email/mailboxes';

        // Create state token with user ID for callback verification
        const state = Buffer.from(JSON.stringify({
            userId: session.user.id,
            timestamp: Date.now(),
            returnUrl: req.nextUrl.searchParams.get('returnUrl') || defaultReturn,
        })).toString('base64url');

        // Get OAuth URL
        const authUrl = outlookProvider.getAuthUrl(state);

        return NextResponse.redirect(authUrl);
    } catch (error) {
        console.error('Outlook OAuth connect error:', error);
        return NextResponse.json(
            { success: false, error: 'Erreur lors de la connexion' },
            { status: 500 }
        );
    }
}
