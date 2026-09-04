import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";
import { generateInvitationToken } from "@/lib/invitations";
import { sendTransactionalEmail } from "@/lib/email/transactional";
import { renderInvitationEmail } from "@/lib/email/templates/invitation";

export async function GET(req: NextRequest) {
  try {
    await requireSuperAdmin(req);

    const [organizations, totalUsers, totalMissions, totalActions] = await Promise.all([
      (prisma as any).organization.findMany({
        orderBy: { createdAt: "desc" },
        include: {
          _count: {
            select: {
              users: true,
              clients: true,
              missions: true,
              campaigns: true,
              actions: true,
            },
          },
        },
      }),
      (prisma as any).user.count().catch(() => 0),
      (prisma as any).mission.count().catch(() => 0),
      (prisma as any).action.count().catch(() => 0),
    ]);

    const stats = {
      totalOrganizations: organizations.length,
      activeOrganizations: organizations.filter((o: any) => o.status === "ACTIVE").length,
      trialOrganizations: organizations.filter((o: any) => o.status === "TRIAL").length,
      suspendedOrganizations: organizations.filter((o: any) => o.status === "SUSPENDED").length,
      totalUsers: totalUsers || organizations.reduce((acc: number, o: any) => acc + (o._count?.users || 0), 0),
      totalMissions: totalMissions || organizations.reduce((acc: number, o: any) => acc + (o._count?.missions || 0), 0),
      totalActions: totalActions || organizations.reduce((acc: number, o: any) => acc + (o._count?.actions || 0), 0),
      totalClients: organizations.reduce((acc: number, o: any) => acc + (o._count?.clients || 0), 0),
    };

    return NextResponse.json({ success: true, organizations, stats });
  } catch (err: any) {
    if (err.status === 401 || err.status === 403) {
      return NextResponse.json({ success: false, error: err.message }, { status: err.status });
    }
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSuperAdmin(req);
    const body = await req.json();

    const {
      name,
      slug,
      ownerEmail,
      ownerName,
      plan = "PRO",
      maxUsers = 20,
      features = { voipEnabled: true, leexiEnabled: true, emailHubEnabled: true, pdpEnabled: false },
    } = body;

    if (!name || !slug || !ownerEmail) {
      return NextResponse.json(
        { success: false, error: "Le nom de l'agence, le slug et l'email du propriétaire sont requis." },
        { status: 400 }
      );
    }

    const cleanSlug = slug.toLowerCase().replace(/[^a-z0-9-]/g, "");

    // Check slug uniqueness
    const existing = await (prisma as any).organization.findUnique({
      where: { slug: cleanSlug },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: `Le sous-domaine/slug '${cleanSlug}' est déjà réservé par une autre agence.` },
        { status: 409 }
      );
    }

    // 1. Create Organization
    const org = await (prisma as any).organization.create({
      data: {
        name,
        slug: cleanSlug,
        plan,
        maxUsers: Number(maxUsers) || 20,
        status: "ACTIVE",
        features,
        branding: {
          name,
          primaryColor: "#2890F8",
          accentColor: "#080808",
        },
      },
    });

    // 2. Create Owner User Invitation
    const normalizedEmail = ownerEmail.toLowerCase().trim();
    const { rawToken, tokenHash } = generateInvitationToken();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await (prisma as any).userInvitation.create({
      data: {
        email: normalizedEmail,
        name: ownerName || name,
        role: "MANAGER",
        status: "PENDING",
        tokenHash,
        expiresAt,
        invitedById: session.user.id,
        organizationId: org.id,
        metadata: {
          organizationRole: "OWNER",
          organizationName: name,
        },
      },
    });

    const appUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const inviteUrl = `${appUrl}/invite/${rawToken}`;

    // 3. Send transactional welcome email to the agency owner
    const { subject: emailSubject, html: emailHtml, text: emailText } = renderInvitationEmail({
      inviteUrl,
      inviterName: session.user.name || "Le Fondateur de Ping",
      recipientName: ownerName || name,
      role: "MANAGER",
      expiryDays: 7,
      companyName: name,
    });

    const emailSent = await sendTransactionalEmail({
      to: normalizedEmail,
      subject: emailSubject,
      html: emailHtml,
      text: emailText,
    }).catch((err) => {
      console.error({ event: "AGENCY_OWNER_EMAIL_FAIL", orgId: org.id, email: normalizedEmail, error: err.message, timestamp: new Date().toISOString() });
      return false;
    });

    console.log({ event: "TENANT_PROVISIONED", orgId: org.id, slug: cleanSlug, ownerEmail: normalizedEmail, emailSent, invitedBy: session.user.id, timestamp: new Date().toISOString() });

    return NextResponse.json({
      success: true,
      organization: org,
      inviteUrl,
      emailSent,
      message: emailSent
        ? `Espace '${name}' créé avec succès ! L'invitation Propriétaire a été envoyée à ${normalizedEmail}.`
        : `Espace '${name}' créé. Email non délivré (SMTP non configuré). Copiez le lien d'invitation manuellement.`,
    }, { status: 201 });
  } catch (err: any) {
    console.error("[CREATE_ORGANIZATION_ERROR]", err);
    if (err.status === 401 || err.status === 403) {
      return NextResponse.json({ success: false, error: err.message }, { status: err.status });
    }
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
