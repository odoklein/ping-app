import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
    successResponse,
    errorResponse,
    requireRole,
    withErrorHandler,
} from "@/lib/api-utils";
import { z } from "zod";

const KEYS = {
    ALLO_API_KEY: "voipAlloApiKey",
    ALLO_NUMBERS: "voipAlloNumbers",
    ONOFF_API_KEY: "voipOnoffApiKey",
    ONOFF_NUMBERS: "voipOnoffNumbers",
    RINGOVER_API_KEY: "voipRingoverApiKey",
    RINGOVER_WEBHOOK_SECRET: "voipRingoverWebhookSecret",
};

const updateVoipConfigSchema = z.object({
    alloApiKey: z.string().optional(),
    alloNumbers: z.string().optional(),
    onoffApiKey: z.string().optional(),
    onoffNumbers: z.string().optional(),
    ringoverApiKey: z.string().optional(),
    ringoverWebhookSecret: z.string().optional(),
});

// Helper to fetch VoIP settings from SystemConfig
export async function getGlobalVoipConfig() {
    const records = await prisma.systemConfig.findMany({
        where: { key: { in: Object.values(KEYS) } },
    });
    const map = new Map(records.map((r) => [r.key, r.value.trim()]));

    return {
        alloApiKey: map.get(KEYS.ALLO_API_KEY) || process.env.ALLO_API_KEY || null,
        alloNumbers: map.get(KEYS.ALLO_NUMBERS) || process.env.ALLO_NUMBERS || null,
        onoffApiKey: map.get(KEYS.ONOFF_API_KEY) || process.env.ONOFF_API_KEY || null,
        onoffNumbers: map.get(KEYS.ONOFF_NUMBERS) || process.env.ONOFF_NUMBERS || null,
        ringoverApiKey: map.get(KEYS.RINGOVER_API_KEY) || process.env.RINGOVER_API_KEY || null,
        ringoverWebhookSecret: map.get(KEYS.RINGOVER_WEBHOOK_SECRET) || process.env.RINGOVER_WEBHOOK_SECRET || null,
    };
}

// GET /api/system-config/voip — Returns current VoIP config status
export const GET = withErrorHandler(async (request: NextRequest) => {
    await requireRole(["MANAGER"], request);

    const records = await prisma.systemConfig.findMany({
        where: { key: { in: Object.values(KEYS) } },
    });
    const map = new Map(records.map((r) => [r.key, r.value.trim()]));

    const alloKey = map.get(KEYS.ALLO_API_KEY);
    const onoffKey = map.get(KEYS.ONOFF_API_KEY);
    const ringoverKey = map.get(KEYS.RINGOVER_API_KEY);

    return successResponse({
        allo: {
            configured: !!(alloKey || process.env.ALLO_API_KEY),
            source: alloKey ? "database" : process.env.ALLO_API_KEY ? "env" : "none",
            numbers: map.get(KEYS.ALLO_NUMBERS) || process.env.ALLO_NUMBERS || "",
            maskedKey: alloKey ? `••••••••${alloKey.slice(-4)}` : process.env.ALLO_API_KEY ? "••••••••(env)" : "",
        },
        onoff: {
            configured: !!(onoffKey || process.env.ONOFF_API_KEY),
            source: onoffKey ? "database" : process.env.ONOFF_API_KEY ? "env" : "none",
            numbers: map.get(KEYS.ONOFF_NUMBERS) || process.env.ONOFF_NUMBERS || "",
            maskedKey: onoffKey ? `••••••••${onoffKey.slice(-4)}` : process.env.ONOFF_API_KEY ? "••••••••(env)" : "",
        },
        ringover: {
            configured: !!(ringoverKey || process.env.RINGOVER_API_KEY),
            source: ringoverKey ? "database" : process.env.RINGOVER_API_KEY ? "env" : "none",
            maskedKey: ringoverKey ? `••••••••${ringoverKey.slice(-4)}` : process.env.RINGOVER_API_KEY ? "••••••••(env)" : "",
        },
    });
});

// PUT /api/system-config/voip — Save global VoIP settings in SystemConfig
export const PUT = withErrorHandler(async (request: NextRequest) => {
    await requireRole(["MANAGER"], request);

    const body = await request.json();
    const parsed = updateVoipConfigSchema.safeParse(body);
    if (!parsed.success) {
        return errorResponse("Données de configuration VoIP invalides", 400);
    }

    const {
        alloApiKey,
        alloNumbers,
        onoffApiKey,
        onoffNumbers,
        ringoverApiKey,
        ringoverWebhookSecret,
    } = parsed.data;

    const upserts = [];

    if (alloApiKey !== undefined) {
        if (alloApiKey.trim()) {
            upserts.push(
                prisma.systemConfig.upsert({
                    where: { key: KEYS.ALLO_API_KEY },
                    update: { value: alloApiKey.trim() },
                    create: { key: KEYS.ALLO_API_KEY, value: alloApiKey.trim() },
                })
            );
        } else {
            upserts.push(prisma.systemConfig.deleteMany({ where: { key: KEYS.ALLO_API_KEY } }));
        }
    }

    if (alloNumbers !== undefined) {
        upserts.push(
            prisma.systemConfig.upsert({
                where: { key: KEYS.ALLO_NUMBERS },
                update: { value: alloNumbers.trim() },
                create: { key: KEYS.ALLO_NUMBERS, value: alloNumbers.trim() },
            })
        );
    }

    if (onoffApiKey !== undefined) {
        if (onoffApiKey.trim()) {
            upserts.push(
                prisma.systemConfig.upsert({
                    where: { key: KEYS.ONOFF_API_KEY },
                    update: { value: onoffApiKey.trim() },
                    create: { key: KEYS.ONOFF_API_KEY, value: onoffApiKey.trim() },
                })
            );
        } else {
            upserts.push(prisma.systemConfig.deleteMany({ where: { key: KEYS.ONOFF_API_KEY } }));
        }
    }

    if (onoffNumbers !== undefined) {
        upserts.push(
            prisma.systemConfig.upsert({
                where: { key: KEYS.ONOFF_NUMBERS },
                update: { value: onoffNumbers.trim() },
                create: { key: KEYS.ONOFF_NUMBERS, value: onoffNumbers.trim() },
            })
        );
    }

    if (ringoverApiKey !== undefined) {
        if (ringoverApiKey.trim()) {
            upserts.push(
                prisma.systemConfig.upsert({
                    where: { key: KEYS.RINGOVER_API_KEY },
                    update: { value: ringoverApiKey.trim() },
                    create: { key: KEYS.RINGOVER_API_KEY, value: ringoverApiKey.trim() },
                })
            );
        } else {
            upserts.push(prisma.systemConfig.deleteMany({ where: { key: KEYS.RINGOVER_API_KEY } }));
        }
    }

    if (ringoverWebhookSecret !== undefined) {
        upserts.push(
            prisma.systemConfig.upsert({
                where: { key: KEYS.RINGOVER_WEBHOOK_SECRET },
                update: { value: ringoverWebhookSecret.trim() },
                create: { key: KEYS.RINGOVER_WEBHOOK_SECRET, value: ringoverWebhookSecret.trim() },
            })
        );
    }

    await prisma.$transaction(upserts);

    return successResponse({ success: true, message: "Configuration VoIP globale enregistrée" });
});
