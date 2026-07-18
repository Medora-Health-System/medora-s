-- Phase 16 — Controlled Shadow Recommendation Engine.
-- Additive / non-destructive. Does NOT activate CDS, alerts, Pilot, or Enterprise Active.
-- Does NOT mutate orders, MAR, or clinical workflows.

CREATE TABLE IF NOT EXISTS "MedicationRecommendationProgram" (
  "id" TEXT NOT NULL,
  "programKey" VARCHAR(64) NOT NULL,
  "name" VARCHAR(255) NOT NULL,
  "description" TEXT,
  "waveKey" VARCHAR(64),
  "status" VARCHAR(48) NOT NULL DEFAULT 'PLANNED',
  "programVersion" VARCHAR(32),
  "targetFamilyCount" INTEGER NOT NULL DEFAULT 8,
  "definitionCount" INTEGER NOT NULL DEFAULT 0,
  "shadowEligibleCount" INTEGER NOT NULL DEFAULT 0,
  "metricsJson" JSONB,
  "shadowRecommendationAllowed" BOOLEAN NOT NULL DEFAULT true,
  "controlledPilotAllowed" BOOLEAN NOT NULL DEFAULT false,
  "enterpriseActiveAllowed" BOOLEAN NOT NULL DEFAULT false,
  "clinicalActivationAllowed" BOOLEAN NOT NULL DEFAULT false,
  "providerFacingAlertsAllowed" BOOLEAN NOT NULL DEFAULT false,
  "orderBlockingAllowed" BOOLEAN NOT NULL DEFAULT false,
  "knowledgeControlsPatientCare" BOOLEAN NOT NULL DEFAULT false,
  "orderFromRecommendationAllowed" BOOLEAN NOT NULL DEFAULT false,
  "createdByUserId" TEXT NOT NULL,
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MedicationRecommendationProgram_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MedicationRecommendationProgram_pilot_off_chk"
    CHECK ("controlledPilotAllowed" = false),
  CONSTRAINT "MedicationRecommendationProgram_enterprise_off_chk"
    CHECK ("enterpriseActiveAllowed" = false),
  CONSTRAINT "MedicationRecommendationProgram_activation_off_chk"
    CHECK ("clinicalActivationAllowed" = false),
  CONSTRAINT "MedicationRecommendationProgram_alerts_off_chk"
    CHECK ("providerFacingAlertsAllowed" = false),
  CONSTRAINT "MedicationRecommendationProgram_blocks_off_chk"
    CHECK ("orderBlockingAllowed" = false),
  CONSTRAINT "MedicationRecommendationProgram_no_care_control_chk"
    CHECK ("knowledgeControlsPatientCare" = false),
  CONSTRAINT "MedicationRecommendationProgram_no_order_from_rec_chk"
    CHECK ("orderFromRecommendationAllowed" = false)
);

CREATE UNIQUE INDEX IF NOT EXISTS "MedicationRecommendationProgram_programKey_key"
  ON "MedicationRecommendationProgram"("programKey");
CREATE INDEX IF NOT EXISTS "MedicationRecommendationProgram_status_idx"
  ON "MedicationRecommendationProgram"("status");
CREATE INDEX IF NOT EXISTS "MedicationRecommendationProgram_waveKey_idx"
  ON "MedicationRecommendationProgram"("waveKey");

