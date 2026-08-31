CREATE TABLE "TaskReminderDelivery" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "reminderKey" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaskReminderDelivery_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TaskReminderDelivery_reminderKey_key" ON "TaskReminderDelivery"("reminderKey");
CREATE INDEX "TaskReminderDelivery_userId_idx" ON "TaskReminderDelivery"("userId");
CREATE INDEX "TaskReminderDelivery_createdAt_idx" ON "TaskReminderDelivery"("createdAt");

ALTER TABLE "TaskReminderDelivery"
ADD CONSTRAINT "TaskReminderDelivery_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
