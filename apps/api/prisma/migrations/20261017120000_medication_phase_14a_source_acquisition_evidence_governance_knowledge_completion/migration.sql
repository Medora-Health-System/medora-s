-- Phase 14A — evidence acquisition, provenance, knowledge completion.
-- Does NOT activate CDS, block orders, or mutate ordering/MAR/billing workflows.

CREATE TABLE IF NOT EXISTS "MedicationEvidenceAcquisitionBatch" (
  "id" TEXT NOT NULL,
  "batchKey" VARCHAR(64) NOT NULL,
  "name" VARCHAR(255) NOT NULL,
  "description" TEXT,
  "waveKey" VARCHAR(64),
  "status" VARCHAR(48) NOT NULL DEFAULT 'PLANNED',
  "targetFamilyCount" INTEGER NOT NULL DEFAULT 0,
  "familiesWithProvenanceCount" INTEGER NOT NULL DEFAULT 0,
  "evidenceLinksCreatedCount" INTEGER NOT NULL DEFAULT 0,
  "placeholdersRetiredCount" INTEGER NOT NULL DEFAULT 0,
  "programVersion" VARCHAR(32),
  "clinicalActivationAllowed" BOOLEAN NOT NULL DEFAULT false,
  "providerFacingAlertsAllowed" BOOLEAN NOT NULL DEFAULT false,
  "orderBlockingAllowed" BOOLEAN NOT NULL DEFAULT false,
  "knowledgeControlsPatientCare" BOOLEAN NOT NULL DEFAULT false,
  "createdByUserId" TEXT NOT NULL,
  "completedAt" TIMESTAMP(3),
  "lockedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MedicationEvidenceAcquisitionBatch_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MedicationEvidenceAcquisitionBatch_alerts_off_chk"
    CHECK ("providerFacingAlertsAllowed" = false),
  CONSTRAINT "MedicationEvidenceAcquisitionBatch_blocks_off_chk"
    CHECK ("orderBlockingAllowed" = false),
  CONSTRAINT "MedicationEvidenceAcquisitionBatch_activation_off_chk"
    CHECK ("clinicalActivationAllowed" = false),
  CONSTRAINT "MedicationEvidenceAcquisitionBatch_no_care_control_chk"
    CHECK ("knowledgeControlsPatientCare" = false)
);
CREATE UNIQUE INDEX IF NOT EXISTS "MedicationEvidenceAcquisitionBatch_batchKey_key"
  ON "MedicationEvidenceAcquisitionBatch"("batchKey");
CREATE INDEX IF NOT EXISTS "MedicationEvidenceAcquisitionBatch_status_idx"
  ON "MedicationEvidenceAcquisitionBatch"("status");
CREATE INDEX IF NOT EXISTS "MedicationEvidenceAcquisitionBatch_waveKey_idx"
  ON "MedicationEvidenceAcquisitionBatch"("waveKey");

CREATE TABLE IF NOT EXISTS "MedicationEvidenceSourceRegistration" (
  "id" TEXT NOT NULL,
  "batchId" TEXT,
  "registrationKey" VARCHAR(128) NOT NULL,
  "knowledgeScope" VARCHAR(16) NOT NULL,
  "clinicalSourceId" TEXT,
  "clinicalVersionId" TEXT,
  "safetySourceId" TEXT,
  "safetyVersionId" TEXT,
  "sourceTier" VARCHAR(48) NOT NULL,
  "publisher" VARCHAR(255),
  "jurisdiction" VARCHAR(64),
  "licenseStatus" VARCHAR(64) NOT NULL DEFAULT 'INSTITUTIONAL_USE',
  "licenseNotes" TEXT,
  "citationText" TEXT,
  "sourceUrlReference" TEXT,
  "publicationDate" TIMESTAMP(3),
  "effectiveDate" TIMESTAMP(3),
  "retrievalDate" TIMESTAMP(3),
  "checksum" VARCHAR(128),
  "clinicalSetting" VARCHAR(64),
  "language" VARCHAR(16) NOT NULL DEFAULT 'en',
  "acquisitionStatus" VARCHAR(48) NOT NULL DEFAULT 'REGISTERED',
  "redistributesFullText" BOOLEAN NOT NULL DEFAULT false,
  "containsCredentials" BOOLEAN NOT NULL DEFAULT false,
  "createdByUserId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MedicationEvidenceSourceRegistration_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MedicationEvidenceSourceRegistration_batch_fkey"
    FOREIGN KEY ("batchId") REFERENCES "MedicationEvidenceAcquisitionBatch"("id")
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "MedicationEvidenceSourceRegistration_no_credentials_chk"
    CHECK ("containsCredentials" = false),
  CONSTRAINT "MedicationEvidenceSourceRegistration_no_fulltext_chk"
    CHECK ("redistributesFullText" = false)
);
CREATE UNIQUE INDEX IF NOT EXISTS "MedicationEvidenceSourceRegistration_registrationKey_key"
  ON "MedicationEvidenceSourceRegistration"("registrationKey");
