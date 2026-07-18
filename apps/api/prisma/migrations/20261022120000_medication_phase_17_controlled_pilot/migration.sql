-- Phase 17 controlled pilot — additive, non-destructive, Enterprise Active blocked.

CREATE TABLE IF NOT EXISTS "MedicationRecommendationPilotProgram" (
  "id" TEXT NOT NULL,
  "programKey" VARCHAR(128) NOT NULL,
  "title" VARCHAR(255) NOT NULL,
  "description" TEXT,
  "facilityId" TEXT NOT NULL,
  "status" VARCHAR(48) NOT NULL DEFAULT 'DRAFT',
  "waveKey" VARCHAR(64),
  "startAt" TIMESTAMP(3),
  "endAt" TIMESTAMP(3),
  "activatedAt" TIMESTAMP(3),
  "pausedAt" TIMESTAMP(3),
  "suspendedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "revokedAt" TIMESTAMP(3),
  "suspensionReason" TEXT,
  "revocationReason" TEXT,
  "controlledPilotAllowed" BOOLEAN NOT NULL DEFAULT false,
  "enterpriseActiveAllowed" BOOLEAN NOT NULL DEFAULT false,
  "productionCdsEnabled" BOOLEAN NOT NULL DEFAULT false,
  "providerAlertsEnabled" BOOLEAN NOT NULL DEFAULT false,
  "orderBlockingEnabled" BOOLEAN NOT NULL DEFAULT false,
  "orderFromRecommendationEnabled" BOOLEAN NOT NULL DEFAULT false,
  "autoOrderEnabled" BOOLEAN NOT NULL DEFAULT false,
  "autoSelectEnabled" BOOLEAN NOT NULL DEFAULT false,
  "version" VARCHAR(32) NOT NULL DEFAULT '1.0.0',
  "createdByUserId" TEXT NOT NULL,
  "approvedByUserId" TEXT,
  "approvedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MedicationRecommendationPilotProgram_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MedicationRecommendationPilotProgram_enterprise_off_chk"
    CHECK ("enterpriseActiveAllowed" = false),
  CONSTRAINT "MedicationRecommendationPilotProgram_production_cds_off_chk"
    CHECK ("productionCdsEnabled" = false),
  CONSTRAINT "MedicationRecommendationPilotProgram_alerts_off_chk"
    CHECK ("providerAlertsEnabled" = false),
  CONSTRAINT "MedicationRecommendationPilotProgram_blocks_off_chk"
    CHECK ("orderBlockingEnabled" = false),
  CONSTRAINT "MedicationRecommendationPilotProgram_no_order_from_rec_chk"
    CHECK ("orderFromRecommendationEnabled" = false),
  CONSTRAINT "MedicationRecommendationPilotProgram_auto_order_off_chk"
    CHECK ("autoOrderEnabled" = false),
  CONSTRAINT "MedicationRecommendationPilotProgram_auto_select_off_chk"
    CHECK ("autoSelectEnabled" = false)
);

CREATE UNIQUE INDEX IF NOT EXISTS "MedicationRecommendationPilotProgram_programKey_key"
  ON "MedicationRecommendationPilotProgram"("programKey");
CREATE INDEX IF NOT EXISTS "MedicationRecommendationPilotProgram_facilityId_idx"
  ON "MedicationRecommendationPilotProgram"("facilityId");
CREATE INDEX IF NOT EXISTS "MedicationRecommendationPilotProgram_status_idx"
  ON "MedicationRecommendationPilotProgram"("status");
CREATE INDEX IF NOT EXISTS "MedicationRecommendationPilotProgram_waveKey_idx"
  ON "MedicationRecommendationPilotProgram"("waveKey");
CREATE INDEX IF NOT EXISTS "MedicationRecommendationPilotProgram_startAt_endAt_idx"
  ON "MedicationRecommendationPilotProgram"("startAt", "endAt");

