-- Phase 7 — controlled Emergency Medicine batch (additive).

CREATE TABLE IF NOT EXISTS "MedicationBatchManifest" (
  "id" TEXT NOT NULL,
  "batchId" VARCHAR(64) NOT NULL,
  "batchName" TEXT NOT NULL,
  "batchVersion" VARCHAR(32) NOT NULL,
  "clinicalDomain" VARCHAR(64) NOT NULL DEFAULT 'EMERGENCY_MEDICINE',
  "scope" VARCHAR(64) NOT NULL,
  "sourceReleaseId" TEXT,
  "sourceManifestHash" VARCHAR(64),
  "batchManifestHash" VARCHAR(64) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdByUserId" TEXT,
  "approvedAt" TIMESTAMP(3),
  "approvedByUserId" TEXT,
  "approvalStatus" VARCHAR(32) NOT NULL DEFAULT 'DRAFT',
  "expectedMedicationFamilyCount" INTEGER NOT NULL DEFAULT 0,
  "expectedSourceRowCount" INTEGER NOT NULL DEFAULT 0,
  "dataClassification" VARCHAR(32) NOT NULL DEFAULT 'CONTROLLED_REAL_BATCH',
  "batchStatus" VARCHAR(48) NOT NULL DEFAULT 'DRAFT',
  "duplicateReviewRequired" BOOLEAN NOT NULL DEFAULT true,
  "humanVerificationRequired" BOOLEAN NOT NULL DEFAULT true,
  "clinicalActivationAllowed" BOOLEAN NOT NULL DEFAULT false,
  "rollbackAllowed" BOOLEAN NOT NULL DEFAULT true,
  "normalizationVersion" VARCHAR(64) NOT NULL DEFAULT 'MEDICATION_BATCH_NORMALIZATION_V1',
  "parserVersion" VARCHAR(64) NOT NULL DEFAULT 'RXNCONSO_PARSER_V1',
  "notes" TEXT,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MedicationBatchManifest_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "MedicationBatchManifest_batchId_batchVersion_key"
  ON "MedicationBatchManifest"("batchId", "batchVersion");
CREATE UNIQUE INDEX IF NOT EXISTS "MedicationBatchManifest_batchManifestHash_key"
  ON "MedicationBatchManifest"("batchManifestHash");
CREATE INDEX IF NOT EXISTS "MedicationBatchManifest_batchId_idx" ON "MedicationBatchManifest"("batchId");
CREATE INDEX IF NOT EXISTS "MedicationBatchManifest_approvalStatus_idx" ON "MedicationBatchManifest"("approvalStatus");
CREATE INDEX IF NOT EXISTS "MedicationBatchManifest_batchStatus_idx" ON "MedicationBatchManifest"("batchStatus");
CREATE INDEX IF NOT EXISTS "MedicationBatchManifest_sourceReleaseId_idx" ON "MedicationBatchManifest"("sourceReleaseId");

CREATE TABLE IF NOT EXISTS "MedicationBatchItem" (
  "id" TEXT NOT NULL,
  "manifestId" TEXT NOT NULL,
  "itemCode" VARCHAR(128) NOT NULL,
  "familyCode" VARCHAR(128) NOT NULL,
  "genericName" TEXT NOT NULL,
  "brandName" TEXT,
  "sourceRxcui" VARCHAR(64),
  "sourceTermType" VARCHAR(16),
  "sourceString" TEXT,
  "normalizedString" TEXT,
  "strengthDisplay" TEXT,
  "concentrationText" TEXT,
  "dosageForm" VARCHAR(64),
  "route" VARCHAR(64),
  "releaseType" VARCHAR(32),
  "category" VARCHAR(32) NOT NULL,
  "conceptIdentityKey" VARCHAR(255) NOT NULL,
  "productIdentityKey" VARCHAR(512) NOT NULL,
  "packageIdentityKey" VARCHAR(768) NOT NULL,
  "sourceRowChecksum" VARCHAR(64),
  "reuseDecision" VARCHAR(64),
  "lifecycleStatus" VARCHAR(48) NOT NULL DEFAULT 'BATCH_STAGED',
  "frenchDisplayStatus" VARCHAR(48) NOT NULL DEFAULT 'CURATED_FRENCH_MISSING',
  "governanceReview" VARCHAR(48) NOT NULL DEFAULT 'STANDARD_REVIEW',
  "highAlertReview" BOOLEAN NOT NULL DEFAULT false,
  "controlledSubstanceReview" BOOLEAN NOT NULL DEFAULT false,
  "matchedConceptId" TEXT,
  "matchedProductId" TEXT,
  "matchedPackageId" TEXT,
  "catalogPreparationId" TEXT,
  "sourcePayloadJson" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MedicationBatchItem_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "MedicationBatchItem_manifestId_itemCode_key"
  ON "MedicationBatchItem"("manifestId", "itemCode");
CREATE UNIQUE INDEX IF NOT EXISTS "MedicationBatchItem_manifestId_sourceRowChecksum_key"
  ON "MedicationBatchItem"("manifestId", "sourceRowChecksum");
CREATE INDEX IF NOT EXISTS "MedicationBatchItem_familyCode_idx" ON "MedicationBatchItem"("familyCode");
CREATE INDEX IF NOT EXISTS "MedicationBatchItem_conceptIdentityKey_idx" ON "MedicationBatchItem"("conceptIdentityKey");
CREATE INDEX IF NOT EXISTS "MedicationBatchItem_productIdentityKey_idx" ON "MedicationBatchItem"("productIdentityKey");
CREATE INDEX IF NOT EXISTS "MedicationBatchItem_packageIdentityKey_idx" ON "MedicationBatchItem"("packageIdentityKey");
CREATE INDEX IF NOT EXISTS "MedicationBatchItem_lifecycleStatus_idx" ON "MedicationBatchItem"("lifecycleStatus");
CREATE INDEX IF NOT EXISTS "MedicationBatchItem_category_idx" ON "MedicationBatchItem"("category");
CREATE INDEX IF NOT EXISTS "MedicationBatchItem_sourceRxcui_idx" ON "MedicationBatchItem"("sourceRxcui");

CREATE TABLE IF NOT EXISTS "MedicationBatchJob" (
  "id" TEXT NOT NULL,
  "manifestId" TEXT NOT NULL,
  "mode" VARCHAR(32) NOT NULL,
  "status" VARCHAR(32) NOT NULL DEFAULT 'PENDING',
  "manifestHash" VARCHAR(64) NOT NULL,
  "sourceHash" VARCHAR(64),
  "resumeAllowed" BOOLEAN NOT NULL DEFAULT false,
  "startedByUserId" TEXT,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  "summaryJson" JSONB,
  "errorMessage" TEXT,
  CONSTRAINT "MedicationBatchJob_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "MedicationBatchJob_manifestId_manifestHash_mode_key"
  ON "MedicationBatchJob"("manifestId", "manifestHash", "mode");
CREATE INDEX IF NOT EXISTS "MedicationBatchJob_status_idx" ON "MedicationBatchJob"("status");

CREATE TABLE IF NOT EXISTS "MedicationBatchCheckpoint" (
  "id" TEXT NOT NULL,
  "manifestId" TEXT NOT NULL,
  "fromStatus" VARCHAR(48) NOT NULL,
  "toStatus" VARCHAR(48) NOT NULL,
  "actorUserId" TEXT,
  "rationale" TEXT,
  "beforeJson" JSONB,
  "afterJson" JSONB,
  "manifestHash" VARCHAR(64) NOT NULL,
  "sourceHash" VARCHAR(64),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MedicationBatchCheckpoint_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "MedicationBatchCheckpoint_manifestId_idx" ON "MedicationBatchCheckpoint"("manifestId");
CREATE INDEX IF NOT EXISTS "MedicationBatchCheckpoint_createdAt_idx" ON "MedicationBatchCheckpoint"("createdAt");

CREATE TABLE IF NOT EXISTS "MedicationBatchEntityLink" (
  "id" TEXT NOT NULL,
  "manifestId" TEXT NOT NULL,
  "batchItemId" TEXT,
  "existingEntityType" VARCHAR(64) NOT NULL,
  "existingEntityId" TEXT NOT NULL,
  "reuseDecision" VARCHAR(64) NOT NULL,
  "identityEvidence" JSONB,
  "rxcuiEvidence" JSONB,
  "ndcEvidence" JSONB,
  "reviewedByUserId" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MedicationBatchEntityLink_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "MedicationBatchEntityLink_manifestId_idx" ON "MedicationBatchEntityLink"("manifestId");
CREATE INDEX IF NOT EXISTS "MedicationBatchEntityLink_batchItemId_idx" ON "MedicationBatchEntityLink"("batchItemId");
CREATE INDEX IF NOT EXISTS "MedicationBatchEntityLink_existingEntityType_existingEntityId_idx"
  ON "MedicationBatchEntityLink"("existingEntityType", "existingEntityId");

ALTER TABLE "MedicationDuplicateAssessment" ADD COLUMN IF NOT EXISTS "batchId" TEXT;
ALTER TABLE "MedicationDuplicateAssessment" ADD COLUMN IF NOT EXISTS "batchManifestId" TEXT;
ALTER TABLE "MedicationDuplicateAssessment" ADD COLUMN IF NOT EXISTS "batchItemId" TEXT;

CREATE INDEX IF NOT EXISTS "MedicationDuplicateAssessment_batchId_idx"
  ON "MedicationDuplicateAssessment"("batchId");
CREATE INDEX IF NOT EXISTS "MedicationDuplicateAssessment_batchManifestId_idx"
  ON "MedicationDuplicateAssessment"("batchManifestId");
CREATE INDEX IF NOT EXISTS "MedicationDuplicateAssessment_batchItemId_idx"
  ON "MedicationDuplicateAssessment"("batchItemId");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'MedicationBatchItem_manifestId_fkey') THEN
    ALTER TABLE "MedicationBatchItem"
      ADD CONSTRAINT "MedicationBatchItem_manifestId_fkey"
      FOREIGN KEY ("manifestId") REFERENCES "MedicationBatchManifest"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'MedicationBatchJob_manifestId_fkey') THEN
    ALTER TABLE "MedicationBatchJob"
      ADD CONSTRAINT "MedicationBatchJob_manifestId_fkey"
      FOREIGN KEY ("manifestId") REFERENCES "MedicationBatchManifest"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'MedicationBatchCheckpoint_manifestId_fkey') THEN
    ALTER TABLE "MedicationBatchCheckpoint"
      ADD CONSTRAINT "MedicationBatchCheckpoint_manifestId_fkey"
      FOREIGN KEY ("manifestId") REFERENCES "MedicationBatchManifest"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'MedicationBatchEntityLink_manifestId_fkey') THEN
    ALTER TABLE "MedicationBatchEntityLink"
      ADD CONSTRAINT "MedicationBatchEntityLink_manifestId_fkey"
      FOREIGN KEY ("manifestId") REFERENCES "MedicationBatchManifest"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'MedicationBatchEntityLink_batchItemId_fkey') THEN
    ALTER TABLE "MedicationBatchEntityLink"
      ADD CONSTRAINT "MedicationBatchEntityLink_batchItemId_fkey"
      FOREIGN KEY ("batchItemId") REFERENCES "MedicationBatchItem"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'MedicationDuplicateAssessment_batchManifestId_fkey') THEN
    ALTER TABLE "MedicationDuplicateAssessment"
      ADD CONSTRAINT "MedicationDuplicateAssessment_batchManifestId_fkey"
      FOREIGN KEY ("batchManifestId") REFERENCES "MedicationBatchManifest"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'MedicationDuplicateAssessment_batchItemId_fkey') THEN
    ALTER TABLE "MedicationDuplicateAssessment"
      ADD CONSTRAINT "MedicationDuplicateAssessment_batchItemId_fkey"
      FOREIGN KEY ("batchItemId") REFERENCES "MedicationBatchItem"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
