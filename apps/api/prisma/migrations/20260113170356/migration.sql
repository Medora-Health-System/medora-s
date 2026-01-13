-- CreateEnum
CREATE TYPE "PathwayType" AS ENUM ('STROKE', 'SEPSIS', 'STEMI', 'TRAUMA');

-- CreateEnum
CREATE TYPE "PathwayStatus" AS ENUM ('ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PathwayMilestoneStatus" AS ENUM ('PENDING', 'MET', 'OVERDUE', 'SKIPPED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'PATHWAY_ACTIVATED';
ALTER TYPE "AuditAction" ADD VALUE 'ORDERS_CREATED';

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "pathwaySessionId" TEXT,
ADD COLUMN     "source" TEXT;

-- CreateTable
CREATE TABLE "PathwaySession" (
    "id" TEXT NOT NULL,
    "encounterId" TEXT NOT NULL,
    "facilityId" TEXT NOT NULL,
    "type" "PathwayType" NOT NULL,
    "status" "PathwayStatus" NOT NULL DEFAULT 'ACTIVE',
    "contextJson" JSONB,
    "activatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "pausedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "activatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PathwaySession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PathwayMilestone" (
    "id" TEXT NOT NULL,
    "pathwaySessionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "targetMinutes" INTEGER NOT NULL,
    "status" "PathwayMilestoneStatus" NOT NULL DEFAULT 'PENDING',
    "metAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PathwayMilestone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProtocolOrderSet" (
    "id" TEXT NOT NULL,
    "facilityId" TEXT NOT NULL,
    "pathwayType" "PathwayType" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProtocolOrderSet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProtocolOrderSetItem" (
    "id" TEXT NOT NULL,
    "protocolOrderSetId" TEXT NOT NULL,
    "catalogLabTestId" TEXT,
    "catalogImagingStudyId" TEXT,
    "catalogMedicationId" TEXT,
    "priority" "OrderPriority" NOT NULL DEFAULT 'ROUTINE',
    "sequence" INTEGER NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProtocolOrderSetItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PathwaySession_encounterId_key" ON "PathwaySession"("encounterId");

-- CreateIndex
CREATE INDEX "PathwaySession_encounterId_idx" ON "PathwaySession"("encounterId");

-- CreateIndex
CREATE INDEX "PathwaySession_facilityId_idx" ON "PathwaySession"("facilityId");

-- CreateIndex
CREATE INDEX "PathwaySession_type_idx" ON "PathwaySession"("type");

-- CreateIndex
CREATE INDEX "PathwaySession_status_idx" ON "PathwaySession"("status");

-- CreateIndex
CREATE INDEX "PathwayMilestone_pathwaySessionId_idx" ON "PathwayMilestone"("pathwaySessionId");

-- CreateIndex
CREATE INDEX "PathwayMilestone_status_idx" ON "PathwayMilestone"("status");

-- CreateIndex
CREATE INDEX "ProtocolOrderSet_facilityId_idx" ON "ProtocolOrderSet"("facilityId");

-- CreateIndex
CREATE INDEX "ProtocolOrderSet_pathwayType_idx" ON "ProtocolOrderSet"("pathwayType");

-- CreateIndex
CREATE INDEX "ProtocolOrderSet_isActive_idx" ON "ProtocolOrderSet"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "ProtocolOrderSet_facilityId_pathwayType_key" ON "ProtocolOrderSet"("facilityId", "pathwayType");

-- CreateIndex
CREATE INDEX "ProtocolOrderSetItem_protocolOrderSetId_idx" ON "ProtocolOrderSetItem"("protocolOrderSetId");

-- CreateIndex
CREATE INDEX "ProtocolOrderSetItem_sequence_idx" ON "ProtocolOrderSetItem"("sequence");

-- CreateIndex
CREATE INDEX "Order_pathwaySessionId_idx" ON "Order"("pathwaySessionId");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_pathwaySessionId_fkey" FOREIGN KEY ("pathwaySessionId") REFERENCES "PathwaySession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PathwaySession" ADD CONSTRAINT "PathwaySession_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES "Encounter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PathwaySession" ADD CONSTRAINT "PathwaySession_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "Facility"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PathwayMilestone" ADD CONSTRAINT "PathwayMilestone_pathwaySessionId_fkey" FOREIGN KEY ("pathwaySessionId") REFERENCES "PathwaySession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProtocolOrderSet" ADD CONSTRAINT "ProtocolOrderSet_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "Facility"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProtocolOrderSetItem" ADD CONSTRAINT "ProtocolOrderSetItem_protocolOrderSetId_fkey" FOREIGN KEY ("protocolOrderSetId") REFERENCES "ProtocolOrderSet"("id") ON DELETE CASCADE ON UPDATE CASCADE;
