import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// POST /api/notifications/device-token - Register or update a mobile device token (iOS APNs / Android FCM)
export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ success: false, error: "Non autorisé" }, { status: 401 });
        }

        const body = await req.json();
        const { token, platform, deviceModel } = body;

        if (!token || typeof token !== "string") {
            return NextResponse.json({ success: false, error: "Token d'appareil manquant" }, { status: 400 });
        }

        const validPlatform = ["ios", "android", "web"].includes(platform) ? platform : "ios";

        const deviceToken = await prisma.userDeviceToken.upsert({
            where: { token },
            update: {
                userId: session.user.id,
                platform: validPlatform,
                deviceModel: deviceModel ?? null,
                updatedAt: new Date(),
            },
            create: {
                userId: session.user.id,
                token,
                platform: validPlatform,
                deviceModel: deviceModel ?? null,
            },
        });

        return NextResponse.json({ success: true, data: { id: deviceToken.id } });
    } catch (error) {
        console.error("POST /api/notifications/device-token error:", error);
        return NextResponse.json({ success: false, error: "Erreur serveur" }, { status: 500 });
    }
}

// DELETE /api/notifications/device-token - Unregister a device token on logout
export async function DELETE(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ success: false, error: "Non autorisé" }, { status: 401 });
        }

        const body = await req.json();
        const { token } = body;

        if (!token || typeof token !== "string") {
            return NextResponse.json({ success: false, error: "Token manquant" }, { status: 400 });
        }

        await prisma.userDeviceToken.deleteMany({
            where: {
                token,
                userId: session.user.id,
            },
        });

        return NextResponse.json({ success: true, message: "Token supprimé" });
    } catch (error) {
        console.error("DELETE /api/notifications/device-token error:", error);
        return NextResponse.json({ success: false, error: "Erreur serveur" }, { status: 500 });
    }
}
