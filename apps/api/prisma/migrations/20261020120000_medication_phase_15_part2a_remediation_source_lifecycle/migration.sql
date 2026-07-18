-- Phase 15 Part 2A — authoritative source lifecycle + Wave 1 remediation queue.
-- Additive / non-destructive. Does NOT activate CDS, alerts, or care workflows.

-- Extend Phase 14A evidence source registration (lifecycle metadata only).
ALTER TABLE "MedicationEvidenceSourceRegistration"
  ADD COLUMN IF NOT EXISTS "sourceCategory" VARCHAR(48),
  ADD COLUMN IF NOT EXISTS "licensingStatus" VARCHAR(32),
  ADD COLUMN IF NOT EXISTS "reviewStatus" VARCHAR(32),
  ADD COLUMN IF NOT EXISTS "lifecycleNotes" TEXT;

CREATE INDEX IF NOT EXISTS "MedicationEvidenceSourceRegistration_sourceCategory_idx"
  ON "MedicationEvidenceSourceRegistration"("sourceCategory");
CREATE INDEX IF NOT EXISTS "MedicationEvidenceSourceRegistration_reviewStatus_idx"
  ON "MedicationEvidenceSourceRegistration"("reviewStatus");

CREATE TABLE IF NOT EXISTS "MedicationRemediationProgram" (
  "id" TEXT NOT NULL,
  "programKey" VARCHAR(64) NOT NULL,
  "name" VARCHAR(255) NOT NULL,
  "description" TEXT,
  "waveKey" VARCHAR(64),
  "status" VARCHAR(48) NOT NULL DEFAULT 'PLANNED',
  "programVersion" VARCHAR(32),
  "targetFamilyCount" INTEGER NOT NULL DEFAULT 8,
  "openWorkItemCount" INTEGER NOT NULL DEFAULT 0,
  "resolvedWorkItemCount" INTEGER NOT NULL DEFAULT 0,
  "blockedWorkItemCount" INTEGER NOT NULL DEFAULT 0,
  "metricsJson" JSONB,
  "clinicalActivationAllowed" BOOLEAN NOT NULL DEFAULT false,
  "providerFacingAlertsAllowed" BOOLEAN NOT NULL DEFAULT false,
  "orderBlockingAllowed" BOOLEAN NOT NULL DEFAULT false,
  "knowledgeControlsPatientCare" BOOLEAN NOT NULL DEFAULT false,
  "createdByUserId" TEXT NOT NULL,
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MedicationRemediationProgram_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MedicationRemediationProgram_alerts_off_chk"
    CHECK ("providerFacingAlertsAllowed" = false),
  CONSTRAINT "MedicationRemediationProgram_blocks_off_chk"
    CHECK ("orderBlockingAllowed" = false),
  CONSTRAINT "MedicationRemediationProgram_activation_off_chk"
    CHECK ("clinicalActivationAllowed" = false),
  CONSTRAINT "MedicationRemediationProgram_no_care_control_chk"
    CHECK ("knowledgeControlsPatientCare" = false)
);

CREATE UNIQUE INDEX IF NOT EXISTS "MedicationRemediationProgram_programKey_key"
  ON "MedicationRemediationProgram"("programKey");
CREATE INDEX IF NOT EXISTS "MedicationRemediationProgram_status_idx"
  ON "MedicationRemediationProgram"("status");
CREATE INDEX IF NOT EXISTS "MedicationRemediationProgram_waveKey_idx"
  ON "MedicationRemediationProgram"("waveKey");

