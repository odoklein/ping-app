import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DEFAULT_BRAND, BrandConfig } from "@/lib/brand/types";

const BRAND_CONFIG_KEY = "systemBrandConfig";

export async function GET() {
  try {
    const configRecord = await prisma.systemConfig.findUnique({
      where: { key: BRAND_CONFIG_KEY },
    });

    if (!configRecord?.value) {
      return NextResponse.json({ success: true, data: DEFAULT_BRAND });
    }

    const parsed: BrandConfig = JSON.parse(configRecord.value);
    return NextResponse.json({
      success: true,
      data: { ...DEFAULT_BRAND, ...parsed },
    });
  } catch (error) {
    console.error("[BRAND_CONFIG_GET_ERROR]", error);
    return NextResponse.json({ success: true, data: DEFAULT_BRAND });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Non autorisé" },
        { status: 401 }
      );
    }

    // Only MANAGER or DEVELOPER can change tenant branding
    const role = session.user.role;
    if (role !== "MANAGER" && role !== "DEVELOPER") {
      return NextResponse.json(
        { success: false, error: "Permission refusée (Manager ou Développeur requis)" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const updatedBrand: BrandConfig = {
      name: body.name?.trim() || DEFAULT_BRAND.name,
      tagline: body.tagline?.trim() || DEFAULT_BRAND.tagline,
      primaryColor: body.primaryColor?.trim() || DEFAULT_BRAND.primaryColor,
      accentColor: body.accentColor?.trim() || DEFAULT_BRAND.accentColor,
      logoUrl: body.logoUrl?.trim() || null,
      logoDarkUrl: body.logoDarkUrl?.trim() || null,
      faviconUrl: body.faviconUrl?.trim() || null,
    };

    await prisma.systemConfig.upsert({
      where: { key: BRAND_CONFIG_KEY },
      update: {
        value: JSON.stringify(updatedBrand),
        updatedAt: new Date(),
      },
      create: {
        key: BRAND_CONFIG_KEY,
        value: JSON.stringify(updatedBrand),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Identité de marque mise à jour avec succès",
      data: updatedBrand,
    });
  } catch (error) {
    console.error("[BRAND_CONFIG_POST_ERROR]", error);
    return NextResponse.json(
      { success: false, error: "Erreur lors de la sauvegarde" },
      { status: 500 }
    );
  }
}
