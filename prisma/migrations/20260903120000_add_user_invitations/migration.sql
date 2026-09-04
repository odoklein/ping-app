-- Phase 2: token-based user invitations + role onboarding tracking

-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "InvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'EXPIRED', 'REVOKED');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- AlterTable: User invitation traceability + role onboarding
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "invitedById" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "hasCompletedRoleOnboarding" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "onboardingCompletedAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "User_invitedById_idx" ON "User"("invitedById");

DO $$ BEGIN
    ALTER TABLE "User"
      ADD CONSTRAINT "User_invitedById_fkey"
      FOREIGN KEY ("invitedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Existing accounts predate the invitation flow: never show them the wizard.
UPDATE "User" SET "hasCompletedRoleOnboarding" = true WHERE "hasCompletedRoleOnboarding" = false;

-- CreateTable
CREATE TABLE IF NOT EXISTS "UserInvitation" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'SDR',
    "status" "InvitationStatus" NOT NULL DEFAULT 'PENDING',
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "invitedById" TEXT NOT NULL,
    "clientId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserInvitation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "UserInvitation_tokenHash_key" ON "UserInvitation"("tokenHash");
CREATE INDEX IF NOT EXISTS "UserInvitation_email_idx" ON "UserInvitation"("email");
CREATE INDEX IF NOT EXISTS "UserInvitation_tokenHash_idx" ON "UserInvitation"("tokenHash");
CREATE INDEX IF NOT EXISTS "UserInvitation_status_idx" ON "UserInvitation"("status");
CREATE INDEX IF NOT EXISTS "UserInvitation_invitedById_idx" ON "UserInvitation"("invitedById");
CREATE INDEX IF NOT EXISTS "UserInvitation_clientId_idx" ON "UserInvitation"("clientId");

DO $$ BEGIN
    ALTER TABLE "UserInvitation"
      ADD CONSTRAINT "UserInvitation_invitedById_fkey"
      FOREIGN KEY ("invitedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE "UserInvitation"
      ADD CONSTRAINT "UserInvitation_clientId_fkey"
      FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;
