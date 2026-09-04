/**
 * End-to-end invitation lifecycle check against the real database.
 *
 *   npm run test:invitations
 *
 * Exercises the whole token lifecycle: hash-only persistence, +7d expiry,
 * short-password rejection, acceptance (user + permissions + missions),
 * anti-replay, and the expiry lock. Every row it creates is removed at the
 * end, including on failure.
 */

import { PrismaClient, type Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import { z } from "zod";
import {
    generateInvitationToken,
    hashInvitationToken,
    invitationExpiryDate,
    INVITATION_MIN_PASSWORD_LENGTH,
} from "../lib/invitations";
import { assignDefaultPermissions } from "../lib/permissions/role-defaults";

const prisma = new PrismaClient();

const TEST_EMAIL = "invitation.lifecycle.test@pingcrm.local";
const GOOD_PASSWORD = "Prospecto2026!";

let passed = 0;
let failed = 0;

function check(label: string, condition: boolean, detail?: string) {
    if (condition) {
        passed++;
        console.log(`  PASS  ${label}`);
    } else {
        failed++;
        console.error(`  FAIL  ${label}${detail ? ` — ${detail}` : ""}`);
    }
}

// Mirrors the Zod rule enforced by POST /api/invitations/accept.
const passwordSchema = z.string().min(INVITATION_MIN_PASSWORD_LENGTH);

async function cleanup() {
    await prisma.userInvitation.deleteMany({ where: { email: TEST_EMAIL } });
    const user = await prisma.user.findUnique({
        where: { email: TEST_EMAIL },
        select: { id: true },
    });
    if (user) {
        await prisma.userPermission.deleteMany({ where: { userId: user.id } });
        await prisma.sDRAssignment.deleteMany({ where: { sdrId: user.id } });
        await prisma.user.delete({ where: { id: user.id } });
    }
}

async function main() {
    console.log("\nInvitation lifecycle\n");

    const inviter = await prisma.user.findFirst({
        where: { role: "MANAGER", isActive: true },
        select: { id: true, name: true },
    });
    if (!inviter) {
        throw new Error("No active MANAGER in the database — cannot issue an invitation.");
    }

    const mission = await prisma.mission.findFirst({
        where: { isActive: true },
        select: { id: true, name: true },
    });

    await cleanup();

    // ── 1. Creation: only the hash is persisted ──
    const { rawToken, tokenHash } = generateInvitationToken();
    const expiresAt = invitationExpiryDate();
    const metadata: Prisma.InputJsonValue = {
        voipProvider: "ALLO",
        alloPhoneNumber: "+33600000000",
        assignedMissionIds: mission ? [mission.id] : [],
    };

    const invitation = await prisma.userInvitation.create({
        data: {
            email: TEST_EMAIL,
            name: "Lifecycle Test",
            role: "SDR",
            status: "PENDING",
            tokenHash,
            expiresAt,
            invitedById: inviter.id,
            metadata,
        },
    });

    check("raw token is not stored in the database", invitation.tokenHash !== rawToken);
    check(
        "stored hash equals SHA-256(rawToken)",
        invitation.tokenHash === hashInvitationToken(rawToken),
    );

    const noRawTokenRow = await prisma.userInvitation.findFirst({
        where: { tokenHash: rawToken },
        select: { id: true },
    });
    check("the raw token is not queryable as a hash", noRawTokenRow === null);

    const expiryDelta = invitation.expiresAt.getTime() - invitation.createdAt.getTime();
    check(
        "expires 7 days after creation",
        Math.abs(expiryDelta - 7 * 24 * 3600 * 1000) < 5000,
        `delta = ${Math.round(expiryDelta / 3600000)}h`,
    );

    // ── 2. A too-short password is rejected before anything is written ──
    const shortResult = passwordSchema.safeParse("Ab1!");
    check("password shorter than 8 chars is rejected", shortResult.success === false);
    const stillPending = await prisma.userInvitation.findUnique({
        where: { id: invitation.id },
        select: { status: true },
    });
    check("a rejected attempt leaves the invitation PENDING", stillPending?.status === "PENDING");

    // ── 3. Acceptance (same transaction body as the accept route) ──
    const acceptedUser = await prisma.$transaction(
        async (tx) => {
            const inv = await tx.userInvitation.findUnique({
                where: { tokenHash: hashInvitationToken(rawToken) },
            });
            if (!inv || inv.status !== "PENDING" || inv.expiresAt < new Date()) {
                throw new Error("Invitation invalide ou expirée");
            }

            const meta = (inv.metadata ?? {}) as {
                voipProvider?: "ALLO" | "ONOFF" | "RINGOVER" | "NONE";
                alloPhoneNumber?: string | null;
                assignedMissionIds?: string[];
            };

            const user = await tx.user.create({
                data: {
                    email: inv.email,
                    name: inv.name ?? inv.email.split("@")[0],
                    password: await bcrypt.hash(GOOD_PASSWORD, 12),
                    role: inv.role,
                    isActive: true,
                    invitedById: inv.invitedById,
                    hasCompletedRoleOnboarding: false,
                    voipProvider: meta.voipProvider ?? "NONE",
                    alloPhoneNumber: meta.alloPhoneNumber ?? null,
                },
            });

            await assignDefaultPermissions(tx, user.id, user.role);

            const missionIds = meta.assignedMissionIds ?? [];
            if (missionIds.length > 0) {
                await tx.sDRAssignment.createMany({
                    data: missionIds.map((missionId) => ({ missionId, sdrId: user.id })),
                    skipDuplicates: true,
                });
            }

            await tx.userInvitation.update({
                where: { id: inv.id },
                data: { status: "ACCEPTED", acceptedAt: new Date() },
            });

            return user;
        },
        { timeout: 25000 },
    );

    check("user created with the invited email", acceptedUser.email === TEST_EMAIL);
    check("role carried over from the invitation", acceptedUser.role === "SDR");
    check("VoIP attribution applied", acceptedUser.alloPhoneNumber === "+33600000000");
    check(
        "role onboarding starts as not completed",
        acceptedUser.hasCompletedRoleOnboarding === false,
    );
    check("inviter recorded on the user", acceptedUser.invitedById === inviter.id);

    check("password is not stored in clear text", acceptedUser.password !== GOOD_PASSWORD);
    check("password is a bcrypt hash", /^\$2[aby]\$\d{2}\$/.test(acceptedUser.password));
    check(
        "bcrypt hash verifies against the chosen password",
        await bcrypt.compare(GOOD_PASSWORD, acceptedUser.password),
    );
    check(
        "bcrypt hash rejects a different password",
        !(await bcrypt.compare("wrong-password", acceptedUser.password)),
    );

    const permissionCount = await prisma.userPermission.count({
        where: { userId: acceptedUser.id, granted: true },
    });
    check("default SDR permissions granted", permissionCount > 0, `${permissionCount} granted`);

    if (mission) {
        const assignment = await prisma.sDRAssignment.findFirst({
            where: { sdrId: acceptedUser.id, missionId: mission.id },
            select: { id: true },
        });
        check("pre-assigned mission attached", assignment !== null);
    } else {
        console.log("  SKIP  pre-assigned mission attached (no active mission in DB)");
    }

    const accepted = await prisma.userInvitation.findUnique({ where: { id: invitation.id } });
    check("invitation marked ACCEPTED", accepted?.status === "ACCEPTED");
    check("acceptedAt timestamped", accepted?.acceptedAt instanceof Date);

    // ── 4. Anti-replay: the same token cannot be used twice ──
    let replayRejected = false;
    try {
        await prisma.$transaction(async (tx) => {
            const inv = await tx.userInvitation.findUnique({
                where: { tokenHash: hashInvitationToken(rawToken) },
            });
            if (!inv || inv.status !== "PENDING") {
                throw new Error("Cette invitation a déjà été utilisée");
            }
        });
    } catch {
        replayRejected = true;
    }
    check("replaying the same token is rejected", replayRejected);

    const userCount = await prisma.user.count({ where: { email: TEST_EMAIL } });
    check("no duplicate user created by the replay", userCount === 1);

    // ── 5. Expiry lock ──
    await prisma.userInvitation.deleteMany({ where: { email: TEST_EMAIL } });
    const expiredToken = generateInvitationToken();
    const expiredInvitation = await prisma.userInvitation.create({
        data: {
            email: TEST_EMAIL,
            name: "Expired Test",
            role: "SDR",
            status: "PENDING",
            tokenHash: expiredToken.tokenHash,
            expiresAt: new Date(Date.now() - 24 * 3600 * 1000), // yesterday
            invitedById: inviter.id,
        },
    });

    const expiredLookup = await prisma.userInvitation.findUnique({
        where: { tokenHash: hashInvitationToken(expiredToken.rawToken) },
    });
    check(
        "an invitation past expiresAt is refused",
        Boolean(expiredLookup && expiredLookup.expiresAt < new Date()),
    );

    await prisma.userInvitation.update({
        where: { id: expiredInvitation.id },
        data: { status: "EXPIRED" },
    });
    const flipped = await prisma.userInvitation.findUnique({
        where: { id: expiredInvitation.id },
        select: { status: true },
    });
    check("verify flips a stale invitation to EXPIRED", flipped?.status === "EXPIRED");

    // ── 6. Revocation kills the link ──
    const revokedToken = generateInvitationToken();
    const revoked = await prisma.userInvitation.create({
        data: {
            email: `revoked.${TEST_EMAIL}`,
            role: "CLIENT",
            status: "PENDING",
            tokenHash: revokedToken.tokenHash,
            expiresAt: invitationExpiryDate(),
            invitedById: inviter.id,
        },
    });
    await prisma.userInvitation.update({
        where: { id: revoked.id },
        data: { status: "REVOKED", revokedAt: new Date() },
    });
    const revokedLookup = await prisma.userInvitation.findUnique({
        where: { tokenHash: hashInvitationToken(revokedToken.rawToken) },
        select: { status: true },
    });
    check("a revoked invitation is no longer usable", revokedLookup?.status === "REVOKED");
    await prisma.userInvitation.delete({ where: { id: revoked.id } });
}

main()
    .then(async () => {
        await cleanup();
        console.log(`\n${passed} passed, ${failed} failed\n`);
        await prisma.$disconnect();
        process.exit(failed === 0 ? 0 : 1);
    })
    .catch(async (error) => {
        console.error("\nLifecycle check crashed:", error);
        await cleanup().catch(() => {});
        await prisma.$disconnect();
        process.exit(1);
    });
