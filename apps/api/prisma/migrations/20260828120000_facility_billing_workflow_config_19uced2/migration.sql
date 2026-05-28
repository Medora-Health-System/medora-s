-- Phase 19UCED.2 — facility-configurable billing classification workflow.

CREATE TYPE "FacilityBillingClassificationMode" AS ENUM (
  'CLINIC_ONLY',
  'URGENT_CARE_ONLY',
  'EMERGENCY_ONLY',
  'HYBRID_UC_ED',
  'HOSPITAL_ENTERPRISE'
);

ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'UC_TO_ED_CONVERSION_COMPLETED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'UC_TO_ED_PATIENT_ACKNOWLEDGED';

ALTER TABLE "Facility" ADD COLUMN IF NOT EXISTS "billingClassificationMode" "FacilityBillingClassificationMode";
ALTER TABLE "Facility" ADD COLUMN IF NOT EXISTS "allowedEncounterBillingClassifications" "BillingClassification"[] NOT NULL DEFAULT ARRAY[]::"BillingClassification"[];
ALTER TABLE "Facility" ADD COLUMN IF NOT EXISTS "allowUrgentCareToEmergencyUpgrade" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Facility" ADD COLUMN IF NOT EXISTS "requireUcToEdPatientAcknowledgement" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Facility" ADD COLUMN IF NOT EXISTS "showEncounterBillingControls" BOOLEAN NOT NULL DEFAULT false;

-- Safe backfill: map existing billingSiteType to mode (no clinical interpretation).
UPDATE "Facility" SET "billingClassificationMode" = 'CLINIC_ONLY'
  WHERE "billingSiteType" = 'CLINIC' AND "billingClassificationMode" IS NULL;
UPDATE "Facility" SET "billingClassificationMode" = 'URGENT_CARE_ONLY'
  WHERE "billingSiteType" = 'URGENT_CARE' AND "billingClassificationMode" IS NULL;
UPDATE "Facility" SET "billingClassificationMode" = 'EMERGENCY_ONLY'
  WHERE "billingSiteType" = 'FREESTANDING_ER' AND "billingClassificationMode" IS NULL;
UPDATE "Facility" SET "billingClassificationMode" = 'HYBRID_UC_ED'
  WHERE "billingSiteType" = 'HYBRID' AND "billingClassificationMode" IS NULL;
UPDATE "Facility" SET "billingClassificationMode" = 'HOSPITAL_ENTERPRISE'
  WHERE "billingSiteType" = 'HOSPITAL' AND "billingClassificationMode" IS NULL;

UPDATE "Facility" SET "allowUrgentCareToEmergencyUpgrade" = true
  WHERE "billingClassificationMode" IN ('HYBRID_UC_ED', 'HOSPITAL_ENTERPRISE')
    AND "allowUrgentCareToEmergencyUpgrade" = false;

UPDATE "Facility" SET "showEncounterBillingControls" = true
  WHERE "billingClassificationMode" IN ('HYBRID_UC_ED', 'HOSPITAL_ENTERPRISE')
    AND "showEncounterBillingControls" = false;
