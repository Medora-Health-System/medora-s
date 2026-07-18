-- Phase 12 — controlled Emergency Medicine knowledge population.
-- Does NOT approve knowledge, activate alerts, or mutate clinical orders/MAR/billing.

CREATE TABLE IF NOT EXISTS "MedicationKnowledgePopulationBatch" (
  "id" TEXT NOT NULL,
  "batchKey" VARCHAR(64) NOT NULL,
  "name" VARCHAR(255) NOT NULL,
  "description" TEXT,
  "scope" VARCHAR(64) NOT NULL,
  "status" VARCHAR(48) NOT NULL DEFAULT 'DRAFT',
  "targetFamilyCount" INTEGER NOT NULL DEFAULT 0,
  "resolvedFamilyCount" INTEGER NOT NULL DEFAULT 0,
  "unresolvedFamilyCount" INTEGER NOT NULL DEFAULT 0,
  "draftClinicalRecordCount" INTEGER NOT NULL DEFAULT 0,
  "draftSafetyRecordCount" INTEGER NOT NULL DEFAULT 0,
  "approvedClinicalRecordCount" INTEGER NOT NULL DEFAULT 0,
  "approvedSafetyRecordCount" INTEGER NOT NULL DEFAULT 0,
  "conflictCount" INTEGER NOT NULL DEFAULT 0,
  "duplicateCount" INTEGER NOT NULL DEFAULT 0,
  "rejectedCount" INTEGER NOT NULL DEFAULT 0,
  "sourceVersionIdsJson" JSONB,
  "manifestVersion" VARCHAR(32),
  "clinicalActivationAllowed" BOOLEAN NOT NULL DEFAULT false,
  "providerFacingAlertsAllowed" BOOLEAN NOT NULL DEFAULT false,
  "orderBlockingAllowed" BOOLEAN NOT NULL DEFAULT false,
  "createdByUserId" TEXT NOT NULL,
  "reviewStartedAt" TIMESTAMP(3),
  "approvedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "lockedAt" TIMESTAMP(3),
  "fixtureMarker" VARCHAR(64),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MedicationKnowledgePopulationBatch_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MedicationKnowledgePopulationBatch_alerts_off_chk"
    CHECK ("providerFacingAlertsAllowed" = false),
  CONSTRAINT "MedicationKnowledgePopulationBatch_blocks_off_chk"
    CHECK ("orderBlockingAllowed" = false),
  CONSTRAINT "MedicationKnowledgePopulationBatch_activation_off_chk"
    CHECK ("clinicalActivationAllowed" = false)
);
CREATE UNIQUE INDEX IF NOT EXISTS "MedicationKnowledgePopulationBatch_batchKey_key"
  ON "MedicationKnowledgePopulationBatch"("batchKey");
CREATE INDEX IF NOT EXISTS "MedicationKnowledgePopulationBatch_status_idx"
  ON "MedicationKnowledgePopulationBatch"("status");
CREATE INDEX IF NOT EXISTS "MedicationKnowledgePopulationBatch_scope_idx"
  ON "MedicationKnowledgePopulationBatch"("scope");
CREATE INDEX IF NOT EXISTS "MedicationKnowledgePopulationBatch_createdByUserId_idx"
  ON "MedicationKnowledgePopulationBatch"("createdByUserId");

