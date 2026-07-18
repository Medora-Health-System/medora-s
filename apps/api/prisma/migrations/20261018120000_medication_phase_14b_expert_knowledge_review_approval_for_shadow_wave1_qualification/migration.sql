-- Phase 14B — expert knowledge review, shadow qualification, immutable snapshots.
-- Does NOT activate CDS, alerts, recommendations, or care workflows.

CREATE TABLE IF NOT EXISTS "MedicationExpertReviewBatch" (
  "id" TEXT NOT NULL,
  "programKey" VARCHAR(64) NOT NULL,
  "name" VARCHAR(255) NOT NULL,
  "description" TEXT,
  "waveKey" VARCHAR(64),
  "status" VARCHAR(48) NOT NULL DEFAULT 'PLANNED',
  "targetFamilyCount" INTEGER NOT NULL DEFAULT 0,
  "familiesReviewedCount" INTEGER NOT NULL DEFAULT 0,
  "familiesApprovedForShadowCount" INTEGER NOT NULL DEFAULT 0,
  "familiesDeferredCount" INTEGER NOT NULL DEFAULT 0,
  "programVersion" VARCHAR(32),
  "clinicalActivationAllowed" BOOLEAN NOT NULL DEFAULT false,
  "providerFacingAlertsAllowed" BOOLEAN NOT NULL DEFAULT false,
  "orderBlockingAllowed" BOOLEAN NOT NULL DEFAULT false,
  "knowledgeControlsPatientCare" BOOLEAN NOT NULL DEFAULT false,
  "createdByUserId" TEXT NOT NULL,
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MedicationExpertReviewBatch_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MedicationExpertReviewBatch_alerts_off_chk"
    CHECK ("providerFacingAlertsAllowed" = false),
  CONSTRAINT "MedicationExpertReviewBatch_blocks_off_chk"
    CHECK ("orderBlockingAllowed" = false),
  CONSTRAINT "MedicationExpertReviewBatch_activation_off_chk"
    CHECK ("clinicalActivationAllowed" = false),
  CONSTRAINT "MedicationExpertReviewBatch_no_care_control_chk"
    CHECK ("knowledgeControlsPatientCare" = false)
);
CREATE UNIQUE INDEX IF NOT EXISTS "MedicationExpertReviewBatch_programKey_key"
  ON "MedicationExpertReviewBatch"("programKey");
CREATE INDEX IF NOT EXISTS "MedicationExpertReviewBatch_status_idx"
  ON "MedicationExpertReviewBatch"("status");
CREATE INDEX IF NOT EXISTS "MedicationExpertReviewBatch_waveKey_idx"
  ON "MedicationExpertReviewBatch"("waveKey");

