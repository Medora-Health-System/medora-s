/*
  Warnings:

  - Added the required column `updatedAt` to the `OrderItem` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "DischargeStatus" AS ENUM ('DISCHARGED', 'AMA', 'TRANSFERRED', 'DECEASED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'CHART_ACCESS';
ALTER TYPE "AuditAction" ADD VALUE 'ORDER_UPDATE';
ALTER TYPE "AuditAction" ADD VALUE 'RESULT_UPLOAD';
ALTER TYPE "AuditAction" ADD VALUE 'MEDICATION_DISPENSED';
ALTER TYPE "AuditAction" ADD VALUE 'BILLING_FINALIZED';

-- AlterEnum
ALTER TYPE "RoleCode" ADD VALUE 'BILLING';

-- AlterTable
ALTER TABLE "Encounter" ADD COLUMN     "dischargeStatus" "DischargeStatus",
ADD COLUMN     "dischargedAt" TIMESTAMP(3),
ADD COLUMN     "disposition" TEXT,
ADD COLUMN     "nursingAssessment" JSONB,
ADD COLUMN     "providerNote" TEXT;

-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN     "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- CreateIndex
CREATE INDEX "Encounter_status_idx" ON "Encounter"("status");

-- CreateIndex
CREATE INDEX "OrderItem_status_idx" ON "OrderItem"("status");

-- CreateIndex
CREATE INDEX "OrderItem_catalogItemType_idx" ON "OrderItem"("catalogItemType");
