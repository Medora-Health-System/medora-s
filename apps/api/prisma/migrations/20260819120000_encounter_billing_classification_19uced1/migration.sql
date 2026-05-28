-- Phase 19UCED.1 — encounter billing classification layer (one chart, explicit classification changes).

CREATE TYPE "FacilityBillingSiteType" AS ENUM (
  'CLINIC',
  'URGENT_CARE',
  'FREESTANDING_ER',
  'HOSPITAL',
  'HYBRID'
);

CREATE TYPE "BillingClassification" AS ENUM (
  'CLINIC_VISIT',
  'URGENT_CARE',
  'EMERGENCY_DEPARTMENT',
  'OBSERVATION',
  'INPATIENT',
  'PROCEDURE',
  'TELEHEALTH'
);

ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'ENCOUNTER_BILLING_CLASSIFICATION_CHANGED';

ALTER TABLE "Facility" ADD COLUMN IF NOT EXISTS "billingSiteType" "FacilityBillingSiteType";

ALTER TABLE "Encounter" ADD COLUMN IF NOT EXISTS "billingClassification" "BillingClassification" NOT NULL DEFAULT 'URGENT_CARE';
ALTER TABLE "Encounter" ADD COLUMN IF NOT EXISTS "billingClassificationChangedAt" TIMESTAMP(3);
ALTER TABLE "Encounter" ADD COLUMN IF NOT EXISTS "billingClassificationChangedByUserId" TEXT;
ALTER TABLE "Encounter" ADD COLUMN IF NOT EXISTS "billingClassificationChangeReason" TEXT;
ALTER TABLE "Encounter" ADD COLUMN IF NOT EXISTS "billingClassificationAcknowledgedAt" TIMESTAMP(3);
ALTER TABLE "Encounter" ADD COLUMN IF NOT EXISTS "billingClassificationAcknowledgedByUserId" TEXT;
ALTER TABLE "Encounter" ADD COLUMN IF NOT EXISTS "billingClassificationAcknowledgmentMethod" TEXT;
ALTER TABLE "Encounter" ADD COLUMN IF NOT EXISTS "billingClassificationTransitionJson" JSONB;

ALTER TABLE "Encounter"
  ADD CONSTRAINT "Encounter_billingClassificationChangedByUserId_fkey"
  FOREIGN KEY ("billingClassificationChangedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Encounter"
  ADD CONSTRAINT "Encounter_billingClassificationAcknowledgedByUserId_fkey"
  FOREIGN KEY ("billingClassificationAcknowledgedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Safe type-based backfill (no clinical interpretation beyond encounter.type).
UPDATE "Encounter" SET "billingClassification" = 'CLINIC_VISIT' WHERE "type" = 'OUTPATIENT' AND "billingClassification" = 'URGENT_CARE';
UPDATE "Encounter" SET "billingClassification" = 'URGENT_CARE' WHERE "type" = 'URGENT_CARE' AND "billingClassification" = 'URGENT_CARE';
UPDATE "Encounter" SET "billingClassification" = 'EMERGENCY_DEPARTMENT' WHERE "type" = 'EMERGENCY' AND "billingClassification" = 'URGENT_CARE';
UPDATE "Encounter" SET "billingClassification" = 'OBSERVATION' WHERE "type" = 'INPATIENT' AND "billingClassification" = 'URGENT_CARE';

CREATE INDEX IF NOT EXISTS "Encounter_billingClassification_idx" ON "Encounter"("billingClassification");
