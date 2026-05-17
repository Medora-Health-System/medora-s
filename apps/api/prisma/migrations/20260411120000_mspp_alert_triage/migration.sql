-- CreateEnum
CREATE TYPE "MsppAlertTriageStatus" AS ENUM ('NEW', 'ACKNOWLEDGED', 'UNDER_REVIEW', 'ESCALATED_INTERNAL', 'CLOSED');

-- CreateTable
CREATE TABLE "MsppAlertTriage" (
    "id" TEXT NOT NULL,
    "alertKey" TEXT NOT NULL,
    "windowCurrentStart" TIMESTAMP(3) NOT NULL,
    "windowCurrentEnd" TIMESTAMP(3) NOT NULL,
    "scope" TEXT NOT NULL,
    "escalationLevel" TEXT NOT NULL,
    "diseaseCode" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "geoCommuneId" TEXT,
    "triageStatus" "MsppAlertTriageStatus" NOT NULL DEFAULT 'NEW',
    "acknowledgedAt" TIMESTAMP(3),
    "acknowledgedByUserId" TEXT,
    "assignedToUserId" TEXT,
    "triageNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MsppAlertTriage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MsppAlertTriage_alertKey_key" ON "MsppAlertTriage"("alertKey");

-- CreateIndex
CREATE INDEX "MsppAlertTriage_triageStatus_idx" ON "MsppAlertTriage"("triageStatus");

-- CreateIndex
CREATE INDEX "MsppAlertTriage_departmentId_idx" ON "MsppAlertTriage"("departmentId");

-- CreateIndex
CREATE INDEX "MsppAlertTriage_updatedAt_idx" ON "MsppAlertTriage"("updatedAt");

-- AddForeignKey
ALTER TABLE "MsppAlertTriage" ADD CONSTRAINT "MsppAlertTriage_acknowledgedByUserId_fkey" FOREIGN KEY ("acknowledgedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MsppAlertTriage" ADD CONSTRAINT "MsppAlertTriage_assignedToUserId_fkey" FOREIGN KEY ("assignedToUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
