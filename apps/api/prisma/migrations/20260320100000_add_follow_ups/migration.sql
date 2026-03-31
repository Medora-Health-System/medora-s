-- CreateEnum
CREATE TYPE "FollowUpStatus" AS ENUM ('OPEN', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "FollowUp" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "facilityId" TEXT NOT NULL,
    "encounterId" TEXT,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "reason" TEXT,
    "status" "FollowUpStatus" NOT NULL DEFAULT 'OPEN',
    "notes" TEXT,
    "createdByUserId" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FollowUp_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FollowUp_patientId_idx" ON "FollowUp"("patientId");

-- CreateIndex
CREATE INDEX "FollowUp_facilityId_idx" ON "FollowUp"("facilityId");

-- CreateIndex
CREATE INDEX "FollowUp_dueDate_idx" ON "FollowUp"("dueDate");

-- CreateIndex
CREATE INDEX "FollowUp_status_idx" ON "FollowUp"("status");

-- CreateIndex
CREATE INDEX "FollowUp_facilityId_status_dueDate_idx" ON "FollowUp"("facilityId", "status", "dueDate");

-- AddForeignKey
ALTER TABLE "FollowUp" ADD CONSTRAINT "FollowUp_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowUp" ADD CONSTRAINT "FollowUp_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "Facility"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowUp" ADD CONSTRAINT "FollowUp_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES "Encounter"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowUp" ADD CONSTRAINT "FollowUp_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
