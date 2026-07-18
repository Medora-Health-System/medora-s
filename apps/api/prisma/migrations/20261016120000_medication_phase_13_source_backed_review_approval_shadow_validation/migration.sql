-- Phase 13 — source-backed review, approval-for-shadow, controlled shadow validation.
-- Does NOT auto-approve Phase 12 drafts, activate alerts, or mutate orders/MAR/billing.

CREATE TABLE IF NOT EXISTS "MedicationKnowledgeIdentityResolutionCase" (
  "id" TEXT NOT NULL,
  "batchItemId" TEXT,
  "requestedFamilyName" VARCHAR(255) NOT NULL,
  "normalizedFamilyName" VARCHAR(255) NOT NULL,
  "candidateConceptIdsJson" JSONB,
  "candidateProductIdsJson" JSONB,
  "candidateSynonymsJson" JSONB,
  "candidateRxCuisJson" JSONB,
  "investigationNotesJson" JSONB,
  "resolutionStatus" VARCHAR(64) NOT NULL DEFAULT 'OPEN',
  "selectedConceptId" TEXT,
  "resolutionMethod" VARCHAR(64),
  "resolutionConfidence" VARCHAR(16),
  "reviewedByUserId" TEXT,
  "approvedByUserId" TEXT,
  "reviewNotes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolvedAt" TIMESTAMP(3),
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MedicationKnowledgeIdentityResolutionCase_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "MedicationKnowledgeIdentityResolutionCase_batchItemId_idx"
  ON "MedicationKnowledgeIdentityResolutionCase"("batchItemId");
CREATE INDEX IF NOT EXISTS "MedicationKnowledgeIdentityResolutionCase_normalizedFamilyName_idx"
  ON "MedicationKnowledgeIdentityResolutionCase"("normalizedFamilyName");
CREATE INDEX IF NOT EXISTS "MedicationKnowledgeIdentityResolutionCase_resolutionStatus_idx"
  ON "MedicationKnowledgeIdentityResolutionCase"("resolutionStatus");

CREATE TABLE IF NOT EXISTS "MedicationKnowledgeApprovalWave" (
  "id" TEXT NOT NULL,
  "waveKey" VARCHAR(64) NOT NULL,
  "name" VARCHAR(255) NOT NULL,
  "description" TEXT,
  "batchId" TEXT,
  "status" VARCHAR(48) NOT NULL DEFAULT 'DRAFT',
  "targetFamilyCount" INTEGER NOT NULL DEFAULT 0,
  "selectedFamilyCount" INTEGER NOT NULL DEFAULT 0,
  "approvedFamilyCount" INTEGER NOT NULL DEFAULT 0,
  "shadowEligibleFamilyCount" INTEGER NOT NULL DEFAULT 0,
  "selectionPolicyVersion" VARCHAR(32),
  "clinicalActivationAllowed" BOOLEAN NOT NULL DEFAULT false,
  "providerFacingAlertsAllowed" BOOLEAN NOT NULL DEFAULT false,
  "orderBlockingAllowed" BOOLEAN NOT NULL DEFAULT false,
  "createdByUserId" TEXT NOT NULL,
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "lockedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MedicationKnowledgeApprovalWave_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MedicationKnowledgeApprovalWave_alerts_off_chk"
    CHECK ("providerFacingAlertsAllowed" = false),
  CONSTRAINT "MedicationKnowledgeApprovalWave_blocks_off_chk"
    CHECK ("orderBlockingAllowed" = false),
  CONSTRAINT "MedicationKnowledgeApprovalWave_activation_off_chk"
    CHECK ("clinicalActivationAllowed" = false)
);
CREATE UNIQUE INDEX IF NOT EXISTS "MedicationKnowledgeApprovalWave_waveKey_key"
  ON "MedicationKnowledgeApprovalWave"("waveKey");
CREATE INDEX IF NOT EXISTS "MedicationKnowledgeApprovalWave_status_idx"
  ON "MedicationKnowledgeApprovalWave"("status");

CREATE TABLE IF NOT EXISTS "MedicationKnowledgeApprovalWaveItem" (
  "id" TEXT NOT NULL,
  "waveId" TEXT NOT NULL,
  "batchItemId" TEXT,
  "familyKey" VARCHAR(128) NOT NULL,
  "requestedFamilyName" VARCHAR(255) NOT NULL,
  "canonicalConceptId" TEXT,
  "selectionReason" TEXT,
  "complexityLevel" VARCHAR(16) NOT NULL DEFAULT 'MODERATE',
  "identityStatus" VARCHAR(48) NOT NULL DEFAULT 'UNRESOLVED',
  "sourceStatus" VARCHAR(48) NOT NULL DEFAULT 'NOT_READY',
  "clinicalContentStatus" VARCHAR(48) NOT NULL DEFAULT 'DRAFT',
  "safetyContentStatus" VARCHAR(48) NOT NULL DEFAULT 'DRAFT',
  "reviewStatus" VARCHAR(48) NOT NULL DEFAULT 'NOT_STARTED',
  "approvalStatus" VARCHAR(48) NOT NULL DEFAULT 'NOT_APPROVED',
  "shadowEligibilityStatus" VARCHAR(48) NOT NULL DEFAULT 'NOT_ELIGIBLE',
  "blockingReasonCodesJson" JSONB,
  "isPlaceholderDetected" BOOLEAN NOT NULL DEFAULT false,
  "clinicalActivationAllowed" BOOLEAN NOT NULL DEFAULT false,
  "shadowUseAllowed" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MedicationKnowledgeApprovalWaveItem_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MedicationKnowledgeApprovalWaveItem_wave_fkey"
    FOREIGN KEY ("waveId") REFERENCES "MedicationKnowledgeApprovalWave"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "MedicationKnowledgeApprovalWaveItem_activation_off_chk"
    CHECK ("clinicalActivationAllowed" = false)
);
CREATE UNIQUE INDEX IF NOT EXISTS "MedicationKnowledgeApprovalWaveItem_wave_family_key"
  ON "MedicationKnowledgeApprovalWaveItem"("waveId", "familyKey");
CREATE INDEX IF NOT EXISTS "MedicationKnowledgeApprovalWaveItem_waveId_idx"
  ON "MedicationKnowledgeApprovalWaveItem"("waveId");
CREATE INDEX IF NOT EXISTS "MedicationKnowledgeApprovalWaveItem_approvalStatus_idx"
  ON "MedicationKnowledgeApprovalWaveItem"("approvalStatus");

CREATE TABLE IF NOT EXISTS "MedicationKnowledgeSourceReadinessSnapshot" (
  "id" TEXT NOT NULL,
  "waveId" TEXT,
  "familyKey" VARCHAR(128) NOT NULL,
  "canonicalConceptId" TEXT,
  "requiredDomainsJson" JSONB,
  "sourceVersionsAvailableJson" JSONB,
  "sourceVersionsApprovedJson" JSONB,
  "missingSourceDomainsJson" JSONB,
  "conflictingSourceDomainsJson" JSONB,
  "licensedUseConfirmed" BOOLEAN NOT NULL DEFAULT false,
  "sourceReady" BOOLEAN NOT NULL DEFAULT false,
  "isPlaceholderContent" BOOLEAN NOT NULL DEFAULT false,
  "blockingReasonsJson" JSONB,
  "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MedicationKnowledgeSourceReadinessSnapshot_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MedicationKnowledgeSourceReadinessSnapshot_wave_fkey"
    FOREIGN KEY ("waveId") REFERENCES "MedicationKnowledgeApprovalWave"("id")
    ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "MedicationKnowledgeSourceReadinessSnapshot_waveId_idx"
  ON "MedicationKnowledgeSourceReadinessSnapshot"("waveId");
CREATE INDEX IF NOT EXISTS "MedicationKnowledgeSourceReadinessSnapshot_familyKey_idx"
  ON "MedicationKnowledgeSourceReadinessSnapshot"("familyKey");
CREATE INDEX IF NOT EXISTS "MedicationKnowledgeSourceReadinessSnapshot_sourceReady_idx"
  ON "MedicationKnowledgeSourceReadinessSnapshot"("sourceReady");

CREATE TABLE IF NOT EXISTS "MedicationKnowledgeShadowValidationRun" (
  "id" TEXT NOT NULL,
  "waveId" TEXT,
  "referenceSetId" TEXT,
  "engineVersion" VARCHAR(64),
  "clinicalKnowledgeVersionIdsJson" JSONB,
  "safetyKnowledgeVersionIdsJson" JSONB,
  "status" VARCHAR(48) NOT NULL DEFAULT 'QUEUED',
  "caseCount" INTEGER NOT NULL DEFAULT 0,
  "completedCaseCount" INTEGER NOT NULL DEFAULT 0,
  "expectedFindingCount" INTEGER NOT NULL DEFAULT 0,
  "generatedFindingCount" INTEGER NOT NULL DEFAULT 0,
  "matchedFindingCount" INTEGER NOT NULL DEFAULT 0,
  "missedFindingCount" INTEGER NOT NULL DEFAULT 0,
  "unexpectedFindingCount" INTEGER NOT NULL DEFAULT 0,
  "duplicateFindingCount" INTEGER NOT NULL DEFAULT 0,
  "suppressedFindingCount" INTEGER NOT NULL DEFAULT 0,
  "criticalMissCount" INTEGER NOT NULL DEFAULT 0,
  "evaluationFailureCount" INTEGER NOT NULL DEFAULT 0,
  "medianLatencyMs" INTEGER,
  "p95LatencyMs" INTEGER,
  "p99LatencyMs" INTEGER,
  "metricsLabel" VARCHAR(64) NOT NULL DEFAULT 'synthetic-reference-derived',
  "clinicalActivationAllowed" BOOLEAN NOT NULL DEFAULT false,
  "providerFacingAlertsAllowed" BOOLEAN NOT NULL DEFAULT false,
  "orderBlockingAllowed" BOOLEAN NOT NULL DEFAULT false,
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MedicationKnowledgeShadowValidationRun_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MedicationKnowledgeShadowValidationRun_wave_fkey"
    FOREIGN KEY ("waveId") REFERENCES "MedicationKnowledgeApprovalWave"("id")
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "MedicationKnowledgeShadowValidationRun_alerts_off_chk"
    CHECK ("providerFacingAlertsAllowed" = false),
  CONSTRAINT "MedicationKnowledgeShadowValidationRun_blocks_off_chk"
    CHECK ("orderBlockingAllowed" = false),
  CONSTRAINT "MedicationKnowledgeShadowValidationRun_activation_off_chk"
    CHECK ("clinicalActivationAllowed" = false)
);
CREATE INDEX IF NOT EXISTS "MedicationKnowledgeShadowValidationRun_waveId_idx"
  ON "MedicationKnowledgeShadowValidationRun"("waveId");
CREATE INDEX IF NOT EXISTS "MedicationKnowledgeShadowValidationRun_status_idx"
  ON "MedicationKnowledgeShadowValidationRun"("status");

CREATE TABLE IF NOT EXISTS "MedicationKnowledgeShadowValidationCaseResult" (
  "id" TEXT NOT NULL,
  "runId" TEXT NOT NULL,
  "referenceCaseId" TEXT,
  "caseKey" VARCHAR(128) NOT NULL,
  "matchClassification" VARCHAR(64) NOT NULL,
  "expectedFindingCount" INTEGER NOT NULL DEFAULT 0,
  "generatedFindingCount" INTEGER NOT NULL DEFAULT 0,
  "matchedCount" INTEGER NOT NULL DEFAULT 0,
  "missedCount" INTEGER NOT NULL DEFAULT 0,
  "unexpectedCount" INTEGER NOT NULL DEFAULT 0,
  "latencyMs" INTEGER,
  "detailsJson" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MedicationKnowledgeShadowValidationCaseResult_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MedicationKnowledgeShadowValidationCaseResult_run_fkey"
    FOREIGN KEY ("runId") REFERENCES "MedicationKnowledgeShadowValidationRun"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "MedicationKnowledgeShadowValidationCaseResult_runId_idx"
  ON "MedicationKnowledgeShadowValidationCaseResult"("runId");

CREATE TABLE IF NOT EXISTS "MedicationKnowledgeUnexpectedFindingReview" (
  "id" TEXT NOT NULL,
  "runId" TEXT,
  "caseResultId" TEXT,
  "findingKey" VARCHAR(255) NOT NULL,
  "classification" VARCHAR(64) NOT NULL DEFAULT 'UNEXPECTED_FINDING_REVIEW_REQUIRED',
  "reviewedByUserId" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MedicationKnowledgeUnexpectedFindingReview_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "MedicationKnowledgeUnexpectedFindingReview_runId_idx"
  ON "MedicationKnowledgeUnexpectedFindingReview"("runId");
CREATE INDEX IF NOT EXISTS "MedicationKnowledgeUnexpectedFindingReview_classification_idx"
  ON "MedicationKnowledgeUnexpectedFindingReview"("classification");

CREATE TABLE IF NOT EXISTS "MedicationKnowledgeEngineGap" (
  "id" TEXT NOT NULL,
  "gapType" VARCHAR(64) NOT NULL,
  "description" TEXT NOT NULL,
  "status" VARCHAR(32) NOT NULL DEFAULT 'OPEN',
  "severity" VARCHAR(32) NOT NULL DEFAULT 'MODERATE',
  "runId" TEXT,
  "familyKey" VARCHAR(128),
  "detailsJson" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MedicationKnowledgeEngineGap_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "MedicationKnowledgeEngineGap_status_idx"
  ON "MedicationKnowledgeEngineGap"("status");
CREATE INDEX IF NOT EXISTS "MedicationKnowledgeEngineGap_gapType_idx"
  ON "MedicationKnowledgeEngineGap"("gapType");

CREATE TABLE IF NOT EXISTS "MedicationKnowledgeSourceBackedAuditEvent" (
  "id" TEXT NOT NULL,
  "waveId" TEXT,
  "entityType" VARCHAR(64) NOT NULL,
  "entityId" TEXT NOT NULL,
  "action" VARCHAR(64) NOT NULL,
  "beforeState" JSONB,
  "afterState" JSONB,
  "performedByUserId" TEXT NOT NULL,
  "performedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MedicationKnowledgeSourceBackedAuditEvent_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MedicationKnowledgeSourceBackedAuditEvent_wave_fkey"
    FOREIGN KEY ("waveId") REFERENCES "MedicationKnowledgeApprovalWave"("id")
    ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "MedicationKnowledgeSourceBackedAuditEvent_waveId_idx"
  ON "MedicationKnowledgeSourceBackedAuditEvent"("waveId");
CREATE INDEX IF NOT EXISTS "MedicationKnowledgeSourceBackedAuditEvent_action_idx"
  ON "MedicationKnowledgeSourceBackedAuditEvent"("action");
