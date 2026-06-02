-- M1.3F.1 — MAR/eMAR governance schema foundation (additive; no runtime behavior)

CREATE TYPE "MedicationVerificationType" AS ENUM (
  'WITNESS',
  'COSIGN',
  'DUAL_VERIFICATION',
  'INDEPENDENT_DOUBLE_CHECK',
  'LASA_ACKNOWLEDGMENT',
  'HIGH_ALERT_CHECK',
  'CONTROLLED_SUBSTANCE_CHECK'
);

CREATE TYPE "MedicationVerificationStatus" AS ENUM (
  'PENDING',
  'COMPLETED',
  'REJECTED',
  'CANCELLED'
);

CREATE TYPE "MedicationWasteStatus" AS ENUM (
  'DRAFT',
  'COMPLETED',
  'VOIDED'
);

CREATE TYPE "MedicationOverrideType" AS ENUM (
  'PHARMACY_PENDING_OVERRIDE',
  'HIGH_ALERT_OVERRIDE',
  'CONTROLLED_SUBSTANCE_OVERRIDE',
  'LASA_OVERRIDE',
  'BARCODE_SCAN_OVERRIDE',
  'SCHEDULE_OVERRIDE',
  'OTHER'
);

CREATE TYPE "PharmacyVerificationStatus" AS ENUM (
  'NOT_REQUIRED',
  'PENDING',
  'VERIFIED',
  'REJECTED',
  'OVERRIDDEN'
);

CREATE TYPE "MedicationCorrectionStatus" AS ENUM (
  'RECORDED',
  'VOIDED'
);

