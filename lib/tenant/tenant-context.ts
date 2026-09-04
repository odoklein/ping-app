import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { decryptSecret } from "./crypto";

export interface TenantContext {
  id: string;
  name: string;
  slug: string;
  plan: string;
  status: string;
  branding?: any;
  features?: any;
}

export const DEFAULT_TENANT_ID = "org_default";
export const DEFAULT_TENANT_SLUG = "default";

/**
 * Extracts the tenant slug or ID from request (subdomain, header, cookie, or session).
 *
 * Security note: x-organization-* headers are only honoured for platform super-admins
 * (organizationId === "org_default"). Accepting them from arbitrary tenants would allow
 * any authenticated user to impersonate another tenant's context.
 */
export async function resolveCurrentTenant(request?: NextRequest): Promise<string> {
  // 1. Session-first: establish who the caller is before trusting headers/cookies.
  const session = await getServerSession(authOptions);
  const callerOrgId = session?.user?.organizationId;
  const isSuperAdmin =
    callerOrgId === "org_default" ||
    session?.user?.email === "admin@ping-crm.com";

  if (request) {
    // 2. Explicit header — only for super-admins performing tenant impersonation.
    if (isSuperAdmin) {
      const headerOrg =
        request.headers.get("x-organization-slug") ||
        request.headers.get("x-organization-id");
      if (headerOrg && headerOrg.trim()) {
        return headerOrg.trim();
      }
    }

    // 3. Subdomain extraction: [subdomain].domain.com
    const host = request.headers.get("host") || "";
    const hostname = host.split(":")[0];
    const parts = hostname.split(".");
    if (parts.length >= 3) {
      const subdomain = parts[0].toLowerCase();
      if (!["www", "app", "api", "staging", "dev", "admin"].includes(subdomain)) {
        return subdomain;
      }
    }

    // 4. Support-impersonation cookie — only honoured for super-admins.
    if (isSuperAdmin) {
      const cookieSlug = request.cookies.get("active_tenant_slug")?.value;
      if (cookieSlug) return decodeURIComponent(cookieSlug);
    }
  }

  // 5. Session fallback — always scope to the caller's own organisation.
  if (callerOrgId) {
    return callerOrgId;
  }

  return DEFAULT_TENANT_SLUG;
}

/**
 * Retrieves the Organization entity with active configuration
 */
export async function getActiveOrganization(tenantIdentifier?: string): Promise<TenantContext | null> {
  const identifier = tenantIdentifier || DEFAULT_TENANT_SLUG;

  try {
    const org = await (prisma as any).organization.findFirst({
      where: {
        OR: [
          { id: identifier },
          { slug: identifier },
          { customDomain: identifier },
        ],
      },
    });

    if (!org) {
      return {
        id: DEFAULT_TENANT_ID,
        name: "Ping Agence Principale",
        slug: DEFAULT_TENANT_SLUG,
        plan: "ENTERPRISE",
        status: "ACTIVE",
      };
    }

    return {
      id: org.id,
      name: org.name,
      slug: org.slug,
      plan: org.plan,
      status: org.status,
      branding: org.branding,
      features: org.features,
    };
  } catch {
    // If table not yet migrated, graceful fallback
    return {
      id: DEFAULT_TENANT_ID,
      name: "Ping Agence Principale",
      slug: DEFAULT_TENANT_SLUG,
      plan: "ENTERPRISE",
      status: "ACTIVE",
    };
  }
}

/**
 * Retrieves and securely decrypts API keys for an organization.
 * Falls back to process.env if the organization has not configured custom keys.
 */
export async function getTenantApiKeys(organizationId: string) {
  try {
    const org = await (prisma as any).organization.findUnique({
      where: { id: organizationId },
      select: { voipConfig: true, leexiConfig: true, smtpConfig: true },
    });

    const voip = (org?.voipConfig as any) || {};
    const leexi = (org?.leexiConfig as any) || {};
    const smtp = (org?.smtpConfig as any) || {};

    return {
      voip: {
        provider: voip.provider || process.env.GLOBAL_VOIP_PROVIDER || "ALLO",
        alloApiKey: voip.alloApiKey ? decryptSecret(voip.alloApiKey) : process.env.WITHALLO_API_KEY || "",
        ringoverApiKey: voip.ringoverApiKey ? decryptSecret(voip.ringoverApiKey) : process.env.RINGOVER_API_KEY || "",
        onoffApiToken: voip.onoffApiToken ? decryptSecret(voip.onoffApiToken) : process.env.ONOFF_API_KEY || "",
      },
      leexi: {
        keyId: leexi.keyId ? decryptSecret(leexi.keyId) : process.env.LEEXI_KEY_ID || "",
        keySecret: leexi.keySecret ? decryptSecret(leexi.keySecret) : process.env.LEEXI_KEY_SECRET || "",
      },
      smtp: {
        host: smtp.host || process.env.SMTP_HOST || "",
        port: smtp.port || Number(process.env.SMTP_PORT) || 587,
        user: smtp.user || process.env.SMTP_USER || "",
        pass: smtp.pass ? decryptSecret(smtp.pass) : process.env.SMTP_PASSWORD || "",
        fromName: smtp.fromName || process.env.SMTP_FROM_NAME || "",
        fromEmail: smtp.fromEmail || process.env.SYSTEM_SMTP_FROM || "",
      },
    };
  } catch {
    // Graceful fallback to global env
    return {
      voip: {
        provider: process.env.GLOBAL_VOIP_PROVIDER || "ALLO",
        alloApiKey: process.env.WITHALLO_API_KEY || "",
        ringoverApiKey: process.env.RINGOVER_API_KEY || "",
        onoffApiToken: process.env.ONOFF_API_KEY || "",
      },
      leexi: {
        keyId: process.env.LEEXI_KEY_ID || "",
        keySecret: process.env.LEEXI_KEY_SECRET || "",
      },
      smtp: {
        host: process.env.SMTP_HOST || "",
        port: Number(process.env.SMTP_PORT) || 587,
        user: process.env.SMTP_USER || "",
        pass: process.env.SMTP_PASSWORD || "",
        fromName: process.env.SMTP_FROM_NAME || "",
        fromEmail: process.env.SYSTEM_SMTP_FROM || "",
      },
    };
  }
}
