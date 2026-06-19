-- AlterTable
ALTER TABLE "User"
  ADD COLUMN "reminderDasEnabled" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "reminderInactivityEnabled" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "ReminderLog" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "reference" TEXT NOT NULL,
  "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ReminderLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ReminderLog_userId_kind_reference_key" ON "ReminderLog"("userId", "kind", "reference");
CREATE INDEX "ReminderLog_userId_idx" ON "ReminderLog"("userId");

-- AddForeignKey
ALTER TABLE "ReminderLog" ADD CONSTRAINT "ReminderLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
