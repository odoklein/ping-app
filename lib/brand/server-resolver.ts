import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { BrandConfig, DEFAULT_BRAND } from "./types";

const BRAND_CONFIG_KEY = "systemBrandConfig";

/**
 * Resolves the active brand configuration on the server side.
 * Checks for:
 * 1. Live preview cookie (allows instant preview from Manager Settings)
 * 2. Database persisted systemBrandConfig (SystemConfig model)
 * 3. Default Ping branding fallback
 */
export async function resolveCurrentBrand(): Promise<BrandConfig> {
  try {
    const cookieStore = await cookies();
    const previewColor = cookieStore.get("brand_preview_primary")?.value;

    let dbBrand: Partial<BrandConfig> = {};
    try {
      const configRecord = await prisma.systemConfig.findUnique({
        where: { key: BRAND_CONFIG_KEY },
      });
      if (configRecord?.value) {
        dbBrand = JSON.parse(configRecord.value);
      }
    } catch {
      /* non-fatal DB fallback */
    }

    return {
      ...DEFAULT_BRAND,
      ...dbBrand,
      ...(previewColor ? { primaryColor: previewColor } : {}),
    };
  } catch {
    return DEFAULT_BRAND;
  }
}