CREATE TABLE "MedicationAdministrationVerification" (
  "id" TEXT NOT NULL,
  "facilityId" TEXT NOT NULL,
  "medicationAdministrationId" TEXT NOT NULL,
  "encounterId" TEXT NOT NULL,
  "orderItemId" TEXT,
  "catalogMedicationId" TEXT,
  "verificationType" "MedicationVerificationType" NOT NULL,
  "verificationStatus" "MedicationVerificationStatus" NOT NULL DEFAULT 'PENDING',
  "verifierUserId" TEXT NOT NULL,
  "witnessedByUserId" TEXT,
  "reason" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "MedicationAdministrationVerification_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MedicationWasteDocumentation" (
  "id" TEXT NOT NULL,
  "facilityId" TEXT NOT NULL,
  "medicationAdministrationId" TEXT NOT NULL,
  "encounterId" TEXT NOT NULL,
  "orderItemId" TEXT,
  "catalogMedicationId" TEXT,
  "wastedAmount" DECIMAL(12, 4) NOT NULL,
  "wastedUnit" VARCHAR(32) NOT NULL,
  "wasteReason" TEXT,
  "witnessUserId" TEXT,
  "documentedByUserId" TEXT NOT NULL,
  "status" "MedicationWasteStatus" NOT NULL DEFAULT 'DRAFT',
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "MedicationWasteDocumentation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MedicationAdministrationOverride" (
  "id" TEXT NOT NULL,
  "facilityId" TEXT NOT NULL,
  "medicationAdministrationId" TEXT NOT NULL,
  "encounterId" TEXT NOT NULL,
  "orderItemId" TEXT,
  "overrideType" "MedicationOverrideType" NOT NULL,
  "overrideReason" TEXT,
  "actorUserId" TEXT NOT NULL,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "MedicationAdministrationOverride_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MedicationAdministrationCorrection" (
  "id" TEXT NOT NULL,
  "facilityId" TEXT NOT NULL,
  "medicationAdministrationId" TEXT NOT NULL,
  "correctedByUserId" TEXT NOT NULL,
  "correctionReason" TEXT,
  "previousValues" JSONB NOT NULL,
  "correctedValues" JSONB NOT NULL,
  "status" "MedicationCorrectionStatus" NOT NULL DEFAULT 'RECORDED',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "MedicationAdministrationCorrection_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PharmacyVerification" (
  "id" TEXT NOT NULL,
  "facilityId" TEXT NOT NULL,
  "orderItemId" TEXT NOT NULL,
  "encounterId" TEXT NOT NULL,
  "catalogMedicationId" TEXT,
  "verificationStatus" "PharmacyVerificationStatus" NOT NULL DEFAULT 'PENDING',
  "pharmacistUserId" TEXT,
  "verificationNote" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "PharmacyVerification_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MedicationAdministrationVerification_facilityId_idx"
  ON "MedicationAdministrationVerification"("facilityId");
CREATE INDEX "MedicationAdministrationVerification_encounterId_idx"
  ON "MedicationAdministrationVerification"("encounterId");
CREATE INDEX "MedicationAdministrationVerification_orderItemId_idx"
  ON "MedicationAdministrationVerification"("orderItemId");
CREATE INDEX "MedicationAdministrationVerification_medicationAdministrationId_idx"
  ON "MedicationAdministrationVerification"("medicationAdministrationId");
CREATE INDEX "MedicationAdministrationVerification_catalogMedicationId_idx"
  ON "MedicationAdministrationVerification"("catalogMedicationId");
CREATE INDEX "MedicationAdministrationVerification_verificationType_idx"
  ON "MedicationAdministrationVerification"("verificationType");
CREATE INDEX "MedicationAdministrationVerification_verificationStatus_idx"
  ON "MedicationAdministrationVerification"("verificationStatus");
CREATE INDEX "MedicationAdministrationVerification_verifierUserId_idx"
  ON "MedicationAdministrationVerification"("verifierUserId");
CREATE INDEX "MedicationAdministrationVerification_witnessedByUserId_idx"
  ON "MedicationAdministrationVerification"("witnessedByUserId");
CREATE INDEX "MedicationAdministrationVerification_createdAt_idx"
  ON "MedicationAdministrationVerification"("createdAt");

CREATE INDEX "MedicationWasteDocumentation_facilityId_idx" ON "MedicationWasteDocumentation"("facilityId");
CREATE INDEX "MedicationWasteDocumentation_encounterId_idx" ON "MedicationWasteDocumentation"("encounterId");
CREATE INDEX "MedicationWasteDocumentation_orderItemId_idx" ON "MedicationWasteDocumentation"("orderItemId");
CREATE INDEX "MedicationWasteDocumentation_medicationAdministrationId_idx"
  ON "MedicationWasteDocumentation"("medicationAdministrationId");
CREATE INDEX "MedicationWasteDocumentation_catalogMedicationId_idx"
  ON "MedicationWasteDocumentation"("catalogMedicationId");
CREATE INDEX "MedicationWasteDocumentation_status_idx" ON "MedicationWasteDocumentation"("status");
CREATE INDEX "MedicationWasteDocumentation_documentedByUserId_idx"
  ON "MedicationWasteDocumentation"("documentedByUserId");
CREATE INDEX "MedicationWasteDocumentation_witnessUserId_idx" ON "MedicationWasteDocumentation"("witnessUserId");
CREATE INDEX "MedicationWasteDocumentation_createdAt_idx" ON "MedicationWasteDocumentation"("createdAt");

CREATE INDEX "MedicationAdministrationOverride_facilityId_idx"
  ON "MedicationAdministrationOverride"("facilityId");
CREATE INDEX "MedicationAdministrationOverride_encounterId_idx"
  ON "MedicationAdministrationOverride"("encounterId");
CREATE INDEX "MedicationAdministrationOverride_orderItemId_idx"
  ON "MedicationAdministrationOverride"("orderItemId");
CREATE INDEX "MedicationAdministrationOverride_medicationAdministrationId_idx"
  ON "MedicationAdministrationOverride"("medicationAdministrationId");
CREATE INDEX "MedicationAdministrationOverride_overrideType_idx"
  ON "MedicationAdministrationOverride"("overrideType");
CREATE INDEX "MedicationAdministrationOverride_actorUserId_idx"
  ON "MedicationAdministrationOverride"("actorUserId");
CREATE INDEX "MedicationAdministrationOverride_createdAt_idx"
  ON "MedicationAdministrationOverride"("createdAt");

CREATE INDEX "MedicationAdministrationCorrection_facilityId_idx"
  ON "MedicationAdministrationCorrection"("facilityId");
CREATE INDEX "MedicationAdministrationCorrection_medicationAdministrationId_idx"
  ON "MedicationAdministrationCorrection"("medicationAdministrationId");
CREATE INDEX "MedicationAdministrationCorrection_correctedByUserId_idx"
  ON "MedicationAdministrationCorrection"("correctedByUserId");
CREATE INDEX "MedicationAdministrationCorrection_status_idx"
  ON "MedicationAdministrationCorrection"("status");
CREATE INDEX "MedicationAdministrationCorrection_createdAt_idx"
  ON "MedicationAdministrationCorrection"("createdAt");

CREATE INDEX "PharmacyVerification_facilityId_idx" ON "PharmacyVerification"("facilityId");
CREATE INDEX "PharmacyVerification_encounterId_idx" ON "PharmacyVerification"("encounterId");
CREATE INDEX "PharmacyVerification_orderItemId_idx" ON "PharmacyVerification"("orderItemId");
CREATE INDEX "PharmacyVerification_catalogMedicationId_idx" ON "PharmacyVerification"("catalogMedicationId");
CREATE INDEX "PharmacyVerification_verificationStatus_idx" ON "PharmacyVerification"("verificationStatus");
CREATE INDEX "PharmacyVerification_pharmacistUserId_idx" ON "PharmacyVerification"("pharmacistUserId");
CREATE INDEX "PharmacyVerification_createdAt_idx" ON "PharmacyVerification"("createdAt");

ALTER TABLE "MedicationAdministrationVerification"
  ADD CONSTRAINT "MedicationAdministrationVerification_facilityId_fkey"
  FOREIGN KEY ("facilityId") REFERENCES "Facility"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MedicationAdministrationVerification"
  ADD CONSTRAINT "MedicationAdministrationVerification_medicationAdministrationId_fkey"
  FOREIGN KEY ("medicationAdministrationId") REFERENCES "MedicationAdministration"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MedicationAdministrationVerification"
  ADD CONSTRAINT "MedicationAdministrationVerification_encounterId_fkey"
  FOREIGN KEY ("encounterId") REFERENCES "Encounter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MedicationAdministrationVerification"
  ADD CONSTRAINT "MedicationAdministrationVerification_orderItemId_fkey"
  FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MedicationAdministrationVerification"
  ADD CONSTRAINT "MedicationAdministrationVerification_catalogMedicationId_fkey"
  FOREIGN KEY ("catalogMedicationId") REFERENCES "CatalogMedication"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MedicationAdministrationVerification"
  ADD CONSTRAINT "MedicationAdministrationVerification_verifierUserId_fkey"
  FOREIGN KEY ("verifierUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MedicationAdministrationVerification"
  ADD CONSTRAINT "MedicationAdministrationVerification_witnessedByUserId_fkey"
  FOREIGN KEY ("witnessedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "MedicationWasteDocumentation"
  ADD CONSTRAINT "MedicationWasteDocumentation_facilityId_fkey"
  FOREIGN KEY ("facilityId") REFERENCES "Facility"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MedicationWasteDocumentation"
  ADD CONSTRAINT "MedicationWasteDocumentation_medicationAdministrationId_fkey"
  FOREIGN KEY ("medicationAdministrationId") REFERENCES "MedicationAdministration"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MedicationWasteDocumentation"
  ADD CONSTRAINT "MedicationWasteDocumentation_encounterId_fkey"
  FOREIGN KEY ("encounterId") REFERENCES "Encounter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MedicationWasteDocumentation"
  ADD CONSTRAINT "MedicationWasteDocumentation_orderItemId_fkey"
  FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MedicationWasteDocumentation"
  ADD CONSTRAINT "MedicationWasteDocumentation_catalogMedicationId_fkey"
  FOREIGN KEY ("catalogMedicationId") REFERENCES "CatalogMedication"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MedicationWasteDocumentation"
  ADD CONSTRAINT "MedicationWasteDocumentation_witnessUserId_fkey"
  FOREIGN KEY ("witnessUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MedicationWasteDocumentation"
  ADD CONSTRAINT "MedicationWasteDocumentation_documentedByUserId_fkey"
  FOREIGN KEY ("documentedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "MedicationAdministrationOverride"
  ADD CONSTRAINT "MedicationAdministrationOverride_facilityId_fkey"
  FOREIGN KEY ("facilityId") REFERENCES "Facility"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MedicationAdministrationOverride"
  ADD CONSTRAINT "MedicationAdministrationOverride_medicationAdministrationId_fkey"
  FOREIGN KEY ("medicationAdministrationId") REFERENCES "MedicationAdministration"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MedicationAdministrationOverride"
  ADD CONSTRAINT "MedicationAdministrationOverride_encounterId_fkey"
  FOREIGN KEY ("encounterId") REFERENCES "Encounter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MedicationAdministrationOverride"
  ADD CONSTRAINT "MedicationAdministrationOverride_orderItemId_fkey"
  FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MedicationAdministrationOverride"
  ADD CONSTRAINT "MedicationAdministrationOverride_actorUserId_fkey"
  FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "MedicationAdministrationCorrection"
  ADD CONSTRAINT "MedicationAdministrationCorrection_facilityId_fkey"
  FOREIGN KEY ("facilityId") REFERENCES "Facility"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MedicationAdministrationCorrection"
  ADD CONSTRAINT "MedicationAdministrationCorrection_medicationAdministrationId_fkey"
  FOREIGN KEY ("medicationAdministrationId") REFERENCES "MedicationAdministration"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MedicationAdministrationCorrection"
  ADD CONSTRAINT "MedicationAdministrationCorrection_correctedByUserId_fkey"
  FOREIGN KEY ("correctedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PharmacyVerification"
  ADD CONSTRAINT "PharmacyVerification_facilityId_fkey"
  FOREIGN KEY ("facilityId") REFERENCES "Facility"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PharmacyVerification"
  ADD CONSTRAINT "PharmacyVerification_orderItemId_fkey"
  FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PharmacyVerification"
  ADD CONSTRAINT "PharmacyVerification_encounterId_fkey"
  FOREIGN KEY ("encounterId") REFERENCES "Encounter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PharmacyVerification"
  ADD CONSTRAINT "PharmacyVerification_catalogMedicationId_fkey"
  FOREIGN KEY ("catalogMedicationId") REFERENCES "CatalogMedication"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PharmacyVerification"
  ADD CONSTRAINT "PharmacyVerification_pharmacistUserId_fkey"
  FOREIGN KEY ("pharmacistUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