CREATE TABLE IF NOT EXISTS "MedicationRecommendationDefinition" (
  "id" TEXT NOT NULL,
  "programId" TEXT NOT NULL,
  "definitionKey" VARCHAR(255) NOT NULL,
  "familyKey" VARCHAR(128) NOT NULL,
  "canonicalConceptId" TEXT,
  "recommendationKind" VARCHAR(48) NOT NULL,
  "title" VARCHAR(255) NOT NULL,
  "reasonSummary" TEXT NOT NULL,
  "structuredPayloadJson" JSONB,
  "lifecycleStatus" VARCHAR(48) NOT NULL DEFAULT 'DRAFT',
  "version" VARCHAR(32) NOT NULL DEFAULT '1.0.0',
  "priorVersionId" TEXT,
  "confidenceScore" INTEGER NOT NULL DEFAULT 0,
  "evidenceCompleteness" INTEGER NOT NULL DEFAULT 0,
  "evidenceLevel" VARCHAR(32),
  "recommendationStrength" VARCHAR(32),
  "validationStatus" VARCHAR(32) NOT NULL DEFAULT 'UNVALIDATED',
  "approvalStatus" VARCHAR(32) NOT NULL DEFAULT 'PENDING',
  "approvedByUserId" TEXT,
  "approvedAt" TIMESTAMP(3),
  "shadowSnapshotId" TEXT,
  "evidenceRegistrationId" TEXT,
  "knowledgeVersion" VARCHAR(64),
  "missingReferencesJson" JSONB,
  "supportingReferencesJson" JSONB,
  "fabricatedForbidden" BOOLEAN NOT NULL DEFAULT true,
  "createdByUserId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MedicationRecommendationDefinition_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MedicationRecommendationDefinition_program_fkey"
    FOREIGN KEY ("programId") REFERENCES "MedicationRecommendationProgram"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "MedicationRecommendationDefinition_snapshot_fkey"
    FOREIGN KEY ("shadowSnapshotId") REFERENCES "MedicationShadowSnapshot"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "MedicationRecommendationDefinition_evidence_fkey"
    FOREIGN KEY ("evidenceRegistrationId") REFERENCES "MedicationEvidenceSourceRegistration"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "MedicationRecommendationDefinition_prior_fkey"
    FOREIGN KEY ("priorVersionId") REFERENCES "MedicationRecommendationDefinition"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "MedicationRecommendationDefinition_definitionKey_key"
  ON "MedicationRecommendationDefinition"("definitionKey");
CREATE INDEX IF NOT EXISTS "MedicationRecommendationDefinition_programId_idx"
  ON "MedicationRecommendationDefinition"("programId");
CREATE INDEX IF NOT EXISTS "MedicationRecommendationDefinition_familyKey_idx"
  ON "MedicationRecommendationDefinition"("familyKey");
CREATE INDEX IF NOT EXISTS "MedicationRecommendationDefinition_recommendationKind_idx"
  ON "MedicationRecommendationDefinition"("recommendationKind");
CREATE INDEX IF NOT EXISTS "MedicationRecommendationDefinition_lifecycleStatus_idx"
  ON "MedicationRecommendationDefinition"("lifecycleStatus");
CREATE INDEX IF NOT EXISTS "MedicationRecommendationDefinition_shadowSnapshotId_idx"
  ON "MedicationRecommendationDefinition"("shadowSnapshotId");
CREATE INDEX IF NOT EXISTS "MedicationRecommendationDefinition_evidenceRegistrationId_idx"
  ON "MedicationRecommendationDefinition"("evidenceRegistrationId");
CREATE INDEX IF NOT EXISTS "MedicationRecommendationDefinition_confidenceScore_idx"
  ON "MedicationRecommendationDefinition"("confidenceScore");

CREATE TABLE IF NOT EXISTS "MedicationRecommendationEvidenceLink" (
  "id" TEXT NOT NULL,
  "definitionId" TEXT NOT NULL,
  "evidenceRegistrationId" TEXT,
  "sourceIdentity" VARCHAR(128),
  "sourceTier" VARCHAR(48),
  "evidenceLevel" VARCHAR(32),
  "permittedUseStatus" VARCHAR(32),
  "excerptNormalized" TEXT,
  "provenanceJson" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MedicationRecommendationEvidenceLink_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MedicationRecommendationEvidenceLink_definition_fkey"
    FOREIGN KEY ("definitionId") REFERENCES "MedicationRecommendationDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "MedicationRecommendationEvidenceLink_registration_fkey"
    FOREIGN KEY ("evidenceRegistrationId") REFERENCES "MedicationEvidenceSourceRegistration"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "MedicationRecommendationEvidenceLink_definitionId_idx"
  ON "MedicationRecommendationEvidenceLink"("definitionId");
CREATE INDEX IF NOT EXISTS "MedicationRecommendationEvidenceLink_evidenceRegistrationId_idx"
  ON "MedicationRecommendationEvidenceLink"("evidenceRegistrationId");

CREATE TABLE IF NOT EXISTS "MedicationRecommendationReview" (
  "id" TEXT NOT NULL,
  "definitionId" TEXT NOT NULL,
  "decision" VARCHAR(48) NOT NULL,
  "rationale" TEXT,
  "reviewerUserId" TEXT NOT NULL,
  "reviewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "limitationsJson" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MedicationRecommendationReview_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MedicationRecommendationReview_definition_fkey"
    FOREIGN KEY ("definitionId") REFERENCES "MedicationRecommendationDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "MedicationRecommendationReview_definitionId_idx"
  ON "MedicationRecommendationReview"("definitionId");
CREATE INDEX IF NOT EXISTS "MedicationRecommendationReview_decision_idx"
  ON "MedicationRecommendationReview"("decision");
CREATE INDEX IF NOT EXISTS "MedicationRecommendationReview_reviewerUserId_idx"
  ON "MedicationRecommendationReview"("reviewerUserId");

CREATE TABLE IF NOT EXISTS "MedicationRecommendationShadowEvaluation" (
  "id" TEXT NOT NULL,
  "programId" TEXT,
  "facilityId" TEXT NOT NULL,
  "patientId" TEXT,
  "encounterId" TEXT,
  "providerUserId" TEXT NOT NULL,
  "evaluatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "recommendationVersionSet" VARCHAR(128),
  "knowledgeVersionSet" VARCHAR(64),
  "recommendationsJson" JSONB NOT NULL,
  "reasoningPathJson" JSONB,
  "confidenceSummaryJson" JSONB,
  "metricsJson" JSONB,
  "mutatesOrders" BOOLEAN NOT NULL DEFAULT false,
  "mutatesMar" BOOLEAN NOT NULL DEFAULT false,
  "mutatesChart" BOOLEAN NOT NULL DEFAULT false,
  "clinicalActivation" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MedicationRecommendationShadowEvaluation_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MedicationRecommendationShadowEvaluation_program_fkey"
    FOREIGN KEY ("programId") REFERENCES "MedicationRecommendationProgram"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "MedicationRecommendationShadowEvaluation_no_orders_chk"
    CHECK ("mutatesOrders" = false),
  CONSTRAINT "MedicationRecommendationShadowEvaluation_no_mar_chk"
    CHECK ("mutatesMar" = false),
  CONSTRAINT "MedicationRecommendationShadowEvaluation_no_chart_chk"
    CHECK ("mutatesChart" = false),
  CONSTRAINT "MedicationRecommendationShadowEvaluation_no_activation_chk"
    CHECK ("clinicalActivation" = false)
);

CREATE INDEX IF NOT EXISTS "MedicationRecommendationShadowEvaluation_programId_idx"
  ON "MedicationRecommendationShadowEvaluation"("programId");
CREATE INDEX IF NOT EXISTS "MedicationRecommendationShadowEvaluation_facilityId_idx"
  ON "MedicationRecommendationShadowEvaluation"("facilityId");
CREATE INDEX IF NOT EXISTS "MedicationRecommendationShadowEvaluation_patientId_idx"
  ON "MedicationRecommendationShadowEvaluation"("patientId");
CREATE INDEX IF NOT EXISTS "MedicationRecommendationShadowEvaluation_encounterId_idx"
  ON "MedicationRecommendationShadowEvaluation"("encounterId");
CREATE INDEX IF NOT EXISTS "MedicationRecommendationShadowEvaluation_providerUserId_idx"
  ON "MedicationRecommendationShadowEvaluation"("providerUserId");
CREATE INDEX IF NOT EXISTS "MedicationRecommendationShadowEvaluation_evaluatedAt_idx"
  ON "MedicationRecommendationShadowEvaluation"("evaluatedAt");

CREATE TABLE IF NOT EXISTS "MedicationRecommendationFeedback" (
  "id" TEXT NOT NULL,
  "definitionId" TEXT NOT NULL,
  "evaluationId" TEXT,
  "facilityId" TEXT NOT NULL,
  "providerUserId" TEXT NOT NULL,
  "encounterId" TEXT,
  "feedbackType" VARCHAR(48) NOT NULL,
  "overrideReason" TEXT,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MedicationRecommendationFeedback_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MedicationRecommendationFeedback_definition_fkey"
    FOREIGN KEY ("definitionId") REFERENCES "MedicationRecommendationDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "MedicationRecommendationFeedback_definitionId_idx"
  ON "MedicationRecommendationFeedback"("definitionId");
CREATE INDEX IF NOT EXISTS "MedicationRecommendationFeedback_facilityId_idx"
  ON "MedicationRecommendationFeedback"("facilityId");
CREATE INDEX IF NOT EXISTS "MedicationRecommendationFeedback_providerUserId_idx"
  ON "MedicationRecommendationFeedback"("providerUserId");
CREATE INDEX IF NOT EXISTS "MedicationRecommendationFeedback_feedbackType_idx"
  ON "MedicationRecommendationFeedback"("feedbackType");

CREATE TABLE IF NOT EXISTS "MedicationRecommendationAnalyticsSnapshot" (
  "id" TEXT NOT NULL,
  "programId" TEXT,
  "snapshotKey" VARCHAR(128) NOT NULL,
  "generatedCount" INTEGER NOT NULL DEFAULT 0,
  "acknowledgedCount" INTEGER NOT NULL DEFAULT 0,
  "rejectedCount" INTEGER NOT NULL DEFAULT 0,
  "overrideCount" INTEGER NOT NULL DEFAULT 0,
  "shadowEvaluationCount" INTEGER NOT NULL DEFAULT 0,
  "coveragePercent" INTEGER NOT NULL DEFAULT 0,
  "confidenceBucketsJson" JSONB,
  "metricsJson" JSONB,
  "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MedicationRecommendationAnalyticsSnapshot_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MedicationRecommendationAnalyticsSnapshot_program_fkey"
    FOREIGN KEY ("programId") REFERENCES "MedicationRecommendationProgram"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "MedicationRecommendationAnalyticsSnapshot_snapshotKey_key"
  ON "MedicationRecommendationAnalyticsSnapshot"("snapshotKey");
CREATE INDEX IF NOT EXISTS "MedicationRecommendationAnalyticsSnapshot_programId_idx"
  ON "MedicationRecommendationAnalyticsSnapshot"("programId");
CREATE INDEX IF NOT EXISTS "MedicationRecommendationAnalyticsSnapshot_capturedAt_idx"
  ON "MedicationRecommendationAnalyticsSnapshot"("capturedAt");

CREATE TABLE IF NOT EXISTS "MedicationRecommendationAuditEvent" (
  "id" TEXT NOT NULL,
  "programId" TEXT,
  "entityType" VARCHAR(64) NOT NULL,
  "entityId" TEXT NOT NULL,
  "action" VARCHAR(64) NOT NULL,
  "beforeState" JSONB,
  "afterState" JSONB,
  "performedByUserId" TEXT NOT NULL,
  "performedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MedicationRecommendationAuditEvent_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MedicationRecommendationAuditEvent_program_fkey"
    FOREIGN KEY ("programId") REFERENCES "MedicationRecommendationProgram"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "MedicationRecommendationAuditEvent_programId_idx"
  ON "MedicationRecommendationAuditEvent"("programId");
CREATE INDEX IF NOT EXISTS "MedicationRecommendationAuditEvent_entity_idx"
  ON "MedicationRecommendationAuditEvent"("entityType", "entityId");
CREATE INDEX IF NOT EXISTS "MedicationRecommendationAuditEvent_action_idx"
  ON "MedicationRecommendationAuditEvent"("action");
CREATE INDEX IF NOT EXISTS "MedicationRecommendationAuditEvent_performedByUserId_idx"
  ON "MedicationRecommendationAuditEvent"("performedByUserId");
CREATE INDEX IF NOT EXISTS "MedicationRecommendationAuditEvent_performedAt_idx"
  ON "MedicationRecommendationAuditEvent"("performedAt");
