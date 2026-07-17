-- Phase 6.5 — controlled EM pilot + duplicate prevention (additive).

-- Identity key columns
ALTER TABLE "MedicationConcept" ADD COLUMN IF NOT EXISTS "identityKey" VARCHAR(255);
ALTER TABLE "MedicationProduct" ADD COLUMN IF NOT EXISTS "identityKey" VARCHAR(512);
ALTER TABLE "MedicationPackage" ADD COLUMN IF NOT EXISTS "identityKey" VARCHAR(768);

CREATE INDEX IF NOT EXISTS "MedicationConcept_identityKey_idx" ON "MedicationConcept"("identityKey");
CREATE INDEX IF NOT EXISTS "MedicationProduct_identityKey_idx" ON "MedicationProduct"("identityKey");
CREATE INDEX IF NOT EXISTS "MedicationPackage_identityKey_idx" ON "MedicationPackage"("identityKey");

-- Active identity uniqueness (historical null/inactive rows allowed)
CREATE UNIQUE INDEX IF NOT EXISTS "MedicationConcept_active_identityKey_key"
  ON "MedicationConcept"("identityKey")
  WHERE "identityKey" IS NOT NULL AND "isActive" = true AND "retiredAt" IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "MedicationProduct_active_identityKey_key"
  ON "MedicationProduct"("identityKey")
  WHERE "identityKey" IS NOT NULL AND "isActive" = true;

CREATE UNIQUE INDEX IF NOT EXISTS "MedicationPackage_active_identityKey_key"
  ON "MedicationPackage"("identityKey")
  WHERE "identityKey" IS NOT NULL AND "isActive" = true;

-- Synonym uniqueness (language-aware) when concept/product present
CREATE UNIQUE INDEX IF NOT EXISTS "MedicationSearchAlias_concept_normalized_language_key"
  ON "MedicationSearchAlias"("conceptId", "normalizedAlias", "language")
  WHERE "conceptId" IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "MedicationSearchAlias_product_normalized_language_key"
  ON "MedicationSearchAlias"("productId", "normalizedAlias", "language")
  WHERE "productId" IS NOT NULL;

