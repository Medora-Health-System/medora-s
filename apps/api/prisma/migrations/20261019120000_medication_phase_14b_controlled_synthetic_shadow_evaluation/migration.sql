-- Phase 14B Part 3 — controlled synthetic shadow evaluation.
-- Does NOT activate CDS, alerts, or care workflows.

CREATE TABLE IF NOT EXISTS "MedicationShadowEvaluationBatch" (
  "id" TEXT NOT NULL,
  "batchKey" VARCHAR(64) NOT NULL,
  "version" VARCHAR(32) NOT NULL DEFAULT '1.0.0',
  "status" VARCHAR(48) NOT NULL DEFAULT 'DRAFT',
  "readiness" VARCHAR(48) NOT NULL DEFAULT 'NOT_READY',
  "waveKey" VARCHAR(64),
  "referenceSetId" TEXT,
  "approvalWaveId" TEXT,
  "engineVersion" VARCHAR(64),
  "ruleSetVersion" VARCHAR(64),
  "configurationJson" JSONB,
  "metricsJson" JSONB,
  "inputHash" VARCHAR(128),
  "resultHash" VARCHAR(128),
  "clinicalActivationAllowed" BOOLEAN NOT NULL DEFAULT false,
  "providerFacingAlertsAllowed" BOOLEAN NOT NULL DEFAULT false,
  "orderBlockingAllowed" BOOLEAN NOT NULL DEFAULT false,
  "knowledgeControlsPatientCare" BOOLEAN NOT NULL DEFAULT false,
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "certifiedAt" TIMESTAMP(3),
  "createdByUserId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MedicationShadowEvaluationBatch_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MedicationShadowEvaluationBatch_alerts_off_chk"
    CHECK ("providerFacingAlertsAllowed" = false),
  CONSTRAINT "MedicationShadowEvaluationBatch_blocks_off_chk"
    CHECK ("orderBlockingAllowed" = false),
  CONSTRAINT "MedicationShadowEvaluationBatch_activation_off_chk"
    CHECK ("clinicalActivationAllowed" = false),
  CONSTRAINT "MedicationShadowEvaluationBatch_no_care_control_chk"
    CHECK ("knowledgeControlsPatientCare" = false)
);
CREATE UNIQUE INDEX IF NOT EXISTS "MedicationShadowEvaluationBatch_batchKey_key"
  ON "MedicationShadowEvaluationBatch"("batchKey");
CREATE INDEX IF NOT EXISTS "MedicationShadowEvaluationBatch_status_idx"
  ON "MedicationShadowEvaluationBatch"("status");
CREATE INDEX IF NOT EXISTS "MedicationShadowEvaluationBatch_readiness_idx"
  ON "MedicationShadowEvaluationBatch"("readiness");
CREATE INDEX IF NOT EXISTS "MedicationShadowEvaluationBatch_waveKey_idx"
  ON "MedicationShadowEvaluationBatch"("waveKey");

