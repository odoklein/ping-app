-- ==============================================================================
-- SUZALINK DATABASE MIGRATION - VOIP & MULTI-TELEPHONY SYSTEM
-- Run this script in Neon Console (SQL Editor) or PostgreSQL CLI
-- ==============================================================================

-- 1. Create the VoipProvider enum type if it does not exist
DO $$ BEGIN
    CREATE TYPE "VoipProvider" AS ENUM ('ALLO', 'ONOFF', 'RINGOVER', 'NONE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Add VoIP fields to the "User" table
ALTER TABLE "User" 
ADD COLUMN IF NOT EXISTS "voipProvider" "VoipProvider" DEFAULT 'ALLO',
ADD COLUMN IF NOT EXISTS "onoffNumber" TEXT,
ADD COLUMN IF NOT EXISTS "onoffUserId" TEXT,
ADD COLUMN IF NOT EXISTS "ringoverNumber" TEXT,
ADD COLUMN IF NOT EXISTS "ringoverUserId" TEXT;

-- 3. Ensure the SystemConfig table exists for Manager Global VoIP configuration
CREATE TABLE IF NOT EXISTS "SystemConfig" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SystemConfig_pkey" PRIMARY KEY ("key")
);

-- 4. Verify existing SDRs have default VoipProvider set to ALLO if null
UPDATE "User"
SET "voipProvider" = 'ALLO'
WHERE "voipProvider" IS NULL;

-- 5. Confirmation message
SELECT 'Migration VoIP & Telephony System completed successfully!' AS status;