-- Pilot tables
CREATE TABLE IF NOT EXISTS "MedicationPilotManifest" (
  "id" TEXT NOT NULL,
  "pilotId" VARCHAR(64) NOT NULL,
  "pilotName" TEXT NOT NULL,
  "pilotVersion" VARCHAR(32) NOT NULL,
  "scope" VARCHAR(64) NOT NULL,
  "clinicalDomain" VARCHAR(64) NOT NULL DEFAULT 'EMERGENCY_MEDICINE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdByUserId" TEXT,
  "approvedByUserId" TEXT,
  "approvedAt" TIMESTAMP(3),
  "approvalStatus" VARCHAR(32) NOT NULL DEFAULT 'DRAFT',
  "medicationCountExpected" INTEGER NOT NULL DEFAULT 0,
  "sourceReleaseId" TEXT,
  "sourceManifestHash" VARCHAR(64) NOT NULL,
  "dataClassification" VARCHAR(32) NOT NULL DEFAULT 'CONTROLLED_REAL_PILOT',
  "pilotStatus" VARCHAR(32) NOT NULL DEFAULT 'DRAFT',
  "clinicalActivationAllowed" BOOLEAN NOT NULL DEFAULT false,
  "rollbackAllowed" BOOLEAN NOT NULL DEFAULT true,
  "notes" TEXT,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MedicationPilotManifest_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "MedicationPilotManifest_pilotId_key" ON "MedicationPilotManifest"("pilotId");
CREATE INDEX IF NOT EXISTS "MedicationPilotManifest_approvalStatus_idx" ON "MedicationPilotManifest"("approvalStatus");
CREATE INDEX IF NOT EXISTS "MedicationPilotManifest_pilotStatus_idx" ON "MedicationPilotManifest"("pilotStatus");
CREATE INDEX IF NOT EXISTS "MedicationPilotManifest_sourceManifestHash_idx" ON "MedicationPilotManifest"("sourceManifestHash");

CREATE TABLE IF NOT EXISTS "MedicationPilotItem" (
  "id" TEXT NOT NULL,
  "manifestId" TEXT NOT NULL,
  "itemCode" VARCHAR(128) NOT NULL,
  "genericName" TEXT NOT NULL,
  "brandName" TEXT,
  "strengthDisplay" TEXT NOT NULL,
  "concentrationText" TEXT,
  "dosageForm" VARCHAR(64) NOT NULL,
  "route" VARCHAR(64) NOT NULL,
  "releaseType" VARCHAR(32),
  "packageQuantity" TEXT,
  "packageUnit" TEXT,
  "containerType" TEXT,
  "singleOrMultiDose" TEXT,
  "category" VARCHAR(32) NOT NULL,
  "conceptIdentityKey" VARCHAR(255) NOT NULL,
  "productIdentityKey" VARCHAR(512) NOT NULL,
  "packageIdentityKey" VARCHAR(768) NOT NULL,
  "lifecycleStatus" VARCHAR(48) NOT NULL DEFAULT 'PILOT_STAGED',
  "reuseDecision" VARCHAR(48),
  "matchedConceptId" TEXT,
  "matchedProductId" TEXT,
  "matchedPackageId" TEXT,
  "sourcePayloadJson" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MedicationPilotItem_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "MedicationPilotItem_manifestId_itemCode_key"
  ON "MedicationPilotItem"("manifestId", "itemCode");
CREATE INDEX IF NOT EXISTS "MedicationPilotItem_conceptIdentityKey_idx" ON "MedicationPilotItem"("conceptIdentityKey");
CREATE INDEX IF NOT EXISTS "MedicationPilotItem_productIdentityKey_idx" ON "MedicationPilotItem"("productIdentityKey");
CREATE INDEX IF NOT EXISTS "MedicationPilotItem_packageIdentityKey_idx" ON "MedicationPilotItem"("packageIdentityKey");
CREATE INDEX IF NOT EXISTS "MedicationPilotItem_lifecycleStatus_idx" ON "MedicationPilotItem"("lifecycleStatus");
CREATE INDEX IF NOT EXISTS "MedicationPilotItem_category_idx" ON "MedicationPilotItem"("category");

CREATE TABLE IF NOT EXISTS "MedicationDuplicateAssessment" (
  "id" TEXT NOT NULL,
  "pilotId" TEXT,
  "manifestId" TEXT,
  "pilotItemId" TEXT,
  "sourceEntityType" VARCHAR(64) NOT NULL,
  "sourceEntityId" TEXT NOT NULL,
  "matchedEntityType" VARCHAR(64),
  "matchedEntityId" TEXT,
  "classification" VARCHAR(48) NOT NULL,
  "confidenceScore" DOUBLE PRECISION NOT NULL,
  "normalizedIdentityKey" VARCHAR(768) NOT NULL,
  "matchedIdentityKey" VARCHAR(768),
  "evidenceJson" JSONB NOT NULL,
  "recommendedAction" VARCHAR(48) NOT NULL,
  "resolutionStatus" VARCHAR(48) NOT NULL DEFAULT 'OPEN',
  "resolvedByUserId" TEXT,
  "resolvedAt" TIMESTAMP(3),
  "resolutionRationale" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MedicationDuplicateAssessment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "MedicationDuplicateAssessment_pilotId_idx" ON "MedicationDuplicateAssessment"("pilotId");
CREATE INDEX IF NOT EXISTS "MedicationDuplicateAssessment_manifestId_idx" ON "MedicationDuplicateAssessment"("manifestId");
CREATE INDEX IF NOT EXISTS "MedicationDuplicateAssessment_pilotItemId_idx" ON "MedicationDuplicateAssessment"("pilotItemId");
CREATE INDEX IF NOT EXISTS "MedicationDuplicateAssessment_classification_idx" ON "MedicationDuplicateAssessment"("classification");
CREATE INDEX IF NOT EXISTS "MedicationDuplicateAssessment_resolutionStatus_idx" ON "MedicationDuplicateAssessment"("resolutionStatus");
CREATE INDEX IF NOT EXISTS "MedicationDuplicateAssessment_normalizedIdentityKey_idx" ON "MedicationDuplicateAssessment"("normalizedIdentityKey");

CREATE TABLE IF NOT EXISTS "MedicationPilotImportJob" (
  "id" TEXT NOT NULL,
  "manifestId" TEXT NOT NULL,
  "mode" VARCHAR(32) NOT NULL,
  "status" VARCHAR(32) NOT NULL DEFAULT 'PENDING',
  "manifestHash" VARCHAR(64) NOT NULL,
  "resumeAllowed" BOOLEAN NOT NULL DEFAULT false,
  "startedByUserId" TEXT,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  "summaryJson" JSONB,
  "errorMessage" TEXT,
  CONSTRAINT "MedicationPilotImportJob_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "MedicationPilotImportJob_manifestId_manifestHash_mode_key"
  ON "MedicationPilotImportJob"("manifestId", "manifestHash", "mode");
CREATE INDEX IF NOT EXISTS "MedicationPilotImportJob_status_idx" ON "MedicationPilotImportJob"("status");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'MedicationPilotItem_manifestId_fkey'
  ) THEN
    ALTER TABLE "MedicationPilotItem"
      ADD CONSTRAINT "MedicationPilotItem_manifestId_fkey"
      FOREIGN KEY ("manifestId") REFERENCES "MedicationPilotManifest"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'MedicationDuplicateAssessment_manifestId_fkey'
  ) THEN
    ALTER TABLE "MedicationDuplicateAssessment"
      ADD CONSTRAINT "MedicationDuplicateAssessment_manifestId_fkey"
      FOREIGN KEY ("manifestId") REFERENCES "MedicationPilotManifest"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'MedicationDuplicateAssessment_pilotItemId_fkey'
  ) THEN
    ALTER TABLE "MedicationDuplicateAssessment"
      ADD CONSTRAINT "MedicationDuplicateAssessment_pilotItemId_fkey"
      FOREIGN KEY ("pilotItemId") REFERENCES "MedicationPilotItem"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'MedicationPilotImportJob_manifestId_fkey'
  ) THEN
    ALTER TABLE "MedicationPilotImportJob"
      ADD CONSTRAINT "MedicationPilotImportJob_manifestId_fkey"
      FOREIGN KEY ("manifestId") REFERENCES "MedicationPilotManifest"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
