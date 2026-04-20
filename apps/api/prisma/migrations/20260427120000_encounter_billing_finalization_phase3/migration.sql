-- Phase 3: encounter-level billing finalization + audit action for reopen.

CREATE TYPE "EncounterBillingFinalizationStatus" AS ENUM ('NOT_READY', 'READY_FOR_REVIEW', 'FINALIZED', 'REOPENED');

ALTER TABLE "Encounter" ADD COLUMN "billingFinalizationStatus" "EncounterBillingFinalizationStatus" NOT NULL DEFAULT 'NOT_READY';
ALTER TABLE "Encounter" ADD COLUMN "billingFinalizedAt" TIMESTAMP(3);
ALTER TABLE "Encounter" ADD COLUMN "billingFinalizedByUserId" TEXT;
ALTER TABLE "Encounter" ADD COLUMN "billingReopenedAt" TIMESTAMP(3);
ALTER TABLE "Encounter" ADD COLUMN "billingReopenedByUserId" TEXT;
ALTER TABLE "Encounter" ADD COLUMN "billingReadinessSnapshotJson" JSONB;

ALTER TABLE "Encounter" ADD CONSTRAINT "Encounter_billingFinalizedByUserId_fkey" FOREIGN KEY ("billingFinalizedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Encounter" ADD CONSTRAINT "Encounter_billingReopenedByUserId_fkey" FOREIGN KEY ("billingReopenedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Encounter_billingFinalizationStatus_idx" ON "Encounter"("billingFinalizationStatus");

ALTER TYPE "AuditAction" ADD VALUE 'BILLING_REOPENED';
