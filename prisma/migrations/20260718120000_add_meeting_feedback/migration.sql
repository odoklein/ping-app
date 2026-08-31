-- MeetingFeedback was added to schema.prisma without a corresponding migration.
-- Keep this migration idempotent because some environments were previously
-- synchronized with `prisma db push` and may already have these objects.

DO $$ BEGIN
    CREATE TYPE "MeetingOutcome" AS ENUM ('POSITIVE', 'NEUTRAL', 'NEGATIVE', 'NO_SHOW');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "RecontactPreference" AS ENUM ('YES', 'NO', 'MAYBE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "MeetingFeedback" (
    "id" TEXT NOT NULL,
    "actionId" TEXT NOT NULL,
    "outcome" "MeetingOutcome" NOT NULL,
    "recontactRequested" "RecontactPreference" NOT NULL,
    "clientNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MeetingFeedback_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "MeetingFeedback_actionId_fkey"
        FOREIGN KEY ("actionId") REFERENCES "Action"("id")
        ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "MeetingFeedback_actionId_key"
    ON "MeetingFeedback"("actionId");