CREATE TABLE IF NOT EXISTS "MedicationKnowledgeDomainReview" (
  "id" TEXT NOT NULL,
  "batchId" TEXT,
  "knowledgeId" VARCHAR(128) NOT NULL,
  "familyKey" VARCHAR(128) NOT NULL,
  "canonicalConceptId" TEXT,
  "waveItemId" TEXT,
  "domain" VARCHAR(64) NOT NULL,
  "reviewLevel" VARCHAR(32) NOT NULL DEFAULT 'CLINICAL',
  "status" VARCHAR(32) NOT NULL DEFAULT 'NOT_STARTED',
  "reviewerId" TEXT,
  "reviewStartedAt" TIMESTAMP(3),
  "reviewCompletedAt" TIMESTAMP(3),
  "comments" TEXT,
  "revisionNumber" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MedicationKnowledgeDomainReview_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MedicationKnowledgeDomainReview_batch_fkey"
    FOREIGN KEY ("batchId") REFERENCES "MedicationExpertReviewBatch"("id")
    ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "MedicationKnowledgeDomainReview_knowledgeId_domain_revisionNumber_key"
  ON "MedicationKnowledgeDomainReview"("knowledgeId", "domain", "revisionNumber");
CREATE INDEX IF NOT EXISTS "MedicationKnowledgeDomainReview_batchId_idx"
  ON "MedicationKnowledgeDomainReview"("batchId");
CREATE INDEX IF NOT EXISTS "MedicationKnowledgeDomainReview_familyKey_idx"
  ON "MedicationKnowledgeDomainReview"("familyKey");
CREATE INDEX IF NOT EXISTS "MedicationKnowledgeDomainReview_status_idx"
  ON "MedicationKnowledgeDomainReview"("status");
CREATE INDEX IF NOT EXISTS "MedicationKnowledgeDomainReview_reviewLevel_idx"
  ON "MedicationKnowledgeDomainReview"("reviewLevel");

CREATE TABLE IF NOT EXISTS "MedicationKnowledgeQuality" (
  "id" TEXT NOT NULL,
  "batchId" TEXT,
  "knowledgeId" VARCHAR(128) NOT NULL,
  "familyKey" VARCHAR(128) NOT NULL,
  "canonicalConceptId" TEXT,
  "clinicalScore" INTEGER NOT NULL DEFAULT 0,
  "safetyScore" INTEGER NOT NULL DEFAULT 0,
  "evidenceScore" INTEGER NOT NULL DEFAULT 0,
  "consistencyScore" INTEGER NOT NULL DEFAULT 0,
  "reviewScore" INTEGER NOT NULL DEFAULT 0,
  "overallScore" INTEGER NOT NULL DEFAULT 0,
  "lastCalculated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MedicationKnowledgeQuality_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MedicationKnowledgeQuality_batch_fkey"
    FOREIGN KEY ("batchId") REFERENCES "MedicationExpertReviewBatch"("id")
    ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "MedicationKnowledgeQuality_batchId_idx"
  ON "MedicationKnowledgeQuality"("batchId");
CREATE INDEX IF NOT EXISTS "MedicationKnowledgeQuality_familyKey_idx"
  ON "MedicationKnowledgeQuality"("familyKey");
CREATE INDEX IF NOT EXISTS "MedicationKnowledgeQuality_knowledgeId_idx"
  ON "MedicationKnowledgeQuality"("knowledgeId");
CREATE INDEX IF NOT EXISTS "MedicationKnowledgeQuality_overallScore_idx"
  ON "MedicationKnowledgeQuality"("overallScore");

CREATE TABLE IF NOT EXISTS "MedicationShadowQualification" (
  "id" TEXT NOT NULL,
  "batchId" TEXT,
  "knowledgeId" VARCHAR(128) NOT NULL,
  "familyKey" VARCHAR(128) NOT NULL,
  "canonicalConceptId" TEXT,
  "waveKey" VARCHAR(64),
  "status" VARCHAR(48) NOT NULL DEFAULT 'NOT_ELIGIBLE',
  "qualifiedAt" TIMESTAMP(3),
  "qualifiedBy" TEXT,
  "reason" TEXT,
  "majorVersion" INTEGER NOT NULL DEFAULT 1,
  "minorVersion" INTEGER NOT NULL DEFAULT 0,
  "evidenceVersion" VARCHAR(64),
  "reviewVersion" VARCHAR(64),
  "approvalVersion" VARCHAR(64),
  "shadowVersion" VARCHAR(64),
  "clinicalActivationAllowed" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MedicationShadowQualification_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MedicationShadowQualification_batch_fkey"
    FOREIGN KEY ("batchId") REFERENCES "MedicationExpertReviewBatch"("id")
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "MedicationShadowQualification_activation_off_chk"
    CHECK ("clinicalActivationAllowed" = false)
);
CREATE UNIQUE INDEX IF NOT EXISTS "MedicationShadowQualification_knowledgeId_key"
  ON "MedicationShadowQualification"("knowledgeId");
CREATE INDEX IF NOT EXISTS "MedicationShadowQualification_batchId_idx"
  ON "MedicationShadowQualification"("batchId");
CREATE INDEX IF NOT EXISTS "MedicationShadowQualification_familyKey_idx"
  ON "MedicationShadowQualification"("familyKey");
CREATE INDEX IF NOT EXISTS "MedicationShadowQualification_status_idx"
  ON "MedicationShadowQualification"("status");
CREATE INDEX IF NOT EXISTS "MedicationShadowQualification_waveKey_idx"
  ON "MedicationShadowQualification"("waveKey");

CREATE TABLE IF NOT EXISTS "MedicationShadowSnapshot" (
  "id" TEXT NOT NULL,
  "batchId" TEXT,
  "knowledgeId" VARCHAR(128) NOT NULL,
  "familyKey" VARCHAR(128) NOT NULL,
  "canonicalConceptId" TEXT,
  "shadowVersion" VARCHAR(64) NOT NULL,
  "snapshotHash" VARCHAR(128) NOT NULL,
  "knowledgeSnapshot" JSONB NOT NULL,
  "safetySnapshot" JSONB NOT NULL,
  "evidenceSnapshot" JSONB NOT NULL,
  "reviewSnapshot" JSONB NOT NULL,
  "approvalSnapshot" JSONB NOT NULL,
  "qualitySnapshot" JSONB,
  "syntheticCasesJson" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MedicationShadowSnapshot_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MedicationShadowSnapshot_batch_fkey"
    FOREIGN KEY ("batchId") REFERENCES "MedicationExpertReviewBatch"("id")
    ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "MedicationShadowSnapshot_knowledgeId_shadowVersion_key"
  ON "MedicationShadowSnapshot"("knowledgeId", "shadowVersion");
CREATE INDEX IF NOT EXISTS "MedicationShadowSnapshot_batchId_idx"
  ON "MedicationShadowSnapshot"("batchId");
CREATE INDEX IF NOT EXISTS "MedicationShadowSnapshot_familyKey_idx"
  ON "MedicationShadowSnapshot"("familyKey");
CREATE INDEX IF NOT EXISTS "MedicationShadowSnapshot_snapshotHash_idx"
  ON "MedicationShadowSnapshot"("snapshotHash");

CREATE TABLE IF NOT EXISTS "MedicationReviewConflict" (
  "id" TEXT NOT NULL,
  "batchId" TEXT,
  "knowledgeId" VARCHAR(128) NOT NULL,
  "familyKey" VARCHAR(128) NOT NULL,
  "conflictType" VARCHAR(32) NOT NULL,
  "severity" VARCHAR(16) NOT NULL DEFAULT 'INFO',
  "description" TEXT NOT NULL,
  "resolutionStatus" VARCHAR(32) NOT NULL DEFAULT 'OPEN',
  "resolutionNotes" TEXT,
  "resolvedByUserId" TEXT,
  "resolvedAt" TIMESTAMP(3),
  "createdByUserId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MedicationReviewConflict_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MedicationReviewConflict_batch_fkey"
    FOREIGN KEY ("batchId") REFERENCES "MedicationExpertReviewBatch"("id")
    ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "MedicationReviewConflict_batchId_idx"
  ON "MedicationReviewConflict"("batchId");
CREATE INDEX IF NOT EXISTS "MedicationReviewConflict_familyKey_idx"
  ON "MedicationReviewConflict"("familyKey");
CREATE INDEX IF NOT EXISTS "MedicationReviewConflict_conflictType_idx"
  ON "MedicationReviewConflict"("conflictType");
CREATE INDEX IF NOT EXISTS "MedicationReviewConflict_resolutionStatus_idx"
  ON "MedicationReviewConflict"("resolutionStatus");
CREATE INDEX IF NOT EXISTS "MedicationReviewConflict_severity_idx"
  ON "MedicationReviewConflict"("severity");

CREATE TABLE IF NOT EXISTS "MedicationExpertReviewAuditEvent" (
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
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MedicationExpertReviewAuditEvent_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MedicationExpertReviewAuditEvent_batch_fkey"
    FOREIGN KEY ("batchId") REFERENCES "MedicationExpertReviewBatch"("id")
    ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "MedicationExpertReviewAuditEvent_batchId_idx"
  ON "MedicationExpertReviewAuditEvent"("batchId");
CREATE INDEX IF NOT EXISTS "MedicationExpertReviewAuditEvent_entity_idx"
  ON "MedicationExpertReviewAuditEvent"("entityType", "entityId");
CREATE INDEX IF NOT EXISTS "MedicationExpertReviewAuditEvent_action_idx"
  ON "MedicationExpertReviewAuditEvent"("action");
CREATE INDEX IF NOT EXISTS "MedicationExpertReviewAuditEvent_user_idx"
  ON "MedicationExpertReviewAuditEvent"("performedByUserId");
CREATE INDEX IF NOT EXISTS "MedicationExpertReviewAuditEvent_performedAt_idx"
  ON "MedicationExpertReviewAuditEvent"("performedAt");