CREATE TABLE IF NOT EXISTS "MedicationRecommendationPilotDefinition" (
  "id" TEXT NOT NULL,
  "pilotProgramId" TEXT NOT NULL,
  "recommendationDefinitionId" TEXT NOT NULL,
  "pinnedRecommendationVersion" VARCHAR(32) NOT NULL,
  "pinnedKnowledgeVersion" VARCHAR(64),
  "qualificationDecision" VARCHAR(48) NOT NULL,
  "qualificationArtifactJson" JSONB,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "activatedAt" TIMESTAMP(3),
  "suspendedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MedicationRecommendationPilotDefinition_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MedicationRecommendationPilotDefinition_pilotProgramId_fkey"
    FOREIGN KEY ("pilotProgramId") REFERENCES "MedicationRecommendationPilotProgram"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "MedicationRecommendationPilotDefinition_recommendationDefinitionId_fkey"
    FOREIGN KEY ("recommendationDefinitionId") REFERENCES "MedicationRecommendationDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "MedicationRecommendationPilotDefinition_pilotProgramId_recommendationDefinitionId_key"
  ON "MedicationRecommendationPilotDefinition"("pilotProgramId", "recommendationDefinitionId");
CREATE INDEX IF NOT EXISTS "MedicationRecommendationPilotDefinition_pilotProgramId_idx"
  ON "MedicationRecommendationPilotDefinition"("pilotProgramId");
CREATE INDEX IF NOT EXISTS "MedicationRecommendationPilotDefinition_recommendationDefinitionId_idx"
  ON "MedicationRecommendationPilotDefinition"("recommendationDefinitionId");
CREATE INDEX IF NOT EXISTS "MedicationRecommendationPilotDefinition_qualificationDecision_idx"
  ON "MedicationRecommendationPilotDefinition"("qualificationDecision");

CREATE TABLE IF NOT EXISTS "MedicationRecommendationPilotProvider" (
  "id" TEXT NOT NULL,
  "pilotProgramId" TEXT NOT NULL,
  "providerUserId" TEXT NOT NULL,
  "facilityId" TEXT NOT NULL,
  "authorizationStatus" VARCHAR(32) NOT NULL DEFAULT 'PENDING',
  "trainingCompletedAt" TIMESTAMP(3),
  "acknowledgementAt" TIMESTAMP(3),
  "activatedAt" TIMESTAMP(3),
  "revokedAt" TIMESTAMP(3),
  "revocationReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MedicationRecommendationPilotProvider_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MedicationRecommendationPilotProvider_pilotProgramId_fkey"
    FOREIGN KEY ("pilotProgramId") REFERENCES "MedicationRecommendationPilotProgram"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "MedicationRecommendationPilotProvider_pilotProgramId_providerUserId_key"
  ON "MedicationRecommendationPilotProvider"("pilotProgramId", "providerUserId");
CREATE INDEX IF NOT EXISTS "MedicationRecommendationPilotProvider_pilotProgramId_idx"
  ON "MedicationRecommendationPilotProvider"("pilotProgramId");
CREATE INDEX IF NOT EXISTS "MedicationRecommendationPilotProvider_providerUserId_idx"
  ON "MedicationRecommendationPilotProvider"("providerUserId");
CREATE INDEX IF NOT EXISTS "MedicationRecommendationPilotProvider_facilityId_idx"
  ON "MedicationRecommendationPilotProvider"("facilityId");
CREATE INDEX IF NOT EXISTS "MedicationRecommendationPilotProvider_authorizationStatus_idx"
  ON "MedicationRecommendationPilotProvider"("authorizationStatus");

CREATE TABLE IF NOT EXISTS "MedicationRecommendationPilotQualification" (
  "id" TEXT NOT NULL,
  "recommendationDefinitionId" TEXT NOT NULL,
  "facilityId" TEXT,
  "shadowEvaluationCount" INTEGER NOT NULL DEFAULT 0,
  "coverageScore" INTEGER NOT NULL DEFAULT 0,
  "confidenceScore" INTEGER NOT NULL DEFAULT 0,
  "agreementRate" INTEGER,
  "disagreementRate" INTEGER,
  "falsePositiveReviewCount" INTEGER NOT NULL DEFAULT 0,
  "falseNegativeReviewCount" INTEGER NOT NULL DEFAULT 0,
  "unresolvedConflictCount" INTEGER NOT NULL DEFAULT 0,
  "constitutionalViolationCount" INTEGER NOT NULL DEFAULT 0,
  "orderMutationCount" INTEGER NOT NULL DEFAULT 0,
  "marMutationCount" INTEGER NOT NULL DEFAULT 0,
  "chartMutationCount" INTEGER NOT NULL DEFAULT 0,
  "qualificationDecision" VARCHAR(48) NOT NULL,
  "limitationsJson" JSONB,
  "evidenceSnapshotJson" JSONB,
  "blockersJson" JSONB,
  "evaluatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "evaluatedByUserId" TEXT NOT NULL,
  "version" VARCHAR(32) NOT NULL DEFAULT '1.0.0',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MedicationRecommendationPilotQualification_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MedicationRecommendationPilotQualification_recommendationDefinitionId_fkey"
    FOREIGN KEY ("recommendationDefinitionId") REFERENCES "MedicationRecommendationDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "MedicationRecommendationPilotQualification_recommendationDefinitionId_idx"
  ON "MedicationRecommendationPilotQualification"("recommendationDefinitionId");
CREATE INDEX IF NOT EXISTS "MedicationRecommendationPilotQualification_facilityId_idx"
  ON "MedicationRecommendationPilotQualification"("facilityId");
CREATE INDEX IF NOT EXISTS "MedicationRecommendationPilotQualification_qualificationDecision_idx"
  ON "MedicationRecommendationPilotQualification"("qualificationDecision");
CREATE INDEX IF NOT EXISTS "MedicationRecommendationPilotQualification_evaluatedAt_idx"
  ON "MedicationRecommendationPilotQualification"("evaluatedAt");

CREATE TABLE IF NOT EXISTS "MedicationRecommendationPilotExposure" (
  "id" TEXT NOT NULL,
  "pilotProgramId" TEXT NOT NULL,
  "recommendationDefinitionId" TEXT NOT NULL,
  "shadowEvaluationId" TEXT,
  "encounterId" TEXT,
  "patientId" TEXT,
  "facilityId" TEXT NOT NULL,
  "providerUserId" TEXT NOT NULL,
  "recommendationVersion" VARCHAR(32) NOT NULL,
  "knowledgeVersion" VARCHAR(64),
  "advisoryDisplayedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "displayContext" VARCHAR(64),
  "confidence" INTEGER NOT NULL DEFAULT 0,
  "evidenceLevel" VARCHAR(32),
  "reasoningPathJson" JSONB,
  "acknowledgedAt" TIMESTAMP(3),
  "dismissedAt" TIMESTAMP(3),
  "disagreedAt" TIMESTAMP(3),
  "providerResponse" VARCHAR(48),
  "providerReason" TEXT,
  "workflowImpactMs" INTEGER,
  "orderMutationDetected" BOOLEAN NOT NULL DEFAULT false,
  "marMutationDetected" BOOLEAN NOT NULL DEFAULT false,
  "chartMutationDetected" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MedicationRecommendationPilotExposure_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MedicationRecommendationPilotExposure_no_order_mutation_chk"
    CHECK ("orderMutationDetected" = false),
  CONSTRAINT "MedicationRecommendationPilotExposure_no_mar_mutation_chk"
    CHECK ("marMutationDetected" = false),
  CONSTRAINT "MedicationRecommendationPilotExposure_no_chart_mutation_chk"
    CHECK ("chartMutationDetected" = false),
  CONSTRAINT "MedicationRecommendationPilotExposure_pilotProgramId_fkey"
    FOREIGN KEY ("pilotProgramId") REFERENCES "MedicationRecommendationPilotProgram"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "MedicationRecommendationPilotExposure_recommendationDefinitionId_fkey"
    FOREIGN KEY ("recommendationDefinitionId") REFERENCES "MedicationRecommendationDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "MedicationRecommendationPilotExposure_pilotProgramId_idx"
  ON "MedicationRecommendationPilotExposure"("pilotProgramId");
CREATE INDEX IF NOT EXISTS "MedicationRecommendationPilotExposure_recommendationDefinitionId_idx"
  ON "MedicationRecommendationPilotExposure"("recommendationDefinitionId");
CREATE INDEX IF NOT EXISTS "MedicationRecommendationPilotExposure_facilityId_idx"
  ON "MedicationRecommendationPilotExposure"("facilityId");
CREATE INDEX IF NOT EXISTS "MedicationRecommendationPilotExposure_providerUserId_idx"
  ON "MedicationRecommendationPilotExposure"("providerUserId");
CREATE INDEX IF NOT EXISTS "MedicationRecommendationPilotExposure_encounterId_idx"
  ON "MedicationRecommendationPilotExposure"("encounterId");
CREATE INDEX IF NOT EXISTS "MedicationRecommendationPilotExposure_advisoryDisplayedAt_idx"
  ON "MedicationRecommendationPilotExposure"("advisoryDisplayedAt");

CREATE TABLE IF NOT EXISTS "MedicationRecommendationPilotSafetyEvent" (
  "id" TEXT NOT NULL,
  "pilotProgramId" TEXT NOT NULL,
  "exposureId" TEXT,
  "severity" VARCHAR(16) NOT NULL DEFAULT 'INFO',
  "eventType" VARCHAR(64) NOT NULL,
  "description" TEXT NOT NULL,
  "detectionSource" VARCHAR(64),
  "requiresSuspension" BOOLEAN NOT NULL DEFAULT false,
  "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reviewedAt" TIMESTAMP(3),
  "resolvedAt" TIMESTAMP(3),
  "resolution" TEXT,
  "auditMetadataJson" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MedicationRecommendationPilotSafetyEvent_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MedicationRecommendationPilotSafetyEvent_pilotProgramId_fkey"
    FOREIGN KEY ("pilotProgramId") REFERENCES "MedicationRecommendationPilotProgram"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "MedicationRecommendationPilotSafetyEvent_exposureId_fkey"
    FOREIGN KEY ("exposureId") REFERENCES "MedicationRecommendationPilotExposure"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "MedicationRecommendationPilotSafetyEvent_pilotProgramId_idx"
  ON "MedicationRecommendationPilotSafetyEvent"("pilotProgramId");
CREATE INDEX IF NOT EXISTS "MedicationRecommendationPilotSafetyEvent_exposureId_idx"
  ON "MedicationRecommendationPilotSafetyEvent"("exposureId");
CREATE INDEX IF NOT EXISTS "MedicationRecommendationPilotSafetyEvent_severity_idx"
  ON "MedicationRecommendationPilotSafetyEvent"("severity");
CREATE INDEX IF NOT EXISTS "MedicationRecommendationPilotSafetyEvent_eventType_idx"
  ON "MedicationRecommendationPilotSafetyEvent"("eventType");
CREATE INDEX IF NOT EXISTS "MedicationRecommendationPilotSafetyEvent_detectedAt_idx"
  ON "MedicationRecommendationPilotSafetyEvent"("detectedAt");

CREATE TABLE IF NOT EXISTS "MedicationRecommendationPilotMonitoringSnapshot" (
  "id" TEXT NOT NULL,
  "pilotProgramId" TEXT NOT NULL,
  "snapshotKey" VARCHAR(128) NOT NULL,
  "exposureCount" INTEGER NOT NULL DEFAULT 0,
  "acknowledgementRate" INTEGER NOT NULL DEFAULT 0,
  "dismissalRate" INTEGER NOT NULL DEFAULT 0,
  "disagreementRate" INTEGER NOT NULL DEFAULT 0,
  "overrideRate" INTEGER NOT NULL DEFAULT 0,
  "safetyEventCount" INTEGER NOT NULL DEFAULT 0,
  "constitutionalViolationCount" INTEGER NOT NULL DEFAULT 0,
  "orderMutationCount" INTEGER NOT NULL DEFAULT 0,
  "marMutationCount" INTEGER NOT NULL DEFAULT 0,
  "chartMutationCount" INTEGER NOT NULL DEFAULT 0,
  "activeProviderCount" INTEGER NOT NULL DEFAULT 0,
  "activeDefinitionCount" INTEGER NOT NULL DEFAULT 0,
  "metricsJson" JSONB,
  "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MedicationRecommendationPilotMonitoringSnapshot_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MedicationRecommendationPilotMonitoringSnapshot_pilotProgramId_fkey"
    FOREIGN KEY ("pilotProgramId") REFERENCES "MedicationRecommendationPilotProgram"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "MedicationRecommendationPilotMonitoringSnapshot_snapshotKey_key"
  ON "MedicationRecommendationPilotMonitoringSnapshot"("snapshotKey");
CREATE INDEX IF NOT EXISTS "MedicationRecommendationPilotMonitoringSnapshot_pilotProgramId_idx"
  ON "MedicationRecommendationPilotMonitoringSnapshot"("pilotProgramId");
CREATE INDEX IF NOT EXISTS "MedicationRecommendationPilotMonitoringSnapshot_generatedAt_idx"
  ON "MedicationRecommendationPilotMonitoringSnapshot"("generatedAt");

CREATE TABLE IF NOT EXISTS "MedicationRecommendationPilotAuditEvent" (
  "id" TEXT NOT NULL,
  "pilotProgramId" TEXT,
  "facilityId" TEXT,
  "providerUserId" TEXT,
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
  CONSTRAINT "MedicationRecommendationPilotAuditEvent_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MedicationRecommendationPilotAuditEvent_pilotProgramId_fkey"
    FOREIGN KEY ("pilotProgramId") REFERENCES "MedicationRecommendationPilotProgram"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "MedicationRecommendationPilotAuditEvent_pilotProgramId_idx"
  ON "MedicationRecommendationPilotAuditEvent"("pilotProgramId");
CREATE INDEX IF NOT EXISTS "MedicationRecommendationPilotAuditEvent_facilityId_idx"
  ON "MedicationRecommendationPilotAuditEvent"("facilityId");
CREATE INDEX IF NOT EXISTS "MedicationRecommendationPilotAuditEvent_entityType_entityId_idx"
  ON "MedicationRecommendationPilotAuditEvent"("entityType", "entityId");
CREATE INDEX IF NOT EXISTS "MedicationRecommendationPilotAuditEvent_action_idx"
  ON "MedicationRecommendationPilotAuditEvent"("action");
CREATE INDEX IF NOT EXISTS "MedicationRecommendationPilotAuditEvent_performedAt_idx"
  ON "MedicationRecommendationPilotAuditEvent"("performedAt");
