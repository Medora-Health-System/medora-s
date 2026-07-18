-- Phase 8 — clinical knowledge foundation (additive; no clinical activation).

CREATE TABLE IF NOT EXISTS "MedicationClinicalKnowledgeSource" (
  "id" TEXT NOT NULL,
  "sourceCode" VARCHAR(64) NOT NULL,
  "sourceName" TEXT NOT NULL,
  "organization" TEXT,
  "licenseNotes" TEXT,
  "sourceUrl" TEXT,
  "isAuthoritative" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MedicationClinicalKnowledgeSource_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "MedicationClinicalKnowledgeSource_sourceCode_key"
  ON "MedicationClinicalKnowledgeSource"("sourceCode");
CREATE INDEX IF NOT EXISTS "MedicationClinicalKnowledgeSource_isAuthoritative_idx"
  ON "MedicationClinicalKnowledgeSource"("isAuthoritative");

CREATE TABLE IF NOT EXISTS "MedicationClinicalKnowledgeVersion" (
  "id" TEXT NOT NULL,
  "sourceId" TEXT NOT NULL,
  "versionLabel" VARCHAR(64) NOT NULL,
  "knowledgeVersion" VARCHAR(64) NOT NULL,
  "effectiveDate" TIMESTAMP(3),
  "retrievedAt" TIMESTAMP(3),
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MedicationClinicalKnowledgeVersion_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "MedicationClinicalKnowledgeVersion_sourceId_versionLabel_key"
  ON "MedicationClinicalKnowledgeVersion"("sourceId", "versionLabel");
CREATE INDEX IF NOT EXISTS "MedicationClinicalKnowledgeVersion_knowledgeVersion_idx"
  ON "MedicationClinicalKnowledgeVersion"("knowledgeVersion");

CREATE TABLE IF NOT EXISTS "MedicationClinicalProfile" (
  "id" TEXT NOT NULL,
  "conceptId" TEXT,
  "productId" TEXT,
  "sourceId" TEXT NOT NULL,
  "knowledgeVersionId" TEXT NOT NULL,
  "lifecycleStatus" VARCHAR(32) NOT NULL DEFAULT 'DRAFT',
  "knowledgeSourceLabel" VARCHAR(128),
  "knowledgeVersionLabel" VARCHAR(64),
  "evidenceLevel" VARCHAR(32),
  "effectiveDate" TIMESTAMP(3),
  "reviewedByUserId" TEXT,
  "approvedByUserId" TEXT,
  "approvalDate" TIMESTAMP(3),
  "supersedesProfileId" TEXT,
  "clinicalActivationAllowed" BOOLEAN NOT NULL DEFAULT false,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MedicationClinicalProfile_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "MedicationClinicalProfile_conceptId_idx" ON "MedicationClinicalProfile"("conceptId");
CREATE INDEX IF NOT EXISTS "MedicationClinicalProfile_productId_idx" ON "MedicationClinicalProfile"("productId");
CREATE INDEX IF NOT EXISTS "MedicationClinicalProfile_sourceId_idx" ON "MedicationClinicalProfile"("sourceId");
CREATE INDEX IF NOT EXISTS "MedicationClinicalProfile_knowledgeVersionId_idx" ON "MedicationClinicalProfile"("knowledgeVersionId");
CREATE INDEX IF NOT EXISTS "MedicationClinicalProfile_lifecycleStatus_idx" ON "MedicationClinicalProfile"("lifecycleStatus");
CREATE INDEX IF NOT EXISTS "MedicationClinicalProfile_clinicalActivationAllowed_idx" ON "MedicationClinicalProfile"("clinicalActivationAllowed");

-- One APPROVED profile per concept+source (product null) or product+source
CREATE UNIQUE INDEX IF NOT EXISTS "MedicationClinicalProfile_approved_concept_source_key"
  ON "MedicationClinicalProfile"("conceptId", "sourceId")
  WHERE "lifecycleStatus" = 'APPROVED' AND "conceptId" IS NOT NULL AND "productId" IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "MedicationClinicalProfile_approved_product_source_key"
  ON "MedicationClinicalProfile"("productId", "sourceId")
  WHERE "lifecycleStatus" = 'APPROVED' AND "productId" IS NOT NULL;

CREATE TABLE IF NOT EXISTS "MedicationDoseRecommendation" (
  "id" TEXT NOT NULL,
  "profileId" TEXT NOT NULL,
  "doseKind" VARCHAR(32) NOT NULL,
  "population" VARCHAR(32),
  "routeCode" VARCHAR(64),
  "doseAmount" DECIMAL(16,6),
  "doseUnit" VARCHAR(32),
  "doseMinAmount" DECIMAL(16,6),
  "doseMaxAmount" DECIMAL(16,6),
  "frequencyText" TEXT,
  "indicationText" TEXT,
  "structuredJson" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MedicationDoseRecommendation_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "MedicationDoseRecommendation_profileId_idx" ON "MedicationDoseRecommendation"("profileId");
CREATE INDEX IF NOT EXISTS "MedicationDoseRecommendation_doseKind_idx" ON "MedicationDoseRecommendation"("doseKind");

CREATE TABLE IF NOT EXISTS "MedicationWeightBasedDose" (
  "id" TEXT NOT NULL,
  "profileId" TEXT NOT NULL,
  "routeCode" VARCHAR(64),
  "amountPerKg" DECIMAL(16,6) NOT NULL,
  "amountUnit" VARCHAR(32) NOT NULL,
  "maxTotalAmount" DECIMAL(16,6),
  "maxTotalUnit" VARCHAR(32),
  "population" VARCHAR(32),
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MedicationWeightBasedDose_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "MedicationWeightBasedDose_profileId_idx" ON "MedicationWeightBasedDose"("profileId");

CREATE TABLE IF NOT EXISTS "MedicationRenalAdjustment" (
  "id" TEXT NOT NULL,
  "profileId" TEXT NOT NULL,
  "egfrMin" DECIMAL(16,6),
  "egfrMax" DECIMAL(16,6),
  "adjustmentSummary" TEXT NOT NULL,
  "structuredJson" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MedicationRenalAdjustment_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "MedicationRenalAdjustment_profileId_idx" ON "MedicationRenalAdjustment"("profileId");

CREATE TABLE IF NOT EXISTS "MedicationHepaticAdjustment" (
  "id" TEXT NOT NULL,
  "profileId" TEXT NOT NULL,
  "severityBand" VARCHAR(32),
  "adjustmentSummary" TEXT NOT NULL,
  "structuredJson" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MedicationHepaticAdjustment_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "MedicationHepaticAdjustment_profileId_idx" ON "MedicationHepaticAdjustment"("profileId");

CREATE TABLE IF NOT EXISTS "MedicationAdministrationInstruction" (
  "id" TEXT NOT NULL,
  "profileId" TEXT NOT NULL,
  "routeCode" VARCHAR(64) NOT NULL,
  "administrationMethod" VARCHAR(64),
  "dilutionRequired" BOOLEAN NOT NULL DEFAULT false,
  "compatibleDiluentsJson" JSONB,
  "incompatibleDiluentsJson" JSONB,
  "ivPushRateText" TEXT,
  "infusionRateText" TEXT,
  "centralLineRequired" BOOLEAN NOT NULL DEFAULT false,
  "peripheralGuidance" TEXT,
  "extravasationPrecautions" TEXT,
  "monitoringDuringAdmin" TEXT,
  "structuredJson" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MedicationAdministrationInstruction_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "MedicationAdministrationInstruction_profileId_idx" ON "MedicationAdministrationInstruction"("profileId");
CREATE INDEX IF NOT EXISTS "MedicationAdministrationInstruction_routeCode_idx" ON "MedicationAdministrationInstruction"("routeCode");

CREATE TABLE IF NOT EXISTS "MedicationInfusionGuidance" (
  "id" TEXT NOT NULL,
  "profileId" TEXT NOT NULL,
  "diluentText" TEXT,
  "concentrationText" TEXT,
  "rateMin" DECIMAL(16,6),
  "rateMax" DECIMAL(16,6),
  "rateUnit" VARCHAR(32),
  "durationMinutes" INTEGER,
  "notes" TEXT,
  "structuredJson" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MedicationInfusionGuidance_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "MedicationInfusionGuidance_profileId_idx" ON "MedicationInfusionGuidance"("profileId");

CREATE TABLE IF NOT EXISTS "MedicationMonitoringRequirement" (
  "id" TEXT NOT NULL,
  "profileId" TEXT NOT NULL,
  "monitoringKind" VARCHAR(32) NOT NULL,
  "parameterCode" VARCHAR(64),
  "parameterLabel" TEXT NOT NULL,
  "frequencyText" TEXT,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MedicationMonitoringRequirement_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "MedicationMonitoringRequirement_profileId_idx" ON "MedicationMonitoringRequirement"("profileId");
CREATE INDEX IF NOT EXISTS "MedicationMonitoringRequirement_monitoringKind_idx" ON "MedicationMonitoringRequirement"("monitoringKind");

CREATE TABLE IF NOT EXISTS "MedicationContraindication" (
  "id" TEXT NOT NULL,
  "profileId" TEXT NOT NULL,
  "code" VARCHAR(64),
  "summary" TEXT NOT NULL,
  "isAbsolute" BOOLEAN NOT NULL DEFAULT true,
  "structuredJson" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MedicationContraindication_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "MedicationContraindication_profileId_idx" ON "MedicationContraindication"("profileId");

CREATE TABLE IF NOT EXISTS "MedicationPrecaution" (
  "id" TEXT NOT NULL,
  "profileId" TEXT NOT NULL,
  "code" VARCHAR(64),
  "summary" TEXT NOT NULL,
  "population" VARCHAR(32),
  "structuredJson" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MedicationPrecaution_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "MedicationPrecaution_profileId_idx" ON "MedicationPrecaution"("profileId");

CREATE TABLE IF NOT EXISTS "MedicationBlackBoxWarning" (
  "id" TEXT NOT NULL,
  "profileId" TEXT NOT NULL,
  "warningCode" VARCHAR(64),
  "summary" TEXT NOT NULL,
  "structuredJson" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MedicationBlackBoxWarning_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "MedicationBlackBoxWarning_profileId_idx" ON "MedicationBlackBoxWarning"("profileId");

CREATE TABLE IF NOT EXISTS "MedicationPregnancyInformation" (
  "id" TEXT NOT NULL,
  "profileId" TEXT NOT NULL,
  "riskSummary" TEXT NOT NULL,
  "trimesterNotes" TEXT,
  "structuredJson" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MedicationPregnancyInformation_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "MedicationPregnancyInformation_profileId_idx" ON "MedicationPregnancyInformation"("profileId");

CREATE TABLE IF NOT EXISTS "MedicationLactationInformation" (
  "id" TEXT NOT NULL,
  "profileId" TEXT NOT NULL,
  "riskSummary" TEXT NOT NULL,
  "structuredJson" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MedicationLactationInformation_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "MedicationLactationInformation_profileId_idx" ON "MedicationLactationInformation"("profileId");

CREATE TABLE IF NOT EXISTS "MedicationHighAlertProfile" (
  "id" TEXT NOT NULL,
  "profileId" TEXT NOT NULL,
  "isHighAlert" BOOLEAN NOT NULL DEFAULT true,
  "categoriesJson" JSONB,
  "lasaGroupCode" VARCHAR(64),
  "controlledSchedule" VARCHAR(8),
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MedicationHighAlertProfile_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "MedicationHighAlertProfile_profileId_idx" ON "MedicationHighAlertProfile"("profileId");
CREATE INDEX IF NOT EXISTS "MedicationHighAlertProfile_isHighAlert_idx" ON "MedicationHighAlertProfile"("isHighAlert");

CREATE TABLE IF NOT EXISTS "MedicationEmergencyProfile" (
  "id" TEXT NOT NULL,
  "profileId" TEXT NOT NULL,
  "useProfile" VARCHAR(48) NOT NULL,
  "notes" TEXT,
  "structuredJson" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MedicationEmergencyProfile_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "MedicationEmergencyProfile_profileId_idx" ON "MedicationEmergencyProfile"("profileId");
CREATE INDEX IF NOT EXISTS "MedicationEmergencyProfile_useProfile_idx" ON "MedicationEmergencyProfile"("useProfile");

CREATE TABLE IF NOT EXISTS "MedicationStorageRequirement" (
  "id" TEXT NOT NULL,
  "profileId" TEXT NOT NULL,
  "temperatureText" TEXT,
  "lightSensitive" BOOLEAN NOT NULL DEFAULT false,
  "storageSummary" TEXT NOT NULL,
  "structuredJson" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MedicationStorageRequirement_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "MedicationStorageRequirement_profileId_idx" ON "MedicationStorageRequirement"("profileId");

CREATE TABLE IF NOT EXISTS "MedicationReconstitutionInstruction" (
  "id" TEXT NOT NULL,
  "profileId" TEXT NOT NULL,
  "diluentText" TEXT,
  "volumeText" TEXT,
  "stabilityText" TEXT,
  "summary" TEXT NOT NULL,
  "structuredJson" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MedicationReconstitutionInstruction_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "MedicationReconstitutionInstruction_profileId_idx" ON "MedicationReconstitutionInstruction"("profileId");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'MedicationClinicalKnowledgeVersion_sourceId_fkey') THEN
    ALTER TABLE "MedicationClinicalKnowledgeVersion"
      ADD CONSTRAINT "MedicationClinicalKnowledgeVersion_sourceId_fkey"
      FOREIGN KEY ("sourceId") REFERENCES "MedicationClinicalKnowledgeSource"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'MedicationClinicalProfile_conceptId_fkey') THEN
    ALTER TABLE "MedicationClinicalProfile"
      ADD CONSTRAINT "MedicationClinicalProfile_conceptId_fkey"
      FOREIGN KEY ("conceptId") REFERENCES "MedicationConcept"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'MedicationClinicalProfile_productId_fkey') THEN
    ALTER TABLE "MedicationClinicalProfile"
      ADD CONSTRAINT "MedicationClinicalProfile_productId_fkey"
      FOREIGN KEY ("productId") REFERENCES "MedicationProduct"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'MedicationClinicalProfile_sourceId_fkey') THEN
    ALTER TABLE "MedicationClinicalProfile"
      ADD CONSTRAINT "MedicationClinicalProfile_sourceId_fkey"
      FOREIGN KEY ("sourceId") REFERENCES "MedicationClinicalKnowledgeSource"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'MedicationClinicalProfile_knowledgeVersionId_fkey') THEN
    ALTER TABLE "MedicationClinicalProfile"
      ADD CONSTRAINT "MedicationClinicalProfile_knowledgeVersionId_fkey"
      FOREIGN KEY ("knowledgeVersionId") REFERENCES "MedicationClinicalKnowledgeVersion"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'MedicationClinicalProfile_supersedesProfileId_fkey') THEN
    ALTER TABLE "MedicationClinicalProfile"
      ADD CONSTRAINT "MedicationClinicalProfile_supersedesProfileId_fkey"
      FOREIGN KEY ("supersedesProfileId") REFERENCES "MedicationClinicalProfile"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- Child FKs (cascade from profile)
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'MedicationDoseRecommendation',
    'MedicationWeightBasedDose',
    'MedicationRenalAdjustment',
    'MedicationHepaticAdjustment',
    'MedicationAdministrationInstruction',
    'MedicationInfusionGuidance',
    'MedicationMonitoringRequirement',
    'MedicationContraindication',
    'MedicationPrecaution',
    'MedicationBlackBoxWarning',
    'MedicationPregnancyInformation',
    'MedicationLactationInformation',
    'MedicationHighAlertProfile',
    'MedicationEmergencyProfile',
    'MedicationStorageRequirement',
    'MedicationReconstitutionInstruction'
  ]
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = t || '_profileId_fkey'
    ) THEN
      EXECUTE format(
        'ALTER TABLE %I ADD CONSTRAINT %I FOREIGN KEY ("profileId") REFERENCES "MedicationClinicalProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE',
        t, t || '_profileId_fkey'
      );
    END IF;
  END LOOP;
END $$;
