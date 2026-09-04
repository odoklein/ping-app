import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { successResponse, requireAuth, withErrorHandler } from "@/lib/api-utils";

// ============================================
// GET /api/users/me/onboarding-context
// ============================================
// One call that feeds every role onboarding wizard. Only the branch matching
// the caller's role is queried, so the payload stays small.

interface TeamMember {
    id: string;
    name: string;
    role: string;
}

export const GET = withErrorHandler(async (request: NextRequest) => {
    const session = await requireAuth(request);

    const me = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: {
            id: true,
            name: true,
            email: true,
            role: true,
            clientId: true,
            interlocuteurId: true,
            phone: true,
            voipProvider: true,
            alloPhoneNumber: true,
            onoffNumber: true,
            ringoverNumber: true,
            hasCompletedRoleOnboarding: true,
            invitedBy: { select: { id: true, name: true, email: true, role: true } },
        },
    });

    if (!me) {
        return successResponse({ role: session.user.role, ready: false });
    }

    const base = {
        role: me.role,
        name: me.name,
        email: me.email,
        hasCompletedRoleOnboarding: me.hasCompletedRoleOnboarding,
        inviter: me.invitedBy
            ? { id: me.invitedBy.id, name: me.invitedBy.name, role: me.invitedBy.role }
            : null,
    };

    // ── SDR / BOOKER: phone line + assigned missions ──
    if (me.role === "SDR" || me.role === "BOOKER") {
        const assignments = await prisma.sDRAssignment.findMany({
            where: { sdrId: me.id },
            select: {
                mission: {
                    select: {
                        id: true,
                        name: true,
                        objective: true,
                        isActive: true,
                        client: { select: { id: true, name: true } },
                        lists: {
                            where: { isActive: true },
                            select: { id: true, name: true },
                            take: 1,
                            orderBy: { createdAt: "asc" },
                        },
                    },
                },
            },
            orderBy: { createdAt: "asc" },
        });

        const missions = assignments.map((a) => a.mission).filter((m) => m.isActive);
        const firstList = missions.flatMap((m) => m.lists)[0] ?? null;

        const assignedNumber =
            me.voipProvider === "ONOFF"
                ? me.onoffNumber
                : me.voipProvider === "RINGOVER"
                  ? me.ringoverNumber
                  : me.alloPhoneNumber;

        return successResponse({
            ...base,
            telephony: {
                provider: me.voipProvider ?? "NONE",
                assignedNumber: assignedNumber || null,
                fallbackPhone: me.phone || null,
            },
            missions: missions.map((m) => ({
                id: m.id,
                name: m.name,
                objective: m.objective,
                clientName: m.client.name,
            })),
            firstList,
        });
    }

    // ── CLIENT: dedicated team, playbook, own commercials ──
    if (me.role === "CLIENT" && me.clientId) {
        const [client, missions, interlocuteurs] = await Promise.all([
            prisma.client.findUnique({
                where: { id: me.clientId },
                select: { id: true, name: true, salesPlaybook: true, bookingUrl: true },
            }),
            prisma.mission.findMany({
                where: { clientId: me.clientId, isActive: true },
                select: {
                    id: true,
                    name: true,
                    objective: true,
                    sdrAssignments: {
                        select: { sdr: { select: { id: true, name: true, role: true } } },
                    },
                },
                orderBy: { startDate: "asc" },
            }),
            prisma.clientInterlocuteur.findMany({
                where: { clientId: me.clientId, isActive: true },
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    title: true,
                    emails: true,
                    bookingLinks: true,
                },
                orderBy: { createdAt: "asc" },
            }),
        ]);

        const sdrMap = new Map<string, TeamMember>();
        for (const mission of missions) {
            for (const assignment of mission.sdrAssignments) {
                sdrMap.set(assignment.sdr.id, assignment.sdr);
            }
        }

        // Prefer the manager who issued the invitation, else any active manager.
        let dedicatedManager: TeamMember | null =
            me.invitedBy && me.invitedBy.role === "MANAGER"
                ? { id: me.invitedBy.id, name: me.invitedBy.name, role: me.invitedBy.role }
                : null;
        if (!dedicatedManager) {
            const manager = await prisma.user.findFirst({
                where: { role: "MANAGER", isActive: true },
                select: { id: true, name: true, role: true },
                orderBy: { createdAt: "asc" },
            });
            dedicatedManager = manager ?? null;
        }

        const playbook = (client?.salesPlaybook ?? null) as Record<string, unknown> | null;
        const campaign = (playbook?.campaign ?? null) as Record<string, unknown> | null;

        return successResponse({
            ...base,
            client: { id: client?.id ?? me.clientId, name: client?.name ?? "" },
            team: {
                manager: dedicatedManager,
                sdrs: Array.from(sdrMap.values()),
            },
            missions: missions.map((m) => ({
                id: m.id,
                name: m.name,
                objective: m.objective,
            })),
            playbook: {
                pitch: (campaign?.pitch as string) ?? (playbook?.valueProposition as string) ?? null,
                icp: (campaign?.icp as string) ?? null,
                hasPlaybook: Boolean(playbook),
            },
            interlocuteurs,
        });
    }

    // ── COMMERCIAL: their own interlocuteur record (booking links) ──
    if (me.role === "COMMERCIAL") {
        const interlocuteur = me.interlocuteurId
            ? await prisma.clientInterlocuteur.findUnique({
                  where: { id: me.interlocuteurId },
                  select: {
                      id: true,
                      firstName: true,
                      lastName: true,
                      title: true,
                      territory: true,
                      bookingLinks: true,
                      client: { select: { id: true, name: true } },
                  },
              })
            : null;

        return successResponse({ ...base, interlocuteur });
    }

    // ── MANAGER / BD / DEVELOPER: cockpit volume snapshot (scoped to this org) ──
    const organizationId: string = (session.user as any).organizationId || "org_default";
    const [clientCount, missionCount, sdrCount, pendingInvitations] = await Promise.all([
        prisma.client.count({ where: { organizationId } }),
        prisma.mission.count({ where: { organizationId, isActive: true } }),
        prisma.user.count({ where: { organizationId, role: { in: ["SDR", "BOOKER"] }, isActive: true } }),
        prisma.userInvitation.count({ where: { organizationId, status: "PENDING" } }),
    ]);

    return successResponse({
        ...base,
        cockpit: { clientCount, missionCount, sdrCount, pendingInvitations },
    });
});