CREATE TABLE IF NOT EXISTS "MedicationShadowEvaluationExecution" (
  "id" TEXT NOT NULL,
  "batchId" TEXT NOT NULL,
  "referenceCaseId" TEXT,
  "referenceCaseKey" VARCHAR(128) NOT NULL,
  "referenceCaseVersion" VARCHAR(32),
  "familyKey" VARCHAR(128) NOT NULL,
  "canonicalConceptId" TEXT,
  "shadowSnapshotId" TEXT,
  "attemptNumber" INTEGER NOT NULL DEFAULT 1,
  "status" VARCHAR(32) NOT NULL DEFAULT 'QUEUED',
  "executionMode" VARCHAR(32) NOT NULL DEFAULT 'SYNTHETIC_SHADOW',
  "caseCategory" VARCHAR(64) NOT NULL,
  "engineVersion" VARCHAR(64),
  "ruleSetVersion" VARCHAR(64),
  "engineRunId" TEXT,
  "inputSnapshotJson" JSONB NOT NULL,
  "outputSnapshotJson" JSONB,
  "inputHash" VARCHAR(128) NOT NULL,
  "outputHash" VARCHAR(128),
  "executionHash" VARCHAR(128),
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MedicationShadowEvaluationExecution_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MedicationShadowEvaluationExecution_batch_fkey"
    FOREIGN KEY ("batchId") REFERENCES "MedicationShadowEvaluationBatch"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "MedicationShadowEvaluationExecution_batch_case_attempt_key"
  ON "MedicationShadowEvaluationExecution"("batchId", "referenceCaseKey", "attemptNumber");
CREATE INDEX IF NOT EXISTS "MedicationShadowEvaluationExecution_batchId_idx"
  ON "MedicationShadowEvaluationExecution"("batchId");
CREATE INDEX IF NOT EXISTS "MedicationShadowEvaluationExecution_familyKey_idx"
  ON "MedicationShadowEvaluationExecution"("familyKey");
CREATE INDEX IF NOT EXISTS "MedicationShadowEvaluationExecution_status_idx"
  ON "MedicationShadowEvaluationExecution"("status");
CREATE INDEX IF NOT EXISTS "MedicationShadowEvaluationExecution_snapshot_idx"
  ON "MedicationShadowEvaluationExecution"("shadowSnapshotId");
CREATE INDEX IF NOT EXISTS "MedicationShadowEvaluationExecution_engineRun_idx"
  ON "MedicationShadowEvaluationExecution"("engineRunId");

CREATE TABLE IF NOT EXISTS "MedicationShadowFindingResult" (
  "id" TEXT NOT NULL,
  "executionId" TEXT NOT NULL,
  "expectedFindingId" TEXT,
  "actualFindingIdentifier" VARCHAR(255),
  "findingType" VARCHAR(64),
  "domain" VARCHAR(64),
  "severityExpected" VARCHAR(32),
  "severityActual" VARCHAR(32),
  "classification" VARCHAR(48) NOT NULL,
  "required" BOOLEAN NOT NULL DEFAULT true,
  "critical" BOOLEAN NOT NULL DEFAULT false,
  "matchDetailsJson" JSONB,
  "evidenceLinkIdsJson" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MedicationShadowFindingResult_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MedicationShadowFindingResult_execution_fkey"
    FOREIGN KEY ("executionId") REFERENCES "MedicationShadowEvaluationExecution"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "MedicationShadowFindingResult_executionId_idx"
  ON "MedicationShadowFindingResult"("executionId");
CREATE INDEX IF NOT EXISTS "MedicationShadowFindingResult_classification_idx"
  ON "MedicationShadowFindingResult"("classification");
CREATE INDEX IF NOT EXISTS "MedicationShadowFindingResult_critical_idx"
  ON "MedicationShadowFindingResult"("critical");

CREATE TABLE IF NOT EXISTS "MedicationShadowFamilyResult" (
  "id" TEXT NOT NULL,
  "batchId" TEXT NOT NULL,
  "familyKey" VARCHAR(128) NOT NULL,
  "canonicalConceptId" TEXT,
  "shadowSnapshotId" TEXT,
  "status" VARCHAR(64) NOT NULL,
  "metricsJson" JSONB,
  "casesExecuted" INTEGER NOT NULL DEFAULT 0,
  "matchedCount" INTEGER NOT NULL DEFAULT 0,
  "missedCount" INTEGER NOT NULL DEFAULT 0,
  "unexpectedCount" INTEGER NOT NULL DEFAULT 0,
  "deferredSkipCount" INTEGER NOT NULL DEFAULT 0,
  "criticalMisses" INTEGER NOT NULL DEFAULT 0,
  "highSeverityMisses" INTEGER NOT NULL DEFAULT 0,
  "openGaps" INTEGER NOT NULL DEFAULT 0,
  "resultHash" VARCHAR(128),
  "qualifiedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MedicationShadowFamilyResult_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MedicationShadowFamilyResult_batch_fkey"
    FOREIGN KEY ("batchId") REFERENCES "MedicationShadowEvaluationBatch"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "MedicationShadowFamilyResult_batchId_familyKey_key"
  ON "MedicationShadowFamilyResult"("batchId", "familyKey");
CREATE INDEX IF NOT EXISTS "MedicationShadowFamilyResult_batchId_idx"
  ON "MedicationShadowFamilyResult"("batchId");
CREATE INDEX IF NOT EXISTS "MedicationShadowFamilyResult_status_idx"
  ON "MedicationShadowFamilyResult"("status");
CREATE INDEX IF NOT EXISTS "MedicationShadowFamilyResult_snapshot_idx"
  ON "MedicationShadowFamilyResult"("shadowSnapshotId");

CREATE TABLE IF NOT EXISTS "MedicationShadowGapLink" (
  "id" TEXT NOT NULL,
  "batchId" TEXT,
  "executionId" TEXT,
  "familyKey" VARCHAR(128),
  "gapType" VARCHAR(32) NOT NULL,
  "gapId" VARCHAR(128),
  "gapKey" VARCHAR(255) NOT NULL,
  "description" TEXT NOT NULL,
  "severity" VARCHAR(16) NOT NULL DEFAULT 'INFO',
  "status" VARCHAR(32) NOT NULL DEFAULT 'OPEN',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MedicationShadowGapLink_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MedicationShadowGapLink_batch_fkey"
    FOREIGN KEY ("batchId") REFERENCES "MedicationShadowEvaluationBatch"("id")
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "MedicationShadowGapLink_execution_fkey"
    FOREIGN KEY ("executionId") REFERENCES "MedicationShadowEvaluationExecution"("id")
    ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "MedicationShadowGapLink_batchId_gapKey_key"
  ON "MedicationShadowGapLink"("batchId", "gapKey");
CREATE INDEX IF NOT EXISTS "MedicationShadowGapLink_batchId_idx"
  ON "MedicationShadowGapLink"("batchId");
CREATE INDEX IF NOT EXISTS "MedicationShadowGapLink_executionId_idx"
  ON "MedicationShadowGapLink"("executionId");
CREATE INDEX IF NOT EXISTS "MedicationShadowGapLink_gapType_idx"
  ON "MedicationShadowGapLink"("gapType");
CREATE INDEX IF NOT EXISTS "MedicationShadowGapLink_status_idx"
  ON "MedicationShadowGapLink"("status");
