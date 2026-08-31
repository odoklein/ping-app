import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "Non autorisé" }, { status: 401 });
    }

    const userId = session.user.id;
    const role = session.user.role;
    const { searchParams } = new URL(req.url);

    const from = searchParams.get("from");
    const to = searchParams.get("to");
    if (!from || !to) {
      return NextResponse.json({ success: false, error: "Paramètres from/to requis" }, { status: 400 });
    }

    const fromDate = new Date(from);
    const toDate = new Date(to);
    const projectIdsParam = searchParams.get("projectIds");
    const memberIdsParam = searchParams.get("memberIds");
    const statusesParam = searchParams.get("statuses");

    // Find projects the user has access to (same logic as /api/projects)
    let projectWhere: any = {};
    if (role === "MANAGER" || role === "DEVELOPER" || role === "SDR" || role === "BUSINESS_DEVELOPER") {
      projectWhere = {
        OR: [
          { ownerId: userId },
          { members: { some: { userId } } },
        ],
      };
    } else if (role === "CLIENT") {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { clientId: true },
      });
      if (user?.clientId) {
        projectWhere = { clientId: user.clientId };
      } else {
        return NextResponse.json({ success: true, data: { tasks: [], milestones: [], projects: [], members: [] } });
      }
    }

    if (projectIdsParam) {
      const ids = projectIdsParam.split(",").filter(Boolean);
      projectWhere = { AND: [projectWhere, { id: { in: ids } }] };
    }

    const projects = await prisma.project.findMany({
      where: projectWhere,
      select: { id: true, name: true, color: true, startDate: true, endDate: true },
    });

    const projectIds = projects.map((p) => p.id);
    if (projectIds.length === 0) {
      return NextResponse.json({ success: true, data: { tasks: [], milestones: [], projects: [], members: [] } });
    }

    // Build task filter
    const taskWhere: any = {
      projectId: { in: projectIds },
      OR: [
        { dueDate: { gte: fromDate, lte: toDate } },
        { startDate: { gte: fromDate, lte: toDate } },
        { AND: [{ startDate: { lte: fromDate } }, { dueDate: { gte: toDate } }] },
      ],
    };

    if (memberIdsParam) {
      taskWhere.assigneeId = { in: memberIdsParam.split(",").filter(Boolean) };
    }
    if (statusesParam) {
      taskWhere.status = { in: statusesParam.split(",").filter(Boolean) };
    }

    const [tasks, milestones, memberRows, timeEntries] = await Promise.all([
      prisma.task.findMany({
        where: taskWhere,
        select: {
          id: true,
          title: true,
          status: true,
          priority: true,
          startDate: true,
          dueDate: true,
          estimatedHours: true,
          loggedHours: true,
          labels: true,
          assignee: { select: { id: true, name: true } },
          project: { select: { id: true, name: true, color: true } },
          milestone: { select: { id: true, title: true } },
        },
        orderBy: [{ dueDate: "asc" }, { priority: "desc" }],
      }),
      prisma.projectMilestone.findMany({
        where: {
          projectId: { in: projectIds },
          dueDate: { gte: fromDate, lte: toDate },
        },
        select: {
          id: true,
          title: true,
          dueDate: true,
          completedAt: true,
          project: { select: { id: true, name: true, color: true } },
        },
        orderBy: { dueDate: "asc" },
      }),
      // Get all unique members across these projects
      prisma.projectMember.findMany({
        where: { projectId: { in: projectIds } },
        select: { user: { select: { id: true, name: true } } },
        distinct: ["userId"],
      }),
      // Time entries for availability
      prisma.taskTimeEntry.findMany({
        where: {
          task: { projectId: { in: projectIds } },
          date: { gte: fromDate, lte: toDate },
        },
        select: { userId: true, hours: true, date: true },
      }),
    ]);

    // Build daily load per member from time entries + estimated hours of assigned tasks
    const memberMap = new Map<string, { id: string; name: string; dailyLoad: Record<string, { hours: number; taskCount: number }> }>();
    for (const row of memberRows) {
      memberMap.set(row.user.id, { id: row.user.id, name: row.user.name || "Sans nom", dailyLoad: {} });
    }

    // Add time entries to daily load
    for (const entry of timeEntries) {
      const member = memberMap.get(entry.userId);
      if (!member) continue;
      const dateKey = entry.date.toISOString().split("T")[0];
      if (!member.dailyLoad[dateKey]) member.dailyLoad[dateKey] = { hours: 0, taskCount: 0 };
      member.dailyLoad[dateKey].hours += entry.hours;
    }

    // Add task assignments to daily load (distribute estimated hours across task date range)
    for (const task of tasks) {
      if (!task.assignee || !task.estimatedHours) continue;
      const member = memberMap.get(task.assignee.id);
      if (!member) continue;

      const start = task.startDate ? new Date(task.startDate) : task.dueDate ? new Date(task.dueDate) : null;
      const end = task.dueDate ? new Date(task.dueDate) : start;
      if (!start || !end) continue;

      const days: string[] = [];
      const cursor = new Date(start);
      cursor.setHours(0, 0, 0, 0);
      const endNorm = new Date(end);
      endNorm.setHours(0, 0, 0, 0);
      while (cursor <= endNorm) {
        const dow = cursor.getDay();
        if (dow !== 0 && dow !== 6) {
          days.push(cursor.toISOString().split("T")[0]);
        }
        cursor.setDate(cursor.getDate() + 1);
      }
      if (days.length === 0) continue;
      const hoursPerDay = task.estimatedHours / days.length;

      for (const dateKey of days) {
        if (!member.dailyLoad[dateKey]) member.dailyLoad[dateKey] = { hours: 0, taskCount: 0 };
        member.dailyLoad[dateKey].hours += hoursPerDay;
        member.dailyLoad[dateKey].taskCount += 1;
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        tasks,
        milestones,
        projects: projects.map((p) => ({
          ...p,
          startDate: p.startDate?.toISOString() || null,
          endDate: p.endDate?.toISOString() || null,
        })),
        members: Array.from(memberMap.values()),
      },
    });
  } catch (error) {
    console.error("GET /api/calendar/events error:", error);
    return NextResponse.json({ success: false, error: "Erreur serveur" }, { status: 500 });
  }
}
