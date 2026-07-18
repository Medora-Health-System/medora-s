-- Phase 10 — patient-specific medication safety evaluation (SHADOW mode only).
-- No provider alerts, order blocking, or clinical mutations.

CREATE TABLE IF NOT EXISTS "MedicationSafetyPatientContextSnapshot" (
  "id" TEXT NOT NULL,
  "patientId" TEXT NOT NULL,
  "encounterId" TEXT,
  "ageYears" INTEGER,
  "ageMonths" INTEGER,
  "weightKg" DECIMAL(10,3),
  "heightCm" DECIMAL(10,3),
  "bodySurfaceAreaM2" DECIMAL(10,4),
  "sexAtBirth" VARCHAR(32),
  "pregnancyStatus" VARCHAR(32),
  "lactationStatus" VARCHAR(32),
  "estimatedGfr" DECIMAL(10,3),
  "creatinineClearance" DECIMAL(10,3),
  "hepaticFunctionClassification" VARCHAR(48),
  "activeDiagnosisCodesJson" JSONB,
  "activeAllergyIdsJson" JSONB,
  "activeMedicationOrderIdsJson" JSONB,
  "activeHomeMedicationIdsJson" JSONB,
  "relevantLaboratoryResultIdsJson" JSONB,
  "emergencyContextTagsJson" JSONB,
  "contextCompleteness" VARCHAR(32) NOT NULL DEFAULT 'PARTIAL',
  "missingContextFieldsJson" JSONB,
  "fixtureMarker" VARCHAR(64),
  "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MedicationSafetyPatientContextSnapshot_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "MedicationSafetyPatientContextSnapshot_patientId_idx"
  ON "MedicationSafetyPatientContextSnapshot"("patientId");
CREATE INDEX IF NOT EXISTS "MedicationSafetyPatientContextSnapshot_encounterId_idx"
  ON "MedicationSafetyPatientContextSnapshot"("encounterId");
CREATE INDEX IF NOT EXISTS "MedicationSafetyPatientContextSnapshot_capturedAt_idx"
  ON "MedicationSafetyPatientContextSnapshot"("capturedAt");
CREATE INDEX IF NOT EXISTS "MedicationSafetyPatientContextSnapshot_fixtureMarker_idx"
  ON "MedicationSafetyPatientContextSnapshot"("fixtureMarker");

CREATE TABLE IF NOT EXISTS "MedicationSafetyEvaluationRun" (
  "id" TEXT NOT NULL,
  "patientId" TEXT NOT NULL,
  "encounterId" TEXT,
  "triggerType" VARCHAR(48) NOT NULL,
  "operatingMode" VARCHAR(16) NOT NULL,
  "status" VARCHAR(32) NOT NULL DEFAULT 'QUEUED',
  "requestedByUserId" TEXT,
  "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "failedAt" TIMESTAMP(3),
  "knowledgeVersionIdsJson" JSONB,
  "patientContextSnapshotId" TEXT,
  "candidateMedicationOrderId" TEXT,
  "candidateMedicationConceptId" TEXT,
  "candidateMedicationProductId" TEXT,
  "rulesConsidered" INTEGER NOT NULL DEFAULT 0,
  "rulesEvaluated" INTEGER NOT NULL DEFAULT 0,
  "findingsCreated" INTEGER NOT NULL DEFAULT 0,
  "findingsSuppressed" INTEGER NOT NULL DEFAULT 0,
  "findingsDeduplicated" INTEGER NOT NULL DEFAULT 0,
  "errorsJson" JSONB,
  "engineVersion" VARCHAR(64) NOT NULL,
  "correlationId" VARCHAR(128),
  "durationMs" INTEGER,
  "knowledgeRetrievalMs" INTEGER,
  "ruleEvaluationMs" INTEGER,
  "findingPersistenceMs" INTEGER,
  "fixtureMarker" VARCHAR(64),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MedicationSafetyEvaluationRun_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "MedicationSafetyEvaluationRun_patientId_idx"
  ON "MedicationSafetyEvaluationRun"("patientId");
CREATE INDEX IF NOT EXISTS "MedicationSafetyEvaluationRun_encounterId_idx"
  ON "MedicationSafetyEvaluationRun"("encounterId");
CREATE INDEX IF NOT EXISTS "MedicationSafetyEvaluationRun_status_idx"
  ON "MedicationSafetyEvaluationRun"("status");
CREATE INDEX IF NOT EXISTS "MedicationSafetyEvaluationRun_operatingMode_idx"
  ON "MedicationSafetyEvaluationRun"("operatingMode");
CREATE INDEX IF NOT EXISTS "MedicationSafetyEvaluationRun_triggerType_idx"
  ON "MedicationSafetyEvaluationRun"("triggerType");
CREATE INDEX IF NOT EXISTS "MedicationSafetyEvaluationRun_requestedAt_idx"
  ON "MedicationSafetyEvaluationRun"("requestedAt");
CREATE INDEX IF NOT EXISTS "MedicationSafetyEvaluationRun_correlationId_idx"
  ON "MedicationSafetyEvaluationRun"("correlationId");
CREATE INDEX IF NOT EXISTS "MedicationSafetyEvaluationRun_fixtureMarker_idx"
  ON "MedicationSafetyEvaluationRun"("fixtureMarker");
CREATE INDEX IF NOT EXISTS "MedicationSafetyEvaluationRun_patientContextSnapshotId_idx"
  ON "MedicationSafetyEvaluationRun"("patientContextSnapshotId");

CREATE TABLE IF NOT EXISTS "MedicationSafetyEvaluationFinding" (
  "id" TEXT NOT NULL,
  "evaluationRunId" TEXT NOT NULL,
  "patientId" TEXT NOT NULL,
  "encounterId" TEXT,
  "candidateMedicationOrderId" TEXT,
  "relatedMedicationOrderId" TEXT,
  "relatedHomeMedicationId" TEXT,
  "relatedAllergyId" TEXT,
  "findingType" VARCHAR(64) NOT NULL,
  "severity" VARCHAR(32),
  "clinicalSignificance" VARCHAR(32),
  "ruleId" TEXT,
  "knowledgeEntityType" VARCHAR(64),
  "knowledgeEntityId" TEXT,
  "sourceVersionId" TEXT,
  "title" TEXT NOT NULL,
  "summary" TEXT NOT NULL,
  "mechanism" TEXT,
  "recommendedFutureAction" TEXT,
  "monitoringRecommendation" TEXT,
  "evidenceLevel" VARCHAR(48),
  "futureAlertEligible" BOOLEAN NOT NULL DEFAULT false,
  "shadowOnly" BOOLEAN NOT NULL DEFAULT true,
  "suppressionStatus" VARCHAR(32),
  "suppressionReason" VARCHAR(48),
  "deduplicationKey" VARCHAR(768) NOT NULL,
  "contextCompleteness" VARCHAR(32),
  "requiresClinicalValidation" BOOLEAN NOT NULL DEFAULT false,
  "emergencyContextTagsJson" JSONB,
  "calculationTraceJson" JSONB,
  "fixtureMarker" VARCHAR(64),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MedicationSafetyEvaluationFinding_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MedicationSafetyEvaluationFinding_shadowOnly_true_chk"
    CHECK ("shadowOnly" = true)
);
CREATE UNIQUE INDEX IF NOT EXISTS "MedicationSafetyEvaluationFinding_deduplicationKey_key"
  ON "MedicationSafetyEvaluationFinding"("deduplicationKey");
CREATE INDEX IF NOT EXISTS "MedicationSafetyEvaluationFinding_evaluationRunId_idx"
  ON "MedicationSafetyEvaluationFinding"("evaluationRunId");
CREATE INDEX IF NOT EXISTS "MedicationSafetyEvaluationFinding_patientId_idx"
  ON "MedicationSafetyEvaluationFinding"("patientId");
CREATE INDEX IF NOT EXISTS "MedicationSafetyEvaluationFinding_encounterId_idx"
  ON "MedicationSafetyEvaluationFinding"("encounterId");
CREATE INDEX IF NOT EXISTS "MedicationSafetyEvaluationFinding_findingType_idx"
  ON "MedicationSafetyEvaluationFinding"("findingType");
CREATE INDEX IF NOT EXISTS "MedicationSafetyEvaluationFinding_severity_idx"
  ON "MedicationSafetyEvaluationFinding"("severity");
CREATE INDEX IF NOT EXISTS "MedicationSafetyEvaluationFinding_shadowOnly_idx"
  ON "MedicationSafetyEvaluationFinding"("shadowOnly");
CREATE INDEX IF NOT EXISTS "MedicationSafetyEvaluationFinding_sourceVersionId_idx"
  ON "MedicationSafetyEvaluationFinding"("sourceVersionId");
CREATE INDEX IF NOT EXISTS "MedicationSafetyEvaluationFinding_fixtureMarker_idx"
  ON "MedicationSafetyEvaluationFinding"("fixtureMarker");

CREATE TABLE IF NOT EXISTS "MedicationSafetyFindingValidation" (
  "id" TEXT NOT NULL,
  "findingId" TEXT NOT NULL,
  "classification" VARCHAR(48) NOT NULL DEFAULT 'UNREVIEWED',
  "reason" TEXT,
  "notes" TEXT,
  "recommendedKnowledgeChange" TEXT,
  "recommendedEngineChange" TEXT,
  "reviewedByUserId" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MedicationSafetyFindingValidation_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "MedicationSafetyFindingValidation_findingId_idx"
  ON "MedicationSafetyFindingValidation"("findingId");
CREATE INDEX IF NOT EXISTS "MedicationSafetyFindingValidation_classification_idx"
  ON "MedicationSafetyFindingValidation"("classification");
CREATE INDEX IF NOT EXISTS "MedicationSafetyFindingValidation_reviewedByUserId_idx"
  ON "MedicationSafetyFindingValidation"("reviewedByUserId");

CREATE TABLE IF NOT EXISTS "MedicationSafetySuppressionRule" (
  "id" TEXT NOT NULL,
  "code" VARCHAR(64) NOT NULL,
  "suppressionReason" VARCHAR(48) NOT NULL,
  "findingType" VARCHAR(64),
  "emergencyContext" VARCHAR(48),
  "normalizedRuleIdentity" VARCHAR(255),
  "summary" TEXT NOT NULL,
  "status" VARCHAR(32) NOT NULL DEFAULT 'DRAFT',
  "shadowOnly" BOOLEAN NOT NULL DEFAULT true,
  "clinicalActivationAllowed" BOOLEAN NOT NULL DEFAULT false,
  "sourceVersionId" TEXT,
  "reviewedByUserId" TEXT,
  "approvedByUserId" TEXT,
  "approvedAt" TIMESTAMP(3),
  "supersedesId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MedicationSafetySuppressionRule_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MedicationSafetySuppressionRule_shadowOnly_true_chk"
    CHECK ("shadowOnly" = true),
  CONSTRAINT "MedicationSafetySuppressionRule_activation_false_chk"
    CHECK ("clinicalActivationAllowed" = false)
);
CREATE UNIQUE INDEX IF NOT EXISTS "MedicationSafetySuppressionRule_code_key"
  ON "MedicationSafetySuppressionRule"("code");
CREATE INDEX IF NOT EXISTS "MedicationSafetySuppressionRule_status_idx"
  ON "MedicationSafetySuppressionRule"("status");
CREATE INDEX IF NOT EXISTS "MedicationSafetySuppressionRule_suppressionReason_idx"
  ON "MedicationSafetySuppressionRule"("suppressionReason");
CREATE INDEX IF NOT EXISTS "MedicationSafetySuppressionRule_findingType_idx"
  ON "MedicationSafetySuppressionRule"("findingType");
CREATE INDEX IF NOT EXISTS "MedicationSafetySuppressionRule_shadowOnly_idx"
  ON "MedicationSafetySuppressionRule"("shadowOnly");
CREATE INDEX IF NOT EXISTS "MedicationSafetySuppressionRule_clinicalActivationAllowed_idx"
  ON "MedicationSafetySuppressionRule"("clinicalActivationAllowed");

CREATE TABLE IF NOT EXISTS "MedicationSafetyFindingSuppression" (
  "id" TEXT NOT NULL,
  "findingId" TEXT NOT NULL,
  "suppressionRuleId" TEXT,
  "suppressionReason" VARCHAR(48) NOT NULL,
  "explanation" TEXT NOT NULL,
  "performedByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MedicationSafetyFindingSuppression_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "MedicationSafetyFindingSuppression_findingId_idx"
  ON "MedicationSafetyFindingSuppression"("findingId");
CREATE INDEX IF NOT EXISTS "MedicationSafetyFindingSuppression_suppressionRuleId_idx"
  ON "MedicationSafetyFindingSuppression"("suppressionRuleId");
CREATE INDEX IF NOT EXISTS "MedicationSafetyFindingSuppression_suppressionReason_idx"
  ON "MedicationSafetyFindingSuppression"("suppressionReason");

CREATE TABLE IF NOT EXISTS "MedicationSafetyEvaluationAuditEvent" (
  "id" TEXT NOT NULL,
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
  CONSTRAINT "MedicationSafetyEvaluationAuditEvent_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "MedicationSafetyEvaluationAuditEvent_entityType_entityId_idx"
  ON "MedicationSafetyEvaluationAuditEvent"("entityType", "entityId");
CREATE INDEX IF NOT EXISTS "MedicationSafetyEvaluationAuditEvent_action_idx"
  ON "MedicationSafetyEvaluationAuditEvent"("action");
CREATE INDEX IF NOT EXISTS "MedicationSafetyEvaluationAuditEvent_performedByUserId_idx"
  ON "MedicationSafetyEvaluationAuditEvent"("performedByUserId");
CREATE INDEX IF NOT EXISTS "MedicationSafetyEvaluationAuditEvent_performedAt_idx"
  ON "MedicationSafetyEvaluationAuditEvent"("performedAt");
CREATE INDEX IF NOT EXISTS "MedicationSafetyEvaluationAuditEvent_correlationId_idx"
  ON "MedicationSafetyEvaluationAuditEvent"("correlationId");

ALTER TABLE "MedicationSafetyEvaluationRun"
  DROP CONSTRAINT IF EXISTS "MedicationSafetyEvaluationRun_patientContextSnapshotId_fkey";
ALTER TABLE "MedicationSafetyEvaluationRun"
  ADD CONSTRAINT "MedicationSafetyEvaluationRun_patientContextSnapshotId_fkey"
  FOREIGN KEY ("patientContextSnapshotId") REFERENCES "MedicationSafetyPatientContextSnapshot"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "MedicationSafetyEvaluationFinding"
  DROP CONSTRAINT IF EXISTS "MedicationSafetyEvaluationFinding_evaluationRunId_fkey";
ALTER TABLE "MedicationSafetyEvaluationFinding"
  ADD CONSTRAINT "MedicationSafetyEvaluationFinding_evaluationRunId_fkey"
  FOREIGN KEY ("evaluationRunId") REFERENCES "MedicationSafetyEvaluationRun"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MedicationSafetyFindingValidation"
  DROP CONSTRAINT IF EXISTS "MedicationSafetyFindingValidation_findingId_fkey";
ALTER TABLE "MedicationSafetyFindingValidation"
  ADD CONSTRAINT "MedicationSafetyFindingValidation_findingId_fkey"
  FOREIGN KEY ("findingId") REFERENCES "MedicationSafetyEvaluationFinding"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MedicationSafetySuppressionRule"
  DROP CONSTRAINT IF EXISTS "MedicationSafetySuppressionRule_supersedesId_fkey";
ALTER TABLE "MedicationSafetySuppressionRule"
  ADD CONSTRAINT "MedicationSafetySuppressionRule_supersedesId_fkey"
  FOREIGN KEY ("supersedesId") REFERENCES "MedicationSafetySuppressionRule"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "MedicationSafetyFindingSuppression"
  DROP CONSTRAINT IF EXISTS "MedicationSafetyFindingSuppression_findingId_fkey";
ALTER TABLE "MedicationSafetyFindingSuppression"
  ADD CONSTRAINT "MedicationSafetyFindingSuppression_findingId_fkey"
  FOREIGN KEY ("findingId") REFERENCES "MedicationSafetyEvaluationFinding"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MedicationSafetyFindingSuppression"
  DROP CONSTRAINT IF EXISTS "MedicationSafetyFindingSuppression_suppressionRuleId_fkey";
ALTER TABLE "MedicationSafetyFindingSuppression"
  ADD CONSTRAINT "MedicationSafetyFindingSuppression_suppressionRuleId_fkey"
  FOREIGN KEY ("suppressionRuleId") REFERENCES "MedicationSafetySuppressionRule"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
