import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { encryptSecret, maskApiKey } from "@/lib/tenant/crypto";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "MANAGER" && session.user.role !== "DEVELOPER") {
      return NextResponse.json({ success: false, error: "Non autorisé" }, { status: 401 });
    }

    const orgId = session.user.organizationId || "org_default";

    const org = await (prisma as any).organization.findUnique({
      where: { id: orgId },
      select: {
        id: true,
        name: true,
        slug: true,
        customDomain: true,
        plan: true,
        status: true,
        maxUsers: true,
        branding: true,
        voipConfig: true,
        leexiConfig: true,
        smtpConfig: true,
        features: true,
      },
    });

    if (!org) {
      return NextResponse.json({
        success: true,
        organization: {
          id: "org_default",
          name: "Ping Agence Principale",
          slug: "default",
          plan: "ENTERPRISE",
          status: "ACTIVE",
          voipConfig: { provider: "ALLO", alloApiKey: "" },
        },
      });
    }

    // Mask secret keys before sending to frontend
    const voip = (org.voipConfig as any) || {};
    const leexi = (org.leexiConfig as any) || {};
    const smtp = (org.smtpConfig as any) || {};

    const safeOrg = {
      ...org,
      voipConfig: {
        provider: voip.provider || "ALLO",
        alloApiKey: maskApiKey(voip.alloApiKey),
        ringoverApiKey: maskApiKey(voip.ringoverApiKey),
        onoffApiToken: maskApiKey(voip.onoffApiToken),
        hasAlloKey: Boolean(voip.alloApiKey),
        hasRingoverKey: Boolean(voip.ringoverApiKey),
        hasOnoffKey: Boolean(voip.onoffApiToken),
      },
      leexiConfig: {
        keyId: leexi.keyId || "",
        keySecret: maskApiKey(leexi.keySecret),
        hasKeySecret: Boolean(leexi.keySecret),
      },
      smtpConfig: {
        host: smtp.host || "",
        port: smtp.port || 587,
        user: smtp.user || "",
        pass: maskApiKey(smtp.pass),
        fromName: smtp.fromName || "",
        fromEmail: smtp.fromEmail || "",
        hasPass: Boolean(smtp.pass),
      },
    };

    return NextResponse.json({ success: true, organization: safeOrg });
  } catch (err: any) {
    console.error("[GET_TENANT_CONFIG_ERROR]", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "MANAGER" && session.user.role !== "DEVELOPER") {
      return NextResponse.json({ success: false, error: "Non autorisé" }, { status: 401 });
    }

    const orgId = session.user.organizationId || "org_default";
    const body = await req.json();
    const { name, customDomain, voipConfig, leexiConfig, smtpConfig, branding } = body;

    const existingOrg = await (prisma as any).organization.findUnique({
      where: { id: orgId },
    });

    // Prepare encrypted data while preserving existing keys if user didn't retype them
    const existingVoip = (existingOrg?.voipConfig as any) || {};
    const updatedVoip: Record<string, any> = { ...existingVoip };

    if (voipConfig?.provider) updatedVoip.provider = voipConfig.provider;
    if (voipConfig?.alloApiKey && !voipConfig.alloApiKey.includes("••••")) {
      updatedVoip.alloApiKey = encryptSecret(voipConfig.alloApiKey);
    }
    if (voipConfig?.ringoverApiKey && !voipConfig.ringoverApiKey.includes("••••")) {
      updatedVoip.ringoverApiKey = encryptSecret(voipConfig.ringoverApiKey);
    }
    if (voipConfig?.onoffApiToken && !voipConfig.onoffApiToken.includes("••••")) {
      updatedVoip.onoffApiToken = encryptSecret(voipConfig.onoffApiToken);
    }

    const existingLeexi = (existingOrg?.leexiConfig as any) || {};
    const updatedLeexi: Record<string, any> = { ...existingLeexi };
    if (leexiConfig?.keyId) updatedLeexi.keyId = leexiConfig.keyId;
    if (leexiConfig?.keySecret && !leexiConfig.keySecret.includes("••••")) {
      updatedLeexi.keySecret = encryptSecret(leexiConfig.keySecret);
    }

    const existingSmtp = (existingOrg?.smtpConfig as any) || {};
    const updatedSmtp: Record<string, any> = { ...existingSmtp };
    if (smtpConfig?.host) updatedSmtp.host = smtpConfig.host;
    if (smtpConfig?.port) updatedSmtp.port = Number(smtpConfig.port);
    if (smtpConfig?.user) updatedSmtp.user = smtpConfig.user;
    if (smtpConfig?.fromName) updatedSmtp.fromName = smtpConfig.fromName;
    if (smtpConfig?.fromEmail) updatedSmtp.fromEmail = smtpConfig.fromEmail;
    if (smtpConfig?.pass && !smtpConfig.pass.includes("••••")) {
      updatedSmtp.pass = encryptSecret(smtpConfig.pass);
    }

    const updated = await (prisma as any).organization.upsert({
      where: { id: orgId },
      update: {
        ...(name ? { name } : {}),
        ...(customDomain !== undefined ? { customDomain } : {}),
        ...(branding ? { branding } : {}),
        voipConfig: updatedVoip,
        leexiConfig: updatedLeexi,
        smtpConfig: updatedSmtp,
      },
      create: {
        id: orgId,
        name: name || "Mon Agence",
        slug: "default",
        voipConfig: updatedVoip,
        leexiConfig: updatedLeexi,
        smtpConfig: updatedSmtp,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Paramètres et clés API de l'espace enregistrés avec succès.",
      organization: updated,
    });
  } catch (err: any) {
    console.error("[POST_TENANT_CONFIG_ERROR]", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