CREATE INDEX IF NOT EXISTS "MedicationEvidenceSourceRegistration_batchId_idx"
  ON "MedicationEvidenceSourceRegistration"("batchId");
CREATE INDEX IF NOT EXISTS "MedicationEvidenceSourceRegistration_sourceTier_idx"
  ON "MedicationEvidenceSourceRegistration"("sourceTier");

CREATE TABLE IF NOT EXISTS "MedicationKnowledgeEvidenceLink" (
  "id" TEXT NOT NULL,
  "batchId" TEXT,
  "registrationId" TEXT NOT NULL,
  "familyKey" VARCHAR(128) NOT NULL,
  "canonicalConceptId" TEXT,
  "knowledgeDomain" VARCHAR(64) NOT NULL,
  "knowledgeRecordType" VARCHAR(64) NOT NULL,
  "knowledgeRecordId" TEXT NOT NULL,
  "evidenceLevel" VARCHAR(48),
  "citationSummary" TEXT,
  "retrievalDate" TIMESTAMP(3),
  "effectiveDate" TIMESTAMP(3),
  "linkStatus" VARCHAR(32) NOT NULL DEFAULT 'LINKED',
  "replacesPlaceholder" BOOLEAN NOT NULL DEFAULT false,
  "clinicalActivationAllowed" BOOLEAN NOT NULL DEFAULT false,
  "createdByUserId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MedicationKnowledgeEvidenceLink_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MedicationKnowledgeEvidenceLink_batch_fkey"
    FOREIGN KEY ("batchId") REFERENCES "MedicationEvidenceAcquisitionBatch"("id")
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "MedicationKnowledgeEvidenceLink_registration_fkey"
    FOREIGN KEY ("registrationId") REFERENCES "MedicationEvidenceSourceRegistration"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "MedicationKnowledgeEvidenceLink_activation_off_chk"
    CHECK ("clinicalActivationAllowed" = false)
);
CREATE UNIQUE INDEX IF NOT EXISTS "MedicationKnowledgeEvidenceLink_record_domain_reg_key"
  ON "MedicationKnowledgeEvidenceLink"("knowledgeRecordType", "knowledgeRecordId", "knowledgeDomain", "registrationId");
CREATE INDEX IF NOT EXISTS "MedicationKnowledgeEvidenceLink_familyKey_idx"
  ON "MedicationKnowledgeEvidenceLink"("familyKey");
CREATE INDEX IF NOT EXISTS "MedicationKnowledgeEvidenceLink_knowledgeRecordId_idx"
  ON "MedicationKnowledgeEvidenceLink"("knowledgeRecordId");

CREATE TABLE IF NOT EXISTS "MedicationKnowledgeCompletenessScore" (
  "id" TEXT NOT NULL,
  "batchId" TEXT,
  "familyKey" VARCHAR(128) NOT NULL,
  "canonicalConceptId" TEXT,
  "domainStatusesJson" JSONB NOT NULL,
  "overallScore" INTEGER NOT NULL DEFAULT 0,
  "provenanceScore" INTEGER NOT NULL DEFAULT 0,
  "clinicalScore" INTEGER NOT NULL DEFAULT 0,
  "safetyScore" INTEGER NOT NULL DEFAULT 0,
  "domainsComplete" INTEGER NOT NULL DEFAULT 0,
  "domainsTotal" INTEGER NOT NULL DEFAULT 0,
  "placeholdersRemaining" INTEGER NOT NULL DEFAULT 0,
  "evidenceLinkCount" INTEGER NOT NULL DEFAULT 0,
  "knowledgeWithoutProvenance" INTEGER NOT NULL DEFAULT 0,
  "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MedicationKnowledgeCompletenessScore_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MedicationKnowledgeCompletenessScore_batch_fkey"
    FOREIGN KEY ("batchId") REFERENCES "MedicationEvidenceAcquisitionBatch"("id")
    ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "MedicationKnowledgeCompletenessScore_batchId_idx"
  ON "MedicationKnowledgeCompletenessScore"("batchId");
CREATE INDEX IF NOT EXISTS "MedicationKnowledgeCompletenessScore_familyKey_idx"
  ON "MedicationKnowledgeCompletenessScore"("familyKey");
CREATE INDEX IF NOT EXISTS "MedicationKnowledgeCompletenessScore_overallScore_idx"
  ON "MedicationKnowledgeCompletenessScore"("overallScore");

CREATE TABLE IF NOT EXISTS "MedicationEvidenceGovernanceAuditEvent" (
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
  CONSTRAINT "MedicationEvidenceGovernanceAuditEvent_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MedicationEvidenceGovernanceAuditEvent_batch_fkey"
    FOREIGN KEY ("batchId") REFERENCES "MedicationEvidenceAcquisitionBatch"("id")
    ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "MedicationEvidenceGovernanceAuditEvent_batchId_idx"
  ON "MedicationEvidenceGovernanceAuditEvent"("batchId");
CREATE INDEX IF NOT EXISTS "MedicationEvidenceGovernanceAuditEvent_action_idx"
  ON "MedicationEvidenceGovernanceAuditEvent"("action");
