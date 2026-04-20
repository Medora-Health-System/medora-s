-- Phase 1: relational billing event ledger (automatic charge capture).

CREATE TYPE "BillingSourceModule" AS ENUM (
  'DIAGNOSIS',
  'ORDER_ITEM',
  'MEDICATION_DISPENSE',
  'MEDICATION_ADMINISTRATION',
  'ENCOUNTER_DISPOSITION',
  'MANUAL',
  'VACCINE_ADMINISTRATION'
);

CREATE TYPE "BillingReviewStatus" AS ENUM (
  'CAPTURED',
  'REVIEWED',
  'VOIDED',
  'SKIPPED'
);

CREATE TYPE "BillingCodeType" AS ENUM (
  'UNKNOWN',
  'INTERNAL',
  'CPT',
  'HCPCS',
  'ICD10_CM'
);

CREATE TYPE "BillingSide" AS ENUM (
  'UNKNOWN',
  'PROFESSIONAL',
  'FACILITY',
  'BOTH'
);

CREATE TABLE "BillingEvent" (
    "id" TEXT NOT NULL,
    "facilityId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "encounterId" TEXT NOT NULL,
    "captureItemId" TEXT,
    "sourceModule" "BillingSourceModule" NOT NULL,
    "sourceRecordId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL DEFAULT 'CHARGE_CAPTURE',
    "serviceDate" TIMESTAMP(3),
    "units" INTEGER,
    "codeType" "BillingCodeType",
    "code" TEXT,
    "procedureCode" TEXT,
    "hcpcsCode" TEXT,
    "diagnosisCodes" TEXT,
    "descriptionSnapshot" TEXT,
    "priceSnapshot" DECIMAL(14,2),
    "modifier1" TEXT,
    "modifier2" TEXT,
    "revenueCode" TEXT,
    "billingSide" "BillingSide" NOT NULL DEFAULT 'UNKNOWN',
    "reviewStatus" "BillingReviewStatus" NOT NULL DEFAULT 'CAPTURED',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BillingEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BillingEvent_facilityId_sourceModule_sourceRecordId_key" ON "BillingEvent"("facilityId", "sourceModule", "sourceRecordId");

CREATE INDEX "BillingEvent_encounterId_idx" ON "BillingEvent"("encounterId");

CREATE INDEX "BillingEvent_facilityId_reviewStatus_idx" ON "BillingEvent"("facilityId", "reviewStatus");

CREATE INDEX "BillingEvent_patientId_idx" ON "BillingEvent"("patientId");

ALTER TABLE "BillingEvent" ADD CONSTRAINT "BillingEvent_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "Facility"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "BillingEvent" ADD CONSTRAINT "BillingEvent_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "BillingEvent" ADD CONSTRAINT "BillingEvent_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES "Encounter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
