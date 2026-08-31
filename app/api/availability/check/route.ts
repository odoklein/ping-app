import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { readAvailability, checkAvailability } from "@/lib/availability";

// POST { userId, date (ISO), addedHours? } -> availability check for that member on that day.
export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ success: false, error: "Non autorisé" }, { status: 401 });
    }

    let body: { userId?: string; date?: string; addedHours?: number };
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ success: false, error: "Corps invalide" }, { status: 400 });
    }

    const { userId, date, addedHours = 0 } = body;
    if (!userId || !date) {
        return NextResponse.json({ success: false, error: "userId et date requis" }, { status: 400 });
    }

    const target = new Date(date);
    if (Number.isNaN(target.getTime())) {
        return NextResponse.json({ success: false, error: "Date invalide" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, name: true, preferences: true },
    });
    if (!user) {
        return NextResponse.json({ success: false, error: "Utilisateur introuvable" }, { status: 404 });
    }

    // Day bounds (local)
    const dayStart = new Date(target); dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(target); dayEnd.setHours(23, 59, 59, 999);

    // Existing load: open tasks assigned to the user due that day.
    const tasks = await prisma.task.findMany({
        where: {
            assigneeId: userId,
            status: { not: "DONE" },
            dueDate: { gte: dayStart, lte: dayEnd },
        },
        select: { id: true, title: true, estimatedHours: true },
    });

    const load = tasks.reduce((sum, t) => sum + (t.estimatedHours ?? 2), 0);

    const availability = readAvailability(user.preferences);
    const result = checkAvailability(availability, target, load, addedHours);

    return NextResponse.json({
        success: true,
        data: {
            ...result,
            userId: user.id,
            userName: user.name,
            date,
            conflictingTasks: tasks.map((t) => ({ id: t.id, title: t.title, hours: t.estimatedHours ?? 2 })),
        },
    });
}
