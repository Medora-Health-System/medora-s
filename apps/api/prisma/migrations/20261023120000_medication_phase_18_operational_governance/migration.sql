-- Phase 18 operational safety / explainability / regulatory readiness — additive only.
-- Enterprise Active / Production CDS / order-from-recommendation remain blocked.

ALTER TABLE "MedicationRecommendationDefinition"
  ADD COLUMN IF NOT EXISTS "versionGovernanceState" VARCHAR(32) NOT NULL DEFAULT 'CURRENT',
  ADD COLUMN IF NOT EXISTS "contentHash" VARCHAR(128),
  ADD COLUMN IF NOT EXISTS "immutableAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "MedicationRecommendationDefinition_versionGovernanceState_idx"
  ON "MedicationRecommendationDefinition"("versionGovernanceState");
CREATE INDEX IF NOT EXISTS "MedicationRecommendationDefinition_contentHash_idx"
  ON "MedicationRecommendationDefinition"("contentHash");

CREATE TABLE IF NOT EXISTS "MedicationRecommendationOpsSnapshot" (
  "id" TEXT NOT NULL,
  "snapshotKey" VARCHAR(128) NOT NULL,
  "recommendationsGenerated" INTEGER NOT NULL DEFAULT 0,
  "recommendationsViewed" INTEGER NOT NULL DEFAULT 0,
  "recommendationsAcknowledged" INTEGER NOT NULL DEFAULT 0,
  "recommendationsDismissed" INTEGER NOT NULL DEFAULT 0,
  "providerDisagreements" INTEGER NOT NULL DEFAULT 0,
  "agreementRate" INTEGER NOT NULL DEFAULT 0,
  "coveragePercent" INTEGER NOT NULL DEFAULT 0,
  "knowledgeFreshnessPercent" INTEGER NOT NULL DEFAULT 0,
  "reviewBacklog" INTEGER NOT NULL DEFAULT 0,
  "reviewAgingDaysAvg" INTEGER NOT NULL DEFAULT 0,
  "staleEvidenceCount" INTEGER NOT NULL DEFAULT 0,
  "pilotUtilization" INTEGER NOT NULL DEFAULT 0,
  "avgConfidence" INTEGER NOT NULL DEFAULT 0,
  "recommendationLatencyMs" INTEGER NOT NULL DEFAULT 0,
  "apiLatencyMs" INTEGER NOT NULL DEFAULT 0,
  "shadowLatencyMs" INTEGER NOT NULL DEFAULT 0,
  "governanceLatencyMs" INTEGER NOT NULL DEFAULT 0,
  "orderMutationCount" INTEGER NOT NULL DEFAULT 0,
  "marMutationCount" INTEGER NOT NULL DEFAULT 0,
  "chartMutationCount" INTEGER NOT NULL DEFAULT 0,
  "enterpriseActivationCount" INTEGER NOT NULL DEFAULT 0,
  "metricsJson" JSONB,
  "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MedicationRecommendationOpsSnapshot_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MedicationRecommendationOpsSnapshot_mutations_zero_chk"
    CHECK ("orderMutationCount" = 0 AND "marMutationCount" = 0 AND "chartMutationCount" = 0),
  CONSTRAINT "MedicationRecommendationOpsSnapshot_enterprise_zero_chk"
    CHECK ("enterpriseActivationCount" = 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS "MedicationRecommendationOpsSnapshot_snapshotKey_key"
  ON "MedicationRecommendationOpsSnapshot"("snapshotKey");
CREATE INDEX IF NOT EXISTS "MedicationRecommendationOpsSnapshot_generatedAt_idx"
  ON "MedicationRecommendationOpsSnapshot"("generatedAt");

CREATE TABLE IF NOT EXISTS "MedicationRecommendationReplayRun" (
  "id" TEXT NOT NULL,
  "recommendationDefinitionId" TEXT NOT NULL,
  "encounterId" TEXT,
  "facilityId" TEXT,
  "recommendationVersion" VARCHAR(32) NOT NULL,
  "knowledgeVersion" VARCHAR(64),
  "expectedFingerprint" VARCHAR(512) NOT NULL,
  "actualFingerprint" VARCHAR(512) NOT NULL,
  "matched" BOOLEAN NOT NULL DEFAULT false,
  "mutatesPatientCare" BOOLEAN NOT NULL DEFAULT false,
  "replayPayloadJson" JSONB,
  "performedByUserId" TEXT,
  "performedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MedicationRecommendationReplayRun_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MedicationRecommendationReplayRun_no_care_mutation_chk"
    CHECK ("mutatesPatientCare" = false),
  CONSTRAINT "MedicationRecommendationReplayRun_recommendationDefinitionId_fkey"
    FOREIGN KEY ("recommendationDefinitionId") REFERENCES "MedicationRecommendationDefinition"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "MedicationRecommendationReplayRun_recommendationDefinitionId_idx"
  ON "MedicationRecommendationReplayRun"("recommendationDefinitionId");
CREATE INDEX IF NOT EXISTS "MedicationRecommendationReplayRun_encounterId_idx"
  ON "MedicationRecommendationReplayRun"("encounterId");
CREATE INDEX IF NOT EXISTS "MedicationRecommendationReplayRun_facilityId_idx"
  ON "MedicationRecommendationReplayRun"("facilityId");
CREATE INDEX IF NOT EXISTS "MedicationRecommendationReplayRun_matched_idx"
  ON "MedicationRecommendationReplayRun"("matched");
CREATE INDEX IF NOT EXISTS "MedicationRecommendationReplayRun_performedAt_idx"
  ON "MedicationRecommendationReplayRun"("performedAt");

CREATE TABLE IF NOT EXISTS "MedicationRecommendationReplayFailure" (
  "id" TEXT NOT NULL,
  "replayRunId" TEXT NOT NULL,
  "failureCode" VARCHAR(64) NOT NULL,
  "description" TEXT NOT NULL,
  "expectedJson" JSONB,
  "actualJson" JSONB,
  "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MedicationRecommendationReplayFailure_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MedicationRecommendationReplayFailure_replayRunId_fkey"
    FOREIGN KEY ("replayRunId") REFERENCES "MedicationRecommendationReplayRun"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "MedicationRecommendationReplayFailure_replayRunId_idx"
  ON "MedicationRecommendationReplayFailure"("replayRunId");
CREATE INDEX IF NOT EXISTS "MedicationRecommendationReplayFailure_failureCode_idx"
  ON "MedicationRecommendationReplayFailure"("failureCode");
CREATE INDEX IF NOT EXISTS "MedicationRecommendationReplayFailure_detectedAt_idx"
  ON "MedicationRecommendationReplayFailure"("detectedAt");

CREATE TABLE IF NOT EXISTS "MedicationRecommendationRollbackEvent" (
  "id" TEXT NOT NULL,
  "recommendationDefinitionId" TEXT NOT NULL,
  "fromDefinitionId" TEXT NOT NULL,
  "toDefinitionId" TEXT NOT NULL,
  "fromVersion" VARCHAR(32) NOT NULL,
  "toVersion" VARCHAR(32) NOT NULL,
  "reason" TEXT NOT NULL,
  "preservesAudit" BOOLEAN NOT NULL DEFAULT true,
  "preservesHistory" BOOLEAN NOT NULL DEFAULT true,
  "deletesRecords" BOOLEAN NOT NULL DEFAULT false,
  "performedByUserId" TEXT NOT NULL,
  "performedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MedicationRecommendationRollbackEvent_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MedicationRecommendationRollbackEvent_no_delete_chk"
    CHECK ("deletesRecords" = false),
  CONSTRAINT "MedicationRecommendationRollbackEvent_preserves_audit_chk"
    CHECK ("preservesAudit" = true AND "preservesHistory" = true),
  CONSTRAINT "MedicationRecommendationRollbackEvent_recommendationDefinitionId_fkey"
    FOREIGN KEY ("recommendationDefinitionId") REFERENCES "MedicationRecommendationDefinition"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "MedicationRecommendationRollbackEvent_recommendationDefinitionId_idx"
  ON "MedicationRecommendationRollbackEvent"("recommendationDefinitionId");
CREATE INDEX IF NOT EXISTS "MedicationRecommendationRollbackEvent_fromDefinitionId_idx"
  ON "MedicationRecommendationRollbackEvent"("fromDefinitionId");
CREATE INDEX IF NOT EXISTS "MedicationRecommendationRollbackEvent_toDefinitionId_idx"
  ON "MedicationRecommendationRollbackEvent"("toDefinitionId");
CREATE INDEX IF NOT EXISTS "MedicationRecommendationRollbackEvent_performedAt_idx"
  ON "MedicationRecommendationRollbackEvent"("performedAt");

CREATE TABLE IF NOT EXISTS "MedicationRecommendationDriftAlert" (
  "id" TEXT NOT NULL,
  "recommendationDefinitionId" TEXT,
  "facilityId" TEXT,
  "driftType" VARCHAR(64) NOT NULL,
  "severity" VARCHAR(16) NOT NULL DEFAULT 'WARNING',
  "description" TEXT NOT NULL,
  "interruptProviders" BOOLEAN NOT NULL DEFAULT false,
  "governanceAdminOnly" BOOLEAN NOT NULL DEFAULT true,
  "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "acknowledgedAt" TIMESTAMP(3),
  "resolvedAt" TIMESTAMP(3),
  "metadataJson" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MedicationRecommendationDriftAlert_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MedicationRecommendationDriftAlert_no_interrupt_chk"
    CHECK ("interruptProviders" = false),
  CONSTRAINT "MedicationRecommendationDriftAlert_admin_only_chk"
    CHECK ("governanceAdminOnly" = true),
  CONSTRAINT "MedicationRecommendationDriftAlert_recommendationDefinitionId_fkey"
    FOREIGN KEY ("recommendationDefinitionId") REFERENCES "MedicationRecommendationDefinition"("id")
    ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "MedicationRecommendationDriftAlert_recommendationDefinitionId_idx"
  ON "MedicationRecommendationDriftAlert"("recommendationDefinitionId");
CREATE INDEX IF NOT EXISTS "MedicationRecommendationDriftAlert_facilityId_idx"
  ON "MedicationRecommendationDriftAlert"("facilityId");
CREATE INDEX IF NOT EXISTS "MedicationRecommendationDriftAlert_driftType_idx"
  ON "MedicationRecommendationDriftAlert"("driftType");
CREATE INDEX IF NOT EXISTS "MedicationRecommendationDriftAlert_severity_idx"
  ON "MedicationRecommendationDriftAlert"("severity");
CREATE INDEX IF NOT EXISTS "MedicationRecommendationDriftAlert_detectedAt_idx"
  ON "MedicationRecommendationDriftAlert"("detectedAt");

CREATE TABLE IF NOT EXISTS "MedicationRecommendationQualitySnapshot" (
  "id" TEXT NOT NULL,
  "snapshotKey" VARCHAR(128) NOT NULL,
  "coverageScore" INTEGER NOT NULL DEFAULT 0,
  "evidenceCompleteness" INTEGER NOT NULL DEFAULT 0,
  "reviewCompleteness" INTEGER NOT NULL DEFAULT 0,
  "confidenceCalibration" INTEGER NOT NULL DEFAULT 0,
  "governanceCompleteness" INTEGER NOT NULL DEFAULT 0,
  "auditCompleteness" INTEGER NOT NULL DEFAULT 0,
  "traceabilityScore" INTEGER NOT NULL DEFAULT 0,
  "explainabilityScore" INTEGER NOT NULL DEFAULT 0,
  "reproducibilityScore" INTEGER NOT NULL DEFAULT 0,
  "qualityScore" INTEGER NOT NULL DEFAULT 0,
  "metricsJson" JSONB,
  "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MedicationRecommendationQualitySnapshot_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "MedicationRecommendationQualitySnapshot_snapshotKey_key"
  ON "MedicationRecommendationQualitySnapshot"("snapshotKey");
CREATE INDEX IF NOT EXISTS "MedicationRecommendationQualitySnapshot_generatedAt_idx"
  ON "MedicationRecommendationQualitySnapshot"("generatedAt");
CREATE INDEX IF NOT EXISTS "MedicationRecommendationQualitySnapshot_qualityScore_idx"
  ON "MedicationRecommendationQualitySnapshot"("qualityScore");

CREATE TABLE IF NOT EXISTS "MedicationRecommendationRegulatoryArtifact" (
  "id" TEXT NOT NULL,
  "artifactKey" VARCHAR(128) NOT NULL,
  "framework" VARCHAR(64) NOT NULL,
  "title" VARCHAR(255) NOT NULL,
  "summary" TEXT NOT NULL,
  "claimsApproval" BOOLEAN NOT NULL DEFAULT false,
  "evidenceJson" JSONB,
  "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MedicationRecommendationRegulatoryArtifact_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MedicationRecommendationRegulatoryArtifact_no_claim_chk"
    CHECK ("claimsApproval" = false)
);

CREATE UNIQUE INDEX IF NOT EXISTS "MedicationRecommendationRegulatoryArtifact_artifactKey_key"
  ON "MedicationRecommendationRegulatoryArtifact"("artifactKey");
CREATE INDEX IF NOT EXISTS "MedicationRecommendationRegulatoryArtifact_framework_idx"
  ON "MedicationRecommendationRegulatoryArtifact"("framework");
CREATE INDEX IF NOT EXISTS "MedicationRecommendationRegulatoryArtifact_generatedAt_idx"
  ON "MedicationRecommendationRegulatoryArtifact"("generatedAt");

CREATE TABLE IF NOT EXISTS "MedicationRecommendationOpsAuditEvent" (
  "id" TEXT NOT NULL,
  "facilityId" TEXT,
  "recommendationDefinitionId" TEXT,
  "entityType" VARCHAR(64) NOT NULL,
  "entityId" TEXT NOT NULL,
  "action" VARCHAR(64) NOT NULL,
  "beforeState" JSONB,
  "afterState" JSONB,
  "reason" TEXT,
  "performedByUserId" TEXT NOT NULL,
  "performedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MedicationRecommendationOpsAuditEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "MedicationRecommendationOpsAuditEvent_facilityId_idx"
  ON "MedicationRecommendationOpsAuditEvent"("facilityId");
CREATE INDEX IF NOT EXISTS "MedicationRecommendationOpsAuditEvent_recommendationDefinitionId_idx"
  ON "MedicationRecommendationOpsAuditEvent"("recommendationDefinitionId");
CREATE INDEX IF NOT EXISTS "MedicationRecommendationOpsAuditEvent_entityType_entityId_idx"
  ON "MedicationRecommendationOpsAuditEvent"("entityType", "entityId");
CREATE INDEX IF NOT EXISTS "MedicationRecommendationOpsAuditEvent_action_idx"
  ON "MedicationRecommendationOpsAuditEvent"("action");
CREATE INDEX IF NOT EXISTS "MedicationRecommendationOpsAuditEvent_performedAt_idx"
  ON "MedicationRecommendationOpsAuditEvent"("performedAt");