CREATE TABLE IF NOT EXISTS "MedicationKnowledgePopulationBatchItem" (
  "id" TEXT NOT NULL,
  "batchId" TEXT NOT NULL,
  "requestedFamilyName" VARCHAR(255) NOT NULL,
  "normalizedFamilyName" VARCHAR(255) NOT NULL,
  "familyKey" VARCHAR(128) NOT NULL,
  "canonicalConceptId" TEXT,
  "canonicalProductIdsJson" JSONB,
  "resolutionStatus" VARCHAR(48) NOT NULL DEFAULT 'UNRESOLVED',
  "resolutionConfidence" VARCHAR(16),
  "resolutionCandidatesJson" JSONB,
  "clinicalKnowledgeStatus" VARCHAR(48) NOT NULL DEFAULT 'NOT_STARTED',
  "safetyKnowledgeStatus" VARCHAR(48) NOT NULL DEFAULT 'NOT_STARTED',
  "domainApplicabilityJson" JSONB,
  "coverageBeforeJson" JSONB,
  "coverageAfterJson" JSONB,
  "blockingIssueCount" INTEGER NOT NULL DEFAULT 0,
  "warningCount" INTEGER NOT NULL DEFAULT 0,
  "populationWave" VARCHAR(32),
  "highAlertCandidate" BOOLEAN NOT NULL DEFAULT false,
  "assignedReviewerId" TEXT,
  "assignedPharmacistId" TEXT,
  "assignedMedicalReviewerId" TEXT,
  "draftClinicalProfileId" TEXT,
  "fixtureMarker" VARCHAR(64),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MedicationKnowledgePopulationBatchItem_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MedicationKnowledgePopulationBatchItem_batch_fkey"
    FOREIGN KEY ("batchId") REFERENCES "MedicationKnowledgePopulationBatch"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "MedicationKnowledgePopulationBatchItem_batch_family_key"
  ON "MedicationKnowledgePopulationBatchItem"("batchId", "familyKey");
CREATE INDEX IF NOT EXISTS "MedicationKnowledgePopulationBatchItem_batchId_idx"
  ON "MedicationKnowledgePopulationBatchItem"("batchId");
CREATE INDEX IF NOT EXISTS "MedicationKnowledgePopulationBatchItem_resolutionStatus_idx"
  ON "MedicationKnowledgePopulationBatchItem"("resolutionStatus");
CREATE INDEX IF NOT EXISTS "MedicationKnowledgePopulationBatchItem_canonicalConceptId_idx"
  ON "MedicationKnowledgePopulationBatchItem"("canonicalConceptId");
CREATE INDEX IF NOT EXISTS "MedicationKnowledgePopulationBatchItem_normalizedFamilyName_idx"
  ON "MedicationKnowledgePopulationBatchItem"("normalizedFamilyName");

CREATE TABLE IF NOT EXISTS "MedicationKnowledgeConflict" (
  "id" TEXT NOT NULL,
  "batchId" TEXT,
  "familyKey" VARCHAR(128),
  "domain" VARCHAR(64) NOT NULL,
  "recordType" VARCHAR(64) NOT NULL,
  "recordAId" TEXT,
  "recordBId" TEXT,
  "sourceVersionAId" TEXT,
  "sourceVersionBId" TEXT,
  "conflictType" VARCHAR(64) NOT NULL,
  "severity" VARCHAR(32) NOT NULL DEFAULT 'MODERATE',
  "description" TEXT NOT NULL,
  "status" VARCHAR(48) NOT NULL DEFAULT 'OPEN',
  "resolution" TEXT,
  "resolvedByUserId" TEXT,
  "resolvedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MedicationKnowledgeConflict_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MedicationKnowledgeConflict_batch_fkey"
    FOREIGN KEY ("batchId") REFERENCES "MedicationKnowledgePopulationBatch"("id")
    ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "MedicationKnowledgeConflict_batchId_idx"
  ON "MedicationKnowledgeConflict"("batchId");
CREATE INDEX IF NOT EXISTS "MedicationKnowledgeConflict_familyKey_idx"
  ON "MedicationKnowledgeConflict"("familyKey");
CREATE INDEX IF NOT EXISTS "MedicationKnowledgeConflict_status_idx"
  ON "MedicationKnowledgeConflict"("status");
CREATE INDEX IF NOT EXISTS "MedicationKnowledgeConflict_conflictType_idx"
  ON "MedicationKnowledgeConflict"("conflictType");

CREATE TABLE IF NOT EXISTS "MedicationKnowledgePopulationImportRun" (
  "id" TEXT NOT NULL,
  "batchId" TEXT NOT NULL,
  "runType" VARCHAR(32) NOT NULL,
  "status" VARCHAR(32) NOT NULL DEFAULT 'COMPLETED',
  "stageJson" JSONB,
  "reportJson" JSONB,
  "checksum" VARCHAR(128),
  "wroteKnowledgeRecords" BOOLEAN NOT NULL DEFAULT false,
  "createdApprovedRecords" BOOLEAN NOT NULL DEFAULT false,
  "performedByUserId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MedicationKnowledgePopulationImportRun_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MedicationKnowledgePopulationImportRun_batch_fkey"
    FOREIGN KEY ("batchId") REFERENCES "MedicationKnowledgePopulationBatch"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "MedicationKnowledgePopulationImportRun_no_approved_chk"
    CHECK ("createdApprovedRecords" = false)
);
CREATE INDEX IF NOT EXISTS "MedicationKnowledgePopulationImportRun_batchId_idx"
  ON "MedicationKnowledgePopulationImportRun"("batchId");
CREATE INDEX IF NOT EXISTS "MedicationKnowledgePopulationImportRun_runType_idx"
  ON "MedicationKnowledgePopulationImportRun"("runType");

CREATE TABLE IF NOT EXISTS "MedicationKnowledgeShadowEligibilitySnapshot" (
  "id" TEXT NOT NULL,
  "batchId" TEXT,
  "batchItemId" TEXT,
  "familyKey" VARCHAR(128) NOT NULL,
  "canonicalConceptId" TEXT,
  "identityResolved" BOOLEAN NOT NULL DEFAULT false,
  "clinicalProfileApproved" BOOLEAN NOT NULL DEFAULT false,
  "administrationReviewed" BOOLEAN NOT NULL DEFAULT false,
  "monitoringReviewed" BOOLEAN NOT NULL DEFAULT false,
  "therapeuticClassReviewed" BOOLEAN NOT NULL DEFAULT false,
  "allergyMappingReviewed" BOOLEAN NOT NULL DEFAULT false,
  "duplicateTherapyReviewed" BOOLEAN NOT NULL DEFAULT false,
  "majorSafetyKnowledgeReviewed" BOOLEAN NOT NULL DEFAULT false,
  "emergencyContextReviewed" BOOLEAN NOT NULL DEFAULT false,
  "criticalConflictCount" INTEGER NOT NULL DEFAULT 0,
  "identityBlockerCount" INTEGER NOT NULL DEFAULT 0,
  "shadowEvaluable" BOOLEAN NOT NULL DEFAULT false,
  "reasonCodesJson" JSONB,
  "gatesJson" JSONB,
  "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MedicationKnowledgeShadowEligibilitySnapshot_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MedicationKnowledgeShadowEligibilitySnapshot_batch_fkey"
    FOREIGN KEY ("batchId") REFERENCES "MedicationKnowledgePopulationBatch"("id")
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "MedicationKnowledgeShadowEligibilitySnapshot_item_fkey"
    FOREIGN KEY ("batchItemId") REFERENCES "MedicationKnowledgePopulationBatchItem"("id")
    ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "MedicationKnowledgeShadowEligibilitySnapshot_batchId_idx"
  ON "MedicationKnowledgeShadowEligibilitySnapshot"("batchId");
CREATE INDEX IF NOT EXISTS "MedicationKnowledgeShadowEligibilitySnapshot_familyKey_idx"
  ON "MedicationKnowledgeShadowEligibilitySnapshot"("familyKey");
CREATE INDEX IF NOT EXISTS "MedicationKnowledgeShadowEligibilitySnapshot_shadowEvaluable_idx"
  ON "MedicationKnowledgeShadowEligibilitySnapshot"("shadowEvaluable");

CREATE TABLE IF NOT EXISTS "MedicationKnowledgePopulationAuditEvent" (
  "id" TEXT NOT NULL,
  "batchId" TEXT,
  "entityType" VARCHAR(64) NOT NULL,
  "entityId" TEXT NOT NULL,
  "action" VARCHAR(64) NOT NULL,
  "beforeState" JSONB,
  "afterState" JSONB,
  "performedByUserId" TEXT NOT NULL,
  "performedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reason" TEXT,
  "correlationId" VARCHAR(128),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MedicationKnowledgePopulationAuditEvent_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MedicationKnowledgePopulationAuditEvent_batch_fkey"
    FOREIGN KEY ("batchId") REFERENCES "MedicationKnowledgePopulationBatch"("id")
    ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "MedicationKnowledgePopulationAuditEvent_batchId_idx"
  ON "MedicationKnowledgePopulationAuditEvent"("batchId");
CREATE INDEX IF NOT EXISTS "MedicationKnowledgePopulationAuditEvent_entity_idx"
  ON "MedicationKnowledgePopulationAuditEvent"("entityType", "entityId");
CREATE INDEX IF NOT EXISTS "MedicationKnowledgePopulationAuditEvent_action_idx"
  ON "MedicationKnowledgePopulationAuditEvent"("action");
