import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { processTemplate } from '@/lib/email/services/template-variables';
import { emailSendingService } from '@/lib/email/services/sending-service';

type QuickSendRecipient = string | { email?: string; name?: string };

// POST /api/email/quick-send - Send email using template with variable substitution
export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 401 });
        }

        const body = await req.json();
        const {
            mailboxId,
            templateId,
            to,
            contactId,
            companyId,
            missionId,
            customSubject,
            customBodyHtml,
            customData
        } = body;

        // Validate required fields
        if (!mailboxId) {
            return NextResponse.json(
                { success: false, error: 'mailboxId requis' },
                { status: 400 }
            );
        }

        const recipients = (Array.isArray(to) ? to : [])
            .map((recipient: QuickSendRecipient) => {
                if (typeof recipient === 'string') return { email: recipient.trim() };
                return {
                    email: recipient.email?.trim() || '',
                    name: recipient.name?.trim() || undefined,
                };
            })
            .filter((recipient: { email: string }) => recipient.email.length > 0);

        if (recipients.length === 0) {
            return NextResponse.json(
                { success: false, error: 'Destinataire requis' },
                { status: 400 }
            );
        }

        // Check mailbox ownership / access
        let mailbox = await prisma.mailbox.findFirst({
            where: {
                id: mailboxId,
                OR: [
                    { ownerId: session.user.id },
                    { permissions: { some: { userId: session.user.id, canSend: true } } },
                ],
            },
        });

        // If not directly owned or shared, allow mission-level default mailbox
        // when the current user is assigned as SDR on that mission.
        if (!mailbox && missionId) {
            const mission = await prisma.mission.findUnique({
                where: { id: missionId },
                select: {
                    defaultMailboxId: true,
                    sdrAssignments: { select: { sdrId: true } },
                },
            });

            const isAssignedSdr =
                mission?.sdrAssignments.some((a) => a.sdrId === session.user.id) ?? false;

            if (mission?.defaultMailboxId === mailboxId && isAssignedSdr) {
                mailbox = await prisma.mailbox.findUnique({ where: { id: mailboxId } });
            }
        }

        if (!mailbox) {
            return NextResponse.json(
                { success: false, error: 'Mailbox non trouvé ou non autorisé' },
                { status: 404 }
            );
        }

        let subject: string;
        let bodyHtml: string;
        let bodyText: string | null = null;

        // If using a template, fetch and process it
        if (templateId) {
            const template = await prisma.emailTemplate.findUnique({
                where: { id: templateId }
            });

            if (!template) {
                return NextResponse.json(
                    { success: false, error: 'Template non trouvé' },
                    { status: 404 }
                );
            }

            // Process template with variable substitution
            const processed = await processTemplate(
                customSubject || template.subject,
                customBodyHtml || template.bodyHtml,
                template.bodyText,
                {
                    contactId,
                    companyId,
                    customData
                }
            );

            subject = processed.subject;
            bodyHtml = processed.bodyHtml;
            bodyText = processed.bodyText;

        } else {
            // Custom email without template
            if (!customSubject || !customBodyHtml) {
                return NextResponse.json(
                    { success: false, error: 'Template ou contenu personnalisé requis' },
                    { status: 400 }
                );
            }

            // Still process variables if contact/company provided
            const processed = await processTemplate(
                customSubject,
                customBodyHtml,
                null,
                {
                    contactId,
                    companyId,
                    customData
                }
            );

            subject = processed.subject;
            bodyHtml = processed.bodyHtml;
            bodyText = processed.bodyText;
        }

        if (!subject.trim()) {
            return NextResponse.json(
                { success: false, error: 'Objet requis' },
                { status: 400 }
            );
        }

        if (!bodyHtml.trim() && !bodyText?.trim()) {
            return NextResponse.json(
                { success: false, error: 'Contenu requis' },
                { status: 400 }
            );
        }

        // Call the shared service directly. A server-to-self HTTP request is
        // unreliable on serverless deployments and duplicates auth work.
        const sendResult = await emailSendingService.sendEmail(mailboxId, {
            to: recipients,
            subject,
            bodyHtml: bodyHtml || undefined,
            bodyText: bodyText || undefined,
            contactId: contactId || undefined,
            missionId: missionId || undefined,
            sentById: session.user.id,
            templateId: templateId || undefined,
        });

        if (!sendResult.success) {
            console.error('Quick email send failed', {
                mailboxId,
                missionId: missionId || null,
                contactId: contactId || null,
                error: sendResult.error,
            });
            return NextResponse.json(
                { success: false, error: sendResult.error || 'Erreur d\'envoi' },
                { status: 502 }
            );
        }

        if (templateId) {
            try {
                await prisma.emailTemplate.update({
                    where: { id: templateId },
                    data: {
                        useCount: { increment: 1 },
                        lastUsedAt: new Date()
                    }
                });
            } catch (usageError) {
                // Sending already succeeded. Do not turn analytics bookkeeping
                // into a client-visible failure that could trigger a duplicate send.
                console.warn('Email sent but template usage update failed', {
                    templateId,
                    error: usageError instanceof Error ? usageError.message : String(usageError),
                });
            }
        }

        return NextResponse.json({
            success: true,
            data: {
                messageId: sendResult.messageId,
                subject,
                to: recipients
            }
        });
    } catch (error) {
        console.error('POST /api/email/quick-send error:', error);
        return NextResponse.json(
            { success: false, error: 'Erreur serveur' },
            { status: 500 }
        );
    }
}