CREATE TABLE IF NOT EXISTS "MedicationRemediationWorkItem" (
  "id" TEXT NOT NULL,
  "programId" TEXT NOT NULL,
  "workItemKey" VARCHAR(255) NOT NULL,
  "familyKey" VARCHAR(128) NOT NULL,
  "canonicalConceptId" TEXT,
  "gapCategory" VARCHAR(32) NOT NULL,
  "shadowGapLinkId" TEXT,
  "knowledgeGapId" TEXT,
  "evidenceRegistrationId" TEXT,
  "status" VARCHAR(48) NOT NULL DEFAULT 'OPEN',
  "severity" VARCHAR(16) NOT NULL DEFAULT 'INFO',
  "title" VARCHAR(255) NOT NULL,
  "description" TEXT NOT NULL,
  "recommendedAction" TEXT,
  "readinessTarget" VARCHAR(64),
  "assignedToUserId" TEXT,
  "requiresAuthoritativeSource" BOOLEAN NOT NULL DEFAULT true,
  "fabricatedKnowledgeForbidden" BOOLEAN NOT NULL DEFAULT true,
  "routedAt" TIMESTAMP(3),
  "resolvedAt" TIMESTAMP(3),
  "createdByUserId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MedicationRemediationWorkItem_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MedicationRemediationWorkItem_program_fkey"
    FOREIGN KEY ("programId") REFERENCES "MedicationRemediationProgram"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "MedicationRemediationWorkItem_gap_fkey"
    FOREIGN KEY ("shadowGapLinkId") REFERENCES "MedicationShadowGapLink"("id")
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "MedicationRemediationWorkItem_registration_fkey"
    FOREIGN KEY ("evidenceRegistrationId") REFERENCES "MedicationEvidenceSourceRegistration"("id")
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "MedicationRemediationWorkItem_no_fabricate_chk"
    CHECK ("fabricatedKnowledgeForbidden" = true)
);

CREATE UNIQUE INDEX IF NOT EXISTS "MedicationRemediationWorkItem_workItemKey_key"
  ON "MedicationRemediationWorkItem"("workItemKey");
CREATE INDEX IF NOT EXISTS "MedicationRemediationWorkItem_programId_idx"
  ON "MedicationRemediationWorkItem"("programId");
CREATE INDEX IF NOT EXISTS "MedicationRemediationWorkItem_familyKey_idx"
  ON "MedicationRemediationWorkItem"("familyKey");
CREATE INDEX IF NOT EXISTS "MedicationRemediationWorkItem_gapCategory_idx"
  ON "MedicationRemediationWorkItem"("gapCategory");
CREATE INDEX IF NOT EXISTS "MedicationRemediationWorkItem_status_idx"
  ON "MedicationRemediationWorkItem"("status");
CREATE INDEX IF NOT EXISTS "MedicationRemediationWorkItem_shadowGapLinkId_idx"
  ON "MedicationRemediationWorkItem"("shadowGapLinkId");
CREATE INDEX IF NOT EXISTS "MedicationRemediationWorkItem_evidenceRegistrationId_idx"
  ON "MedicationRemediationWorkItem"("evidenceRegistrationId");

CREATE TABLE IF NOT EXISTS "MedicationRemediationAuditEvent" (
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
  CONSTRAINT "MedicationRemediationAuditEvent_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MedicationRemediationAuditEvent_program_fkey"
    FOREIGN KEY ("programId") REFERENCES "MedicationRemediationProgram"("id")
    ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "MedicationRemediationAuditEvent_programId_idx"
  ON "MedicationRemediationAuditEvent"("programId");
CREATE INDEX IF NOT EXISTS "MedicationRemediationAuditEvent_entity_idx"
  ON "MedicationRemediationAuditEvent"("entityType", "entityId");
CREATE INDEX IF NOT EXISTS "MedicationRemediationAuditEvent_action_idx"
  ON "MedicationRemediationAuditEvent"("action");
CREATE INDEX IF NOT EXISTS "MedicationRemediationAuditEvent_user_idx"
  ON "MedicationRemediationAuditEvent"("performedByUserId");
CREATE INDEX IF NOT EXISTS "MedicationRemediationAuditEvent_performedAt_idx"
  ON "MedicationRemediationAuditEvent"("performedAt");
