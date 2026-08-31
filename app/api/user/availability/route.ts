import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { readAvailability, writeAvailability, DEFAULT_AVAILABILITY, type UserAvailability, type TimeOffBlock } from "@/lib/availability";

// GET current user's availability
export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ success: false, error: "Non autorisé" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { preferences: true },
    });

    return NextResponse.json({ success: true, data: readAvailability(user?.preferences) });
}

// PUT — replace current user's availability
export async function PUT(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ success: false, error: "Non autorisé" }, { status: 401 });
    }

    let body: Partial<UserAvailability>;
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ success: false, error: "Corps invalide" }, { status: 400 });
    }

    // Sanitize weeklyHours: keys "1".."7", clamp 0..24
    const weeklyHours: Record<string, number> = { ...DEFAULT_AVAILABILITY.weeklyHours };
    if (body.weeklyHours && typeof body.weeklyHours === "object") {
        for (const k of ["1", "2", "3", "4", "5", "6", "7"]) {
            const v = Number((body.weeklyHours as Record<string, unknown>)[k]);
            if (!Number.isNaN(v)) weeklyHours[k] = Math.max(0, Math.min(24, v));
        }
    }

    // Sanitize timeOff blocks
    const timeOff: TimeOffBlock[] = Array.isArray(body.timeOff)
        ? body.timeOff
            .filter((b) => b && typeof b.from === "string" && typeof b.to === "string" && b.from <= b.to)
            .slice(0, 200)
            .map((b) => ({
                id: typeof b.id === "string" && b.id ? b.id : crypto.randomUUID(),
                from: b.from,
                to: b.to,
                reason: typeof b.reason === "string" ? b.reason.slice(0, 120) : undefined,
            }))
        : [];

    const availability: UserAvailability = { weeklyHours, timeOff };

    const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { preferences: true },
    });

    await prisma.user.update({
        where: { id: session.user.id },
        data: { preferences: writeAvailability(user?.preferences, availability) as object },
    });

    return NextResponse.json({ success: true, data: availability });
}
