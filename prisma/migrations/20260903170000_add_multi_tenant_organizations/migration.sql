-- ==============================================================================
-- Migration: Add Multi-Tenant Organizations & Dedicated Agency Spaces
-- Safe migration: All columns are nullable or have defaults.
-- Existing records are automatically assigned to the default organization.
-- ==============================================================================

-- 1. Create Enums
DO $$ BEGIN
    CREATE TYPE "OrganizationStatus" AS ENUM ('TRIAL', 'ACTIVE', 'SUSPENDED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "OrganizationPlan" AS ENUM ('STARTER', 'PRO', 'ENTERPRISE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "OrganizationRole" AS ENUM ('OWNER', 'ADMIN', 'MEMBER');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Create Organization Table
CREATE TABLE IF NOT EXISTS "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "customDomain" TEXT,
    "status" "OrganizationStatus" NOT NULL DEFAULT 'ACTIVE',
    "plan" "OrganizationPlan" NOT NULL DEFAULT 'PRO',
    "maxUsers" INTEGER NOT NULL DEFAULT 20,
    "branding" JSONB,
    "voipConfig" JSONB,
    "leexiConfig" JSONB,
    "smtpConfig" JSONB,
    "features" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- 3. Create Indexes for Organization
CREATE UNIQUE INDEX IF NOT EXISTS "Organization_slug_key" ON "Organization"("slug");
CREATE UNIQUE INDEX IF NOT EXISTS "Organization_customDomain_key" ON "Organization"("customDomain");
CREATE INDEX IF NOT EXISTS "Organization_slug_idx" ON "Organization"("slug");
CREATE INDEX IF NOT EXISTS "Organization_customDomain_idx" ON "Organization"("customDomain");
CREATE INDEX IF NOT EXISTS "Organization_status_idx" ON "Organization"("status");

-- 4. Add organizationId and organizationRole to User
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "organizationId" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "organizationRole" "OrganizationRole" DEFAULT 'MEMBER';

-- 5. Add organizationId to Client, Mission, Campaign, Action, Contact, Company, UserInvitation
ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "organizationId" TEXT;
ALTER TABLE "Mission" ADD COLUMN IF NOT EXISTS "organizationId" TEXT;
ALTER TABLE "Campaign" ADD COLUMN IF NOT EXISTS "organizationId" TEXT;
ALTER TABLE "Action" ADD COLUMN IF NOT EXISTS "organizationId" TEXT;
ALTER TABLE "Contact" ADD COLUMN IF NOT EXISTS "organizationId" TEXT;
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "organizationId" TEXT;
ALTER TABLE "UserInvitation" ADD COLUMN IF NOT EXISTS "organizationId" TEXT;

-- 6. Add Foreign Key Constraints (ON DELETE SET NULL)
DO $$ BEGIN
    ALTER TABLE "User" ADD CONSTRAINT "User_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "Client" ADD CONSTRAINT "Client_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "Mission" ADD CONSTRAINT "Mission_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "Action" ADD CONSTRAINT "Action_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "Contact" ADD CONSTRAINT "Contact_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "Company" ADD CONSTRAINT "Company_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "UserInvitation" ADD CONSTRAINT "UserInvitation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- 7. Seed Default Organization (Zero downtime, attaches all current data)
INSERT INTO "Organization" ("id", "name", "slug", "status", "plan", "maxUsers", "branding", "features", "createdAt", "updatedAt")
VALUES (
    'org_default',
    'Ping Agence Principale',
    'default',
    'ACTIVE',
    'ENTERPRISE',
    100,
    '{"name": "Ping", "primaryColor": "#2890F8", "accentColor": "#080808", "logoUrl": "/brand/ping-logo-blue.png", "logoDarkUrl": "/brand/ping-logo-white.png"}',
    '{"voipEnabled": true, "leexiEnabled": true, "emailHubEnabled": true, "pdpEnabled": true}',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
)
ON CONFLICT ("id") DO NOTHING;

-- 8. Backfill all existing records to the default organization
UPDATE "User" SET "organizationId" = 'org_default' WHERE "organizationId" IS NULL;
UPDATE "User" SET "organizationRole" = 'OWNER' WHERE "role" IN ('MANAGER', 'DEVELOPER') AND ("organizationRole" IS NULL OR "organizationRole" = 'MEMBER');
UPDATE "Client" SET "organizationId" = 'org_default' WHERE "organizationId" IS NULL;
UPDATE "Mission" SET "organizationId" = 'org_default' WHERE "organizationId" IS NULL;
UPDATE "Campaign" SET "organizationId" = 'org_default' WHERE "organizationId" IS NULL;
UPDATE "Action" SET "organizationId" = 'org_default' WHERE "organizationId" IS NULL;
UPDATE "Contact" SET "organizationId" = 'org_default' WHERE "organizationId" IS NULL;
UPDATE "Company" SET "organizationId" = 'org_default' WHERE "organizationId" IS NULL;
UPDATE "UserInvitation" SET "organizationId" = 'org_default' WHERE "organizationId" IS NULL;
