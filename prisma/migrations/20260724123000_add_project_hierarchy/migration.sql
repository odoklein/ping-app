ALTER TABLE "Project"
ADD COLUMN "isGroup" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "parentProjectId" TEXT;

CREATE INDEX "Project_parentProjectId_idx" ON "Project"("parentProjectId");

ALTER TABLE "Project"
ADD CONSTRAINT "Project_parentProjectId_fkey"
FOREIGN KEY ("parentProjectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;
