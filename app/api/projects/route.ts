import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// GET /api/projects - List projects with filtering, sorting, stats
export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ success: false, error: "Non autorisé" }, { status: 401 });
        }

        const userId = session.user.id;
        const role = session.user.role;
        const { searchParams } = new URL(req.url);

        // Filters
        const status = searchParams.get("status");
        const clientId = searchParams.get("clientId");
        const ownerId = searchParams.get("ownerId");
        const parentProjectId = searchParams.get("parentProjectId");
        const search = searchParams.get("search");
        const sortBy = searchParams.get("sortBy") || "updatedAt";
        const sortOrder = searchParams.get("sortOrder") || "desc";
        const page = parseInt(searchParams.get("page") || "1");
        const limit = parseInt(searchParams.get("limit") || "50");

        // Build where clause based on role
        let whereClause: any = {};

        if (role === "MANAGER") {
            // Managers need the complete project portfolio, not only projects
            // they personally own or have been added to as a member.
            whereClause = {};
        } else if (role === "DEVELOPER" || role === "SDR" || role === "BUSINESS_DEVELOPER") {
            whereClause = {
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
                whereClause = { clientId: user.clientId };
            } else {
                whereClause = { id: "none" };
            }
        }

        // Apply filters
        if (status) whereClause.status = status;
        if (clientId) whereClause.clientId = clientId;
        if (ownerId) whereClause.ownerId = ownerId;
        // Root projects are the portfolio view; children are shown inside their parent.
        whereClause.parentProjectId = parentProjectId || null;
        if (search) {
            whereClause.AND = [
                ...(whereClause.AND || []),
                {
                    OR: [
                        { name: { contains: search, mode: "insensitive" } },
                        { description: { contains: search, mode: "insensitive" } },
                    ],
                },
            ];
        }

        // Build orderBy
        const orderByMap: Record<string, any> = {
            name: { name: sortOrder },
            createdAt: { createdAt: sortOrder },
            updatedAt: { updatedAt: sortOrder },
            status: { status: sortOrder },
        };
        const orderBy = orderByMap[sortBy] || { updatedAt: "desc" };

        const [projects, total] = await Promise.all([
            prisma.project.findMany({
                where: whereClause,
                include: {
                    owner: { select: { id: true, name: true, email: true } },
                    client: { select: { id: true, name: true } },
                    members: {
                        include: {
                            user: { select: { id: true, name: true, email: true } },
                        },
                    },
                    _count: {
                        select: { tasks: true, childProjects: true },
                    },
                    tasks: {
                        select: { status: true, dueDate: true },
                    },
                },
                orderBy,
                skip: (page - 1) * limit,
                take: limit,
            }),
            prisma.project.count({ where: whereClause }),
        ]);

        // Add task stats to each project
        const projectsWithStats = projects.map((p) => {
            const tasksByStatus = {
                TODO: 0,
                IN_PROGRESS: 0,
                IN_REVIEW: 0,
                DONE: 0,
            };
            let overdueCount = 0;
            const now = new Date();

            p.tasks.forEach((t) => {
                tasksByStatus[t.status as keyof typeof tasksByStatus]++;
                if (t.dueDate && new Date(t.dueDate) < now && t.status !== "DONE") {
                    overdueCount++;
                }
            });

            const totalTasks = p.tasks.length;
            const completedTasks = tasksByStatus.DONE;
            const completionPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

            const { tasks, ...projectData } = p;
            return {
                ...projectData,
                taskStats: {
                    ...tasksByStatus,
                    total: totalTasks,
                    overdue: overdueCount,
                    completionPercent,
                },
            };
        });

        return NextResponse.json({
            success: true,
            data: projectsWithStats,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        console.error("GET /api/projects error:", error);
        return NextResponse.json({ success: false, error: "Erreur serveur" }, { status: 500 });
    }
}

// POST /api/projects - Create project
export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ success: false, error: "Non autorisé" }, { status: 401 });
        }

        const role = session.user.role;
        if (!["MANAGER", "DEVELOPER", "BUSINESS_DEVELOPER", "SDR"].includes(role || "")) {
            return NextResponse.json({ success: false, error: "Rôle non autorisé" }, { status: 403 });
        }

        const body = await req.json();
        const { name, description, clientId, members, startDate, endDate, color, icon, templateId, parentProjectId, isGroup } = body;

        if (!name?.trim()) {
            return NextResponse.json({ success: false, error: "Nom requis" }, { status: 400 });
        }

        let parentProject: { id: string; isGroup: boolean; ownerId: string; members: { userId: string }[] } | null = null;
        if (parentProjectId) {
            parentProject = await prisma.project.findUnique({
                where: { id: parentProjectId },
                select: { id: true, isGroup: true, ownerId: true, members: { where: { userId: session.user.id }, select: { userId: true } } },
            });
            if (!parentProject?.isGroup) {
                return NextResponse.json({ success: false, error: "Le projet principal sélectionné est invalide" }, { status: 400 });
            }
            if (role !== "MANAGER" && parentProject.ownerId !== session.user.id && parentProject.members.length === 0) {
                return NextResponse.json({ success: false, error: "Accès refusé au projet principal" }, { status: 403 });
            }
        }

        // If using a template, load it
        let templateTasks: any[] = [];
        if (templateId) {
            const template = await prisma.projectTemplate.findUnique({ where: { id: templateId } });
            if (template?.structure) {
                const structure = template.structure as any;
                templateTasks = structure.tasks || [];
            }
        }

        const project = await prisma.project.create({
            data: {
                name: name.trim(),
                description: description?.trim() || null,
                ownerId: session.user.id,
                clientId: clientId || null,
                startDate: startDate ? new Date(startDate) : null,
                endDate: endDate ? new Date(endDate) : null,
                color: color || "#6366f1",
                icon: icon || "folder",
                isGroup: Boolean(isGroup),
                parentProjectId: parentProject?.id || null,
                members: {
                    create: [
                        { userId: session.user.id, role: "owner" },
                        ...(members || [])
                            .filter((m: any) => m.userId !== session.user.id)
                            .map((m: { userId: string; role?: string }) => ({
                                userId: m.userId,
                                role: m.role || "member",
                            })),
                    ],
                },
            },
            include: {
                owner: { select: { id: true, name: true, email: true } },
                client: { select: { id: true, name: true } },
                members: {
                    include: {
                        user: { select: { id: true, name: true, email: true } },
                    },
                },
                _count: { select: { tasks: true, childProjects: true } },
            },
        });

        // Create tasks from template
        if (!isGroup && templateTasks.length > 0) {
            for (let i = 0; i < templateTasks.length; i++) {
                const t = templateTasks[i];
                await prisma.task.create({
                    data: {
                        projectId: project.id,
                        title: t.title,
                        description: t.description || null,
                        priority: t.priority || "MEDIUM",
                        position: i,
                        createdById: session.user.id,
                    },
                });
            }
        }

        // Log activity
        await prisma.projectActivity.create({
            data: {
                projectId: project.id,
                userId: session.user.id,
                action: "project_created",
                details: { name: project.name },
            },
        });

        return NextResponse.json({ success: true, data: project });
    } catch (error) {
        console.error("POST /api/projects error:", error);
        return NextResponse.json({ success: false, error: "Erreur serveur" }, { status: 500 });
    }
}
