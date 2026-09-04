import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireSuperAdmin(req);
    const { id } = await params;

    const org = await (prisma as any).organization.findUnique({
      where: { id },
      include: {
        users: {
          select: { id: true, name: true, email: true, role: true, isActive: true, organizationRole: true },
        },
        _count: {
          select: { clients: true, missions: true, campaigns: true },
        },
      },
    });

    if (!org) {
      return NextResponse.json({ success: false, error: "Organisation introuvable" }, { status: 404 });
    }

    return NextResponse.json({ success: true, organization: org });
  } catch (err: any) {
    if (err.status === 401 || err.status === 403) {
      return NextResponse.json({ success: false, error: err.message }, { status: err.status });
    }
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSuperAdmin(req);
    const { id } = await params;
    const body = await req.json();

    const allowedFields = ["name", "status", "plan", "maxUsers", "customDomain", "features", "branding"];
    const dataToUpdate: Record<string, any> = {};

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        dataToUpdate[field] = body[field];
      }
    }

    const updated = await (prisma as any).organization.update({
      where: { id },
      data: dataToUpdate,
    });

    console.log({ event: "TENANT_UPDATED", orgId: id, fields: Object.keys(dataToUpdate), updatedBy: session.user.id, timestamp: new Date().toISOString() });

    return NextResponse.json({ success: true, organization: updated });
  } catch (err: any) {
    if (err.status === 401 || err.status === 403) {
      return NextResponse.json({ success: false, error: err.message }, { status: err.status });
    }
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSuperAdmin(req);
    const { id } = await params;

    const org = await (prisma as any).organization.findUnique({
      where: { id },
      include: {
        _count: {
          select: { users: true, missions: true },
        },
      },
    });

    if (!org) {
      return NextResponse.json({ success: false, error: "Organisation introuvable" }, { status: 404 });
    }

    if (org.slug === "default") {
      return NextResponse.json(
        { success: false, error: "L'organisation par défaut ne peut pas être supprimée." },
        { status: 400 }
      );
    }

    await (prisma as any).organization.delete({
      where: { id },
    });

    console.log({ event: "TENANT_DELETED", orgId: id, orgName: org.name, deletedBy: session.user.id, timestamp: new Date().toISOString() });

    return NextResponse.json({ success: true, message: `Espace '${org.name}' supprimé avec succès.` });
  } catch (err: any) {
    if (err.status === 401 || err.status === 403) {
      return NextResponse.json({ success: false, error: err.message }, { status: err.status });
    }
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
