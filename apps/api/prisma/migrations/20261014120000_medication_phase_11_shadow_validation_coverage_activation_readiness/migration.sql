-- Phase 11 — shadow safety validation, coverage analytics, pharmacist review, activation readiness.
-- Does NOT activate clinical alerts, block orders, or mutate clinical records.

CREATE TABLE IF NOT EXISTS "MedicationFamilyCoverageProfile" (
  "id" TEXT NOT NULL,
  "medicationFamilyKey" VARCHAR(128) NOT NULL,
  "canonicalConceptId" TEXT,
  "normalizedFamilyName" VARCHAR(255) NOT NULL,
  "displayName" VARCHAR(255) NOT NULL,
  "displayNameFr" VARCHAR(255),
  "emergencyMedicinePriority" INTEGER NOT NULL DEFAULT 0,
  "phase7ManifestItemId" TEXT,
  "activeProductCount" INTEGER NOT NULL DEFAULT 0,
  "activePackageCount" INTEGER NOT NULL DEFAULT 0,
  "catalogMedicationCount" INTEGER NOT NULL DEFAULT 0,
  "therapeuticClassCount" INTEGER NOT NULL DEFAULT 0,
  "approvedClinicalProfileCount" INTEGER NOT NULL DEFAULT 0,
  "approvedInteractionCount" INTEGER NOT NULL DEFAULT 0,
  "approvedAllergenMappingCount" INTEGER NOT NULL DEFAULT 0,
  "approvedCrossReactivityRuleCount" INTEGER NOT NULL DEFAULT 0,
  "duplicateTherapyMembershipCount" INTEGER NOT NULL DEFAULT 0,
  "renalKnowledgeAvailable" BOOLEAN NOT NULL DEFAULT false,
  "hepaticKnowledgeAvailable" BOOLEAN NOT NULL DEFAULT false,
  "pregnancyKnowledgeAvailable" BOOLEAN NOT NULL DEFAULT false,
  "lactationKnowledgeAvailable" BOOLEAN NOT NULL DEFAULT false,
  "administrationKnowledgeAvailable" BOOLEAN NOT NULL DEFAULT false,
  "monitoringKnowledgeAvailable" BOOLEAN NOT NULL DEFAULT false,
  "shadowEvaluable" BOOLEAN NOT NULL DEFAULT false,
  "coverageStatus" VARCHAR(48) NOT NULL DEFAULT 'NOT_STARTED',
  "coverageScore" DECIMAL(8,4),
  "criticalGatesJson" JSONB,
  "fixtureMarker" VARCHAR(64),
  "lastCalculatedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MedicationFamilyCoverageProfile_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "MedicationFamilyCoverageProfile_medicationFamilyKey_key"
  ON "MedicationFamilyCoverageProfile"("medicationFamilyKey");
CREATE INDEX IF NOT EXISTS "MedicationFamilyCoverageProfile_canonicalConceptId_idx"
  ON "MedicationFamilyCoverageProfile"("canonicalConceptId");
CREATE INDEX IF NOT EXISTS "MedicationFamilyCoverageProfile_coverageStatus_idx"
  ON "MedicationFamilyCoverageProfile"("coverageStatus");
CREATE INDEX IF NOT EXISTS "MedicationFamilyCoverageProfile_shadowEvaluable_idx"
  ON "MedicationFamilyCoverageProfile"("shadowEvaluable");
CREATE INDEX IF NOT EXISTS "MedicationFamilyCoverageProfile_emergencyMedicinePriority_idx"
  ON "MedicationFamilyCoverageProfile"("emergencyMedicinePriority");
CREATE INDEX IF NOT EXISTS "MedicationFamilyCoverageProfile_fixtureMarker_idx"
  ON "MedicationFamilyCoverageProfile"("fixtureMarker");
CREATE INDEX IF NOT EXISTS "MedicationFamilyCoverageProfile_lastCalculatedAt_idx"
  ON "MedicationFamilyCoverageProfile"("lastCalculatedAt");

CREATE TABLE IF NOT EXISTS "MedicationCoverageScore" (
  "id" TEXT NOT NULL,
  "familyCoverageProfileId" TEXT NOT NULL,
  "domain" VARCHAR(48) NOT NULL,
  "numerator" INTEGER NOT NULL DEFAULT 0,
  "denominator" INTEGER NOT NULL DEFAULT 1,
  "percentage" DECIMAL(8,4) NOT NULL,
  "weight" DECIMAL(8,4) NOT NULL,
  "weightedScore" DECIMAL(8,4) NOT NULL,
  "calculationVersion" VARCHAR(64) NOT NULL,
  "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MedicationCoverageScore_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MedicationCoverageScore_familyCoverageProfileId_fkey"
    FOREIGN KEY ("familyCoverageProfileId") REFERENCES "MedicationFamilyCoverageProfile"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "MedicationCoverageScore_family_domain_version_key"
  ON "MedicationCoverageScore"("familyCoverageProfileId", "domain", "calculationVersion");
CREATE INDEX IF NOT EXISTS "MedicationCoverageScore_familyCoverageProfileId_idx"
  ON "MedicationCoverageScore"("familyCoverageProfileId");
CREATE INDEX IF NOT EXISTS "MedicationCoverageScore_domain_idx"
  ON "MedicationCoverageScore"("domain");
CREATE INDEX IF NOT EXISTS "MedicationCoverageScore_calculatedAt_idx"
  ON "MedicationCoverageScore"("calculatedAt");

CREATE TABLE IF NOT EXISTS "MedicationSafetyValidationBatch" (
  "id" TEXT NOT NULL,
  "name" VARCHAR(255) NOT NULL,
  "description" TEXT,
  "batchType" VARCHAR(48) NOT NULL,
  "selectionCriteriaJson" JSONB,
  "targetFindingCount" INTEGER NOT NULL DEFAULT 0,
  "selectedFindingCount" INTEGER NOT NULL DEFAULT 0,
  "status" VARCHAR(32) NOT NULL DEFAULT 'DRAFT',
  "createdByUserId" TEXT NOT NULL,
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "lockedAt" TIMESTAMP(3),
  "engineVersion" VARCHAR(64),
  "knowledgeVersionIdsJson" JSONB,
  "evaluationRunIdsJson" JSONB,
  "fixtureMarker" VARCHAR(64),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MedicationSafetyValidationBatch_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "MedicationSafetyValidationBatch_status_idx"
  ON "MedicationSafetyValidationBatch"("status");
CREATE INDEX IF NOT EXISTS "MedicationSafetyValidationBatch_batchType_idx"
  ON "MedicationSafetyValidationBatch"("batchType");
CREATE INDEX IF NOT EXISTS "MedicationSafetyValidationBatch_createdByUserId_idx"
  ON "MedicationSafetyValidationBatch"("createdByUserId");
CREATE INDEX IF NOT EXISTS "MedicationSafetyValidationBatch_fixtureMarker_idx"
  ON "MedicationSafetyValidationBatch"("fixtureMarker");

CREATE TABLE IF NOT EXISTS "MedicationSafetyValidationCase" (
  "id" TEXT NOT NULL,
  "evaluationFindingId" TEXT NOT NULL,
  "evaluationRunId" TEXT NOT NULL,
  "patientContextSnapshotId" TEXT,
  "medicationFamilyCoverageProfileId" TEXT,
  "validationBatchId" TEXT,
  "findingType" VARCHAR(64) NOT NULL,
  "severity" VARCHAR(32),
  "clinicalSignificance" VARCHAR(32),
  "emergencyContext" VARCHAR(48),
  "validationPriority" VARCHAR(16) NOT NULL DEFAULT 'ROUTINE',
  "validationStatus" VARCHAR(32) NOT NULL DEFAULT 'UNASSIGNED',
  "requiresDualReview" BOOLEAN NOT NULL DEFAULT false,
  "requiresAdjudication" BOOLEAN NOT NULL DEFAULT false,
  "blindReviewEnabled" BOOLEAN NOT NULL DEFAULT true,
  "assignedReviewerCount" INTEGER NOT NULL DEFAULT 0,
  "completedReviewerCount" INTEGER NOT NULL DEFAULT 0,
  "finalClassification" VARCHAR(48),
  "finalSeverity" VARCHAR(32),
  "fixtureMarker" VARCHAR(64),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MedicationSafetyValidationCase_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MedicationSafetyValidationCase_family_fkey"
    FOREIGN KEY ("medicationFamilyCoverageProfileId") REFERENCES "MedicationFamilyCoverageProfile"("id")
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "MedicationSafetyValidationCase_batch_fkey"
    FOREIGN KEY ("validationBatchId") REFERENCES "MedicationSafetyValidationBatch"("id")
    ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "MedicationSafetyValidationCase_evaluationFindingId_key"
  ON "MedicationSafetyValidationCase"("evaluationFindingId");
CREATE INDEX IF NOT EXISTS "MedicationSafetyValidationCase_evaluationRunId_idx"
  ON "MedicationSafetyValidationCase"("evaluationRunId");
CREATE INDEX IF NOT EXISTS "MedicationSafetyValidationCase_validationStatus_idx"
  ON "MedicationSafetyValidationCase"("validationStatus");
CREATE INDEX IF NOT EXISTS "MedicationSafetyValidationCase_validationPriority_idx"
  ON "MedicationSafetyValidationCase"("validationPriority");
CREATE INDEX IF NOT EXISTS "MedicationSafetyValidationCase_findingType_idx"
  ON "MedicationSafetyValidationCase"("findingType");
CREATE INDEX IF NOT EXISTS "MedicationSafetyValidationCase_validationBatchId_idx"
  ON "MedicationSafetyValidationCase"("validationBatchId");
CREATE INDEX IF NOT EXISTS "MedicationSafetyValidationCase_family_idx"
  ON "MedicationSafetyValidationCase"("medicationFamilyCoverageProfileId");
CREATE INDEX IF NOT EXISTS "MedicationSafetyValidationCase_fixtureMarker_idx"
  ON "MedicationSafetyValidationCase"("fixtureMarker");

CREATE TABLE IF NOT EXISTS "MedicationSafetyValidationAssignment" (
  "id" TEXT NOT NULL,
  "validationCaseId" TEXT NOT NULL,
  "reviewerUserId" TEXT NOT NULL,
  "assignmentRole" VARCHAR(32) NOT NULL DEFAULT 'PRIMARY',
  "assignedByUserId" TEXT NOT NULL,
  "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MedicationSafetyValidationAssignment_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MedicationSafetyValidationAssignment_case_fkey"
    FOREIGN KEY ("validationCaseId") REFERENCES "MedicationSafetyValidationCase"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "MedicationSafetyValidationAssignment_case_reviewer_key"
  ON "MedicationSafetyValidationAssignment"("validationCaseId", "reviewerUserId");
CREATE INDEX IF NOT EXISTS "MedicationSafetyValidationAssignment_reviewerUserId_idx"
  ON "MedicationSafetyValidationAssignment"("reviewerUserId");
CREATE INDEX IF NOT EXISTS "MedicationSafetyValidationAssignment_assignmentRole_idx"
  ON "MedicationSafetyValidationAssignment"("assignmentRole");

CREATE TABLE IF NOT EXISTS "MedicationSafetyValidationReview" (
  "id" TEXT NOT NULL,
  "validationCaseId" TEXT NOT NULL,
  "reviewerUserId" TEXT NOT NULL,
  "reviewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "classification" VARCHAR(48) NOT NULL,
  "clinicalRelevance" VARCHAR(48),
  "severityAssessment" VARCHAR(32),
  "patientContextAssessment" VARCHAR(48),
  "knowledgeAssessment" VARCHAR(48),
  "engineAssessment" VARCHAR(48),
  "rationale" TEXT NOT NULL,
  "recommendedAction" TEXT,
  "confidence" VARCHAR(16) NOT NULL DEFAULT 'MODERATE',
  "lockedAt" TIMESTAMP(3),
  "fixtureMarker" VARCHAR(64),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MedicationSafetyValidationReview_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MedicationSafetyValidationReview_case_fkey"
    FOREIGN KEY ("validationCaseId") REFERENCES "MedicationSafetyValidationCase"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "MedicationSafetyValidationReview_case_reviewer_key"
  ON "MedicationSafetyValidationReview"("validationCaseId", "reviewerUserId");
CREATE INDEX IF NOT EXISTS "MedicationSafetyValidationReview_classification_idx"
  ON "MedicationSafetyValidationReview"("classification");
CREATE INDEX IF NOT EXISTS "MedicationSafetyValidationReview_reviewerUserId_idx"
  ON "MedicationSafetyValidationReview"("reviewerUserId");
CREATE INDEX IF NOT EXISTS "MedicationSafetyValidationReview_lockedAt_idx"
  ON "MedicationSafetyValidationReview"("lockedAt");

CREATE TABLE IF NOT EXISTS "MedicationSafetyValidationAdjudication" (
  "id" TEXT NOT NULL,
  "validationCaseId" TEXT NOT NULL,
  "reviewAgreement" BOOLEAN NOT NULL DEFAULT false,
  "classificationAgreement" BOOLEAN NOT NULL DEFAULT false,
  "severityAgreement" BOOLEAN NOT NULL DEFAULT false,
  "adjudicationRequired" BOOLEAN NOT NULL DEFAULT true,
  "finalClassification" VARCHAR(48),
  "finalSeverity" VARCHAR(32),
  "adjudicatedByUserId" TEXT,
  "adjudicatedAt" TIMESTAMP(3),
  "adjudicationRationale" TEXT,
  "status" VARCHAR(32) NOT NULL DEFAULT 'OPEN',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MedicationSafetyValidationAdjudication_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MedicationSafetyValidationAdjudication_case_fkey"
    FOREIGN KEY ("validationCaseId") REFERENCES "MedicationSafetyValidationCase"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "MedicationSafetyValidationAdjudication_validationCaseId_key"
  ON "MedicationSafetyValidationAdjudication"("validationCaseId");
CREATE INDEX IF NOT EXISTS "MedicationSafetyValidationAdjudication_status_idx"
  ON "MedicationSafetyValidationAdjudication"("status");
CREATE INDEX IF NOT EXISTS "MedicationSafetyValidationAdjudication_adjudicatedByUserId_idx"
  ON "MedicationSafetyValidationAdjudication"("adjudicatedByUserId");

CREATE TABLE IF NOT EXISTS "MedicationSafetyReferenceSet" (
  "id" TEXT NOT NULL,
  "code" VARCHAR(64) NOT NULL,
  "name" VARCHAR(255) NOT NULL,
  "description" TEXT,
  "version" VARCHAR(32) NOT NULL,
  "status" VARCHAR(32) NOT NULL DEFAULT 'DRAFT',
  "pharmacistApprovedBy" TEXT,
  "pharmacistApprovedAt" TIMESTAMP(3),
  "fixtureMarker" VARCHAR(64) NOT NULL DEFAULT 'MEDICATION_SAFETY_REFERENCE_FIXTURE',
  "isValidationContent" BOOLEAN NOT NULL DEFAULT true,
  "excludedFromProductionAnalytics" BOOLEAN NOT NULL DEFAULT true,
  "createdByUserId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MedicationSafetyReferenceSet_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "MedicationSafetyReferenceSet_code_key"
  ON "MedicationSafetyReferenceSet"("code");
CREATE INDEX IF NOT EXISTS "MedicationSafetyReferenceSet_status_idx"
  ON "MedicationSafetyReferenceSet"("status");
CREATE INDEX IF NOT EXISTS "MedicationSafetyReferenceSet_fixtureMarker_idx"
  ON "MedicationSafetyReferenceSet"("fixtureMarker");

CREATE TABLE IF NOT EXISTS "MedicationSafetyReferenceCase" (
  "id" TEXT NOT NULL,
  "referenceSetId" TEXT NOT NULL,
  "caseKey" VARCHAR(128) NOT NULL,
  "title" VARCHAR(255) NOT NULL,
  "description" TEXT,
  "syntheticContextJson" JSONB,
  "fixtureMarker" VARCHAR(64) NOT NULL DEFAULT 'MEDICATION_SAFETY_REFERENCE_FIXTURE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MedicationSafetyReferenceCase_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MedicationSafetyReferenceCase_set_fkey"
    FOREIGN KEY ("referenceSetId") REFERENCES "MedicationSafetyReferenceSet"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "MedicationSafetyReferenceCase_set_caseKey_key"
  ON "MedicationSafetyReferenceCase"("referenceSetId", "caseKey");
CREATE INDEX IF NOT EXISTS "MedicationSafetyReferenceCase_fixtureMarker_idx"
  ON "MedicationSafetyReferenceCase"("fixtureMarker");

CREATE TABLE IF NOT EXISTS "MedicationSafetyExpectedFinding" (
  "id" TEXT NOT NULL,
  "referenceCaseId" TEXT NOT NULL,
  "expectedFindingType" VARCHAR(64) NOT NULL,
  "expectedSeverity" VARCHAR(32),
  "expectedKnowledgeEntityType" VARCHAR(64),
  "expectedKnowledgeEntityId" TEXT,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MedicationSafetyExpectedFinding_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MedicationSafetyExpectedFinding_case_fkey"
    FOREIGN KEY ("referenceCaseId") REFERENCES "MedicationSafetyReferenceCase"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "MedicationSafetyExpectedFinding_referenceCaseId_idx"
  ON "MedicationSafetyExpectedFinding"("referenceCaseId");
CREATE INDEX IF NOT EXISTS "MedicationSafetyExpectedFinding_expectedFindingType_idx"
  ON "MedicationSafetyExpectedFinding"("expectedFindingType");
CREATE INDEX IF NOT EXISTS "MedicationSafetyExpectedFinding_expectedKnowledgeEntityId_idx"
  ON "MedicationSafetyExpectedFinding"("expectedKnowledgeEntityId");

CREATE TABLE IF NOT EXISTS "MedicationSafetyMissedFinding" (
  "id" TEXT NOT NULL,
  "referenceCaseId" TEXT NOT NULL,
  "expectedFindingId" TEXT,
  "expectedFindingType" VARCHAR(64) NOT NULL,
  "expectedKnowledgeEntityId" TEXT,
  "engineRunId" TEXT,
  "missReason" VARCHAR(48) NOT NULL,
  "identityResolved" BOOLEAN NOT NULL DEFAULT false,
  "knowledgeAvailable" BOOLEAN NOT NULL DEFAULT false,
  "patientContextAvailable" BOOLEAN NOT NULL DEFAULT false,
  "ruleEligible" BOOLEAN NOT NULL DEFAULT false,
  "engineEvaluated" BOOLEAN NOT NULL DEFAULT false,
  "fixtureMarker" VARCHAR(64),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MedicationSafetyMissedFinding_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MedicationSafetyMissedFinding_case_fkey"
    FOREIGN KEY ("referenceCaseId") REFERENCES "MedicationSafetyReferenceCase"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "MedicationSafetyMissedFinding_expected_fkey"
    FOREIGN KEY ("expectedFindingId") REFERENCES "MedicationSafetyExpectedFinding"("id")
    ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "MedicationSafetyMissedFinding_referenceCaseId_idx"
  ON "MedicationSafetyMissedFinding"("referenceCaseId");
CREATE INDEX IF NOT EXISTS "MedicationSafetyMissedFinding_engineRunId_idx"
  ON "MedicationSafetyMissedFinding"("engineRunId");
CREATE INDEX IF NOT EXISTS "MedicationSafetyMissedFinding_missReason_idx"
  ON "MedicationSafetyMissedFinding"("missReason");
CREATE INDEX IF NOT EXISTS "MedicationSafetyMissedFinding_expectedFindingType_idx"
  ON "MedicationSafetyMissedFinding"("expectedFindingType");

CREATE TABLE IF NOT EXISTS "MedicationKnowledgeGap" (
  "id" TEXT NOT NULL,
  "medicationFamilyCoverageProfileId" TEXT,
  "medicationConceptId" TEXT,
  "medicationProductId" TEXT,
  "gapType" VARCHAR(64) NOT NULL,
  "severity" VARCHAR(32) NOT NULL DEFAULT 'MODERATE',
  "sourceFindingId" TEXT,
  "sourceValidationCaseId" TEXT,
  "description" TEXT NOT NULL,
  "recommendedRemediation" TEXT,
  "status" VARCHAR(32) NOT NULL DEFAULT 'OPEN',
  "assignedToUserId" TEXT,
  "resolvedByUserId" TEXT,
  "resolvedAt" TIMESTAMP(3),
  "fixtureMarker" VARCHAR(64),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MedicationKnowledgeGap_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MedicationKnowledgeGap_family_fkey"
    FOREIGN KEY ("medicationFamilyCoverageProfileId") REFERENCES "MedicationFamilyCoverageProfile"("id")
    ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "MedicationKnowledgeGap_dedupe_key"
  ON "MedicationKnowledgeGap"("gapType", "medicationConceptId", "medicationProductId", "description");
CREATE INDEX IF NOT EXISTS "MedicationKnowledgeGap_status_idx"
  ON "MedicationKnowledgeGap"("status");
CREATE INDEX IF NOT EXISTS "MedicationKnowledgeGap_gapType_idx"
  ON "MedicationKnowledgeGap"("gapType");
CREATE INDEX IF NOT EXISTS "MedicationKnowledgeGap_family_idx"
  ON "MedicationKnowledgeGap"("medicationFamilyCoverageProfileId");
CREATE INDEX IF NOT EXISTS "MedicationKnowledgeGap_medicationConceptId_idx"
  ON "MedicationKnowledgeGap"("medicationConceptId");

CREATE TABLE IF NOT EXISTS "MedicationIdentityGap" (
  "id" TEXT NOT NULL,
  "sourceType" VARCHAR(48) NOT NULL,
  "sourceRecordId" TEXT,
  "description" TEXT NOT NULL,
  "status" VARCHAR(48) NOT NULL DEFAULT 'OPEN',
  "ambiguousSynonym" TEXT,
  "ambiguousStrength" TEXT,
  "ambiguousRoute" TEXT,
  "assignedToUserId" TEXT,
  "resolvedByUserId" TEXT,
  "resolvedAt" TIMESTAMP(3),
  "fixtureMarker" VARCHAR(64),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MedicationIdentityGap_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "MedicationIdentityGap_status_idx"
  ON "MedicationIdentityGap"("status");
CREATE INDEX IF NOT EXISTS "MedicationIdentityGap_sourceType_idx"
  ON "MedicationIdentityGap"("sourceType");
CREATE INDEX IF NOT EXISTS "MedicationIdentityGap_sourceRecordId_idx"
  ON "MedicationIdentityGap"("sourceRecordId");

CREATE TABLE IF NOT EXISTS "MedicationPatientContextGap" (
  "id" TEXT NOT NULL,
  "evaluationRunId" TEXT,
  "validationCaseId" TEXT,
  "patientIdHash" VARCHAR(128),
  "missingField" VARCHAR(64) NOT NULL,
  "description" TEXT NOT NULL,
  "status" VARCHAR(32) NOT NULL DEFAULT 'OPEN',
  "assignedToUserId" TEXT,
  "resolvedByUserId" TEXT,
  "resolvedAt" TIMESTAMP(3),
  "fixtureMarker" VARCHAR(64),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MedicationPatientContextGap_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "MedicationPatientContextGap_status_idx"
  ON "MedicationPatientContextGap"("status");
CREATE INDEX IF NOT EXISTS "MedicationPatientContextGap_missingField_idx"
  ON "MedicationPatientContextGap"("missingField");
CREATE INDEX IF NOT EXISTS "MedicationPatientContextGap_evaluationRunId_idx"
  ON "MedicationPatientContextGap"("evaluationRunId");
CREATE INDEX IF NOT EXISTS "MedicationPatientContextGap_validationCaseId_idx"
  ON "MedicationPatientContextGap"("validationCaseId");

CREATE TABLE IF NOT EXISTS "MedicationSafetyActivationReadinessPolicy" (
  "id" TEXT NOT NULL,
  "name" VARCHAR(255) NOT NULL,
  "version" VARCHAR(32) NOT NULL,
  "scope" VARCHAR(64) NOT NULL,
  "findingTypesJson" JSONB,
  "medicationFamiliesJson" JSONB,
  "minimumReviewedCases" INTEGER NOT NULL DEFAULT 200,
  "minimumDualReviewedCases" INTEGER NOT NULL DEFAULT 50,
  "minimumTruePositiveRate" DECIMAL(6,4) NOT NULL DEFAULT 0.90,
  "maximumFalsePositiveRate" DECIMAL(6,4) NOT NULL DEFAULT 0.10,
  "minimumEstimatedRecall" DECIMAL(6,4) NOT NULL DEFAULT 0.95,
  "maximumCriticalMisses" INTEGER NOT NULL DEFAULT 0,
  "maximumIdentityGapRate" DECIMAL(6,4) NOT NULL DEFAULT 0.01,
  "maximumContextGapRate" DECIMAL(6,4) NOT NULL DEFAULT 0.05,
  "maximumEvaluationFailureRate" DECIMAL(6,4) NOT NULL DEFAULT 0.005,
  "maximumP95LatencyMs" INTEGER NOT NULL DEFAULT 5000,
  "minimumSeverityAgreement" DECIMAL(6,4) NOT NULL DEFAULT 0.95,
  "minimumKnowledgeCoverage" DECIMAL(6,4) NOT NULL DEFAULT 0.95,
  "minimumFamilyCoverage" DECIMAL(6,4) NOT NULL DEFAULT 0.80,
  "requirePharmacistApproval" BOOLEAN NOT NULL DEFAULT true,
  "requireMedicalDirectorApproval" BOOLEAN NOT NULL DEFAULT true,
  "requireMedicationAdminApproval" BOOLEAN NOT NULL DEFAULT true,
  "providerFacingAlertsAllowed" BOOLEAN NOT NULL DEFAULT false,
  "orderBlockingAllowed" BOOLEAN NOT NULL DEFAULT false,
  "status" VARCHAR(32) NOT NULL DEFAULT 'DRAFT',
  "effectiveDate" TIMESTAMP(3),
  "createdByUserId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MedicationSafetyActivationReadinessPolicy_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MedicationSafetyActivationReadinessPolicy_alerts_off_chk"
    CHECK ("providerFacingAlertsAllowed" = false),
  CONSTRAINT "MedicationSafetyActivationReadinessPolicy_blocks_off_chk"
    CHECK ("orderBlockingAllowed" = false)
);
CREATE UNIQUE INDEX IF NOT EXISTS "MedicationSafetyActivationReadinessPolicy_name_version_key"
  ON "MedicationSafetyActivationReadinessPolicy"("name", "version");
CREATE INDEX IF NOT EXISTS "MedicationSafetyActivationReadinessPolicy_status_idx"
  ON "MedicationSafetyActivationReadinessPolicy"("status");
CREATE INDEX IF NOT EXISTS "MedicationSafetyActivationReadinessPolicy_scope_idx"
  ON "MedicationSafetyActivationReadinessPolicy"("scope");

CREATE TABLE IF NOT EXISTS "MedicationSafetyActivationReadinessAssessment" (
  "id" TEXT NOT NULL,
  "readinessPolicyId" TEXT NOT NULL,
  "scopeType" VARCHAR(48) NOT NULL,
  "scopeIdentifier" VARCHAR(128) NOT NULL,
  "engineVersion" VARCHAR(64) NOT NULL,
  "knowledgeVersionIdsJson" JSONB,
  "casesReviewed" INTEGER NOT NULL DEFAULT 0,
  "casesDualReviewed" INTEGER NOT NULL DEFAULT 0,
  "truePositiveRate" DECIMAL(8,4),
  "falsePositiveRate" DECIMAL(8,4),
  "estimatedRecall" DECIMAL(8,4),
  "criticalMisses" INTEGER NOT NULL DEFAULT 0,
  "severityAgreement" DECIMAL(8,4),
  "identityGapRate" DECIMAL(8,4),
  "contextGapRate" DECIMAL(8,4),
  "knowledgeCoverage" DECIMAL(8,4),
  "evaluationFailureRate" DECIMAL(8,4),
  "p95LatencyMs" INTEGER,
  "blockingCriteriaPassedJson" JSONB,
  "blockingCriteriaFailedJson" JSONB,
  "readinessResult" VARCHAR(48) NOT NULL DEFAULT 'NOT_ASSESSED',
  "sampleSource" VARCHAR(64) NOT NULL DEFAULT 'production-shadow-derived',
  "metricsJson" JSONB,
  "createdByUserId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MedicationSafetyActivationReadinessAssessment_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MedicationSafetyActivationReadinessAssessment_policy_fkey"
    FOREIGN KEY ("readinessPolicyId") REFERENCES "MedicationSafetyActivationReadinessPolicy"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "MedicationSafetyActivationReadinessAssessment_no_activation_chk"
    CHECK ("readinessResult" <> 'READY_FOR_ACTIVATION')
);
CREATE INDEX IF NOT EXISTS "MedicationSafetyActivationReadinessAssessment_policy_idx"
  ON "MedicationSafetyActivationReadinessAssessment"("readinessPolicyId");
CREATE INDEX IF NOT EXISTS "MedicationSafetyActivationReadinessAssessment_result_idx"
  ON "MedicationSafetyActivationReadinessAssessment"("readinessResult");
CREATE INDEX IF NOT EXISTS "MedicationSafetyActivationReadinessAssessment_scope_idx"
  ON "MedicationSafetyActivationReadinessAssessment"("scopeType", "scopeIdentifier");
CREATE INDEX IF NOT EXISTS "MedicationSafetyActivationReadinessAssessment_createdAt_idx"
  ON "MedicationSafetyActivationReadinessAssessment"("createdAt");

CREATE TABLE IF NOT EXISTS "MedicationSafetyActivationCandidate" (
  "id" TEXT NOT NULL,
  "scopeType" VARCHAR(48) NOT NULL,
  "scopeIdentifier" VARCHAR(128) NOT NULL,
  "findingTypesJson" JSONB,
  "medicationFamilyIdsJson" JSONB,
  "therapeuticClassIdsJson" JSONB,
  "emergencyContextsJson" JSONB,
  "engineVersion" VARCHAR(64) NOT NULL,
  "knowledgeVersionIdsJson" JSONB,
  "readinessPolicyId" TEXT,
  "assessmentId" TEXT,
  "candidateStatus" VARCHAR(48) NOT NULL DEFAULT 'NOT_READY',
  "recommendedFutureDisplayMode" VARCHAR(48),
  "recommendedFutureSeverityLevelsJson" JSONB,
  "recommendedFuturePilotPopulation" TEXT,
  "recommendedFutureFacilitiesJson" JSONB,
  "limitations" TEXT,
  "knownRisks" TEXT,
  "createdByUserId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MedicationSafetyActivationCandidate_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MedicationSafetyActivationCandidate_policy_fkey"
    FOREIGN KEY ("readinessPolicyId") REFERENCES "MedicationSafetyActivationReadinessPolicy"("id")
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "MedicationSafetyActivationCandidate_assessment_fkey"
    FOREIGN KEY ("assessmentId") REFERENCES "MedicationSafetyActivationReadinessAssessment"("id")
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "MedicationSafetyActivationCandidate_no_live_chk"
    CHECK ("candidateStatus" NOT IN ('ACTIVE', 'ENABLED', 'LIVE', 'PRODUCTION_ALERTING'))
);
CREATE INDEX IF NOT EXISTS "MedicationSafetyActivationCandidate_status_idx"
  ON "MedicationSafetyActivationCandidate"("candidateStatus");
CREATE INDEX IF NOT EXISTS "MedicationSafetyActivationCandidate_scope_idx"
  ON "MedicationSafetyActivationCandidate"("scopeType", "scopeIdentifier");
CREATE INDEX IF NOT EXISTS "MedicationSafetyActivationCandidate_policy_idx"
  ON "MedicationSafetyActivationCandidate"("readinessPolicyId");
CREATE INDEX IF NOT EXISTS "MedicationSafetyActivationCandidate_assessment_idx"
  ON "MedicationSafetyActivationCandidate"("assessmentId");

CREATE TABLE IF NOT EXISTS "MedicationSafetyActivationReadinessAttestation" (
  "id" TEXT NOT NULL,
  "assessmentId" TEXT NOT NULL,
  "policyId" TEXT NOT NULL,
  "scope" VARCHAR(128) NOT NULL,
  "result" VARCHAR(48) NOT NULL,
  "engineVersion" VARCHAR(64) NOT NULL,
  "knowledgeVersionIdsJson" JSONB,
  "reviewedByPharmacistUserId" TEXT,
  "reviewedByMedicalDirectorUserId" TEXT,
  "approvedByMedicationAdminUserId" TEXT NOT NULL,
  "attestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "limitations" TEXT,
  "unresolvedRisks" TEXT,
  "checksum" VARCHAR(128) NOT NULL,
  "providerFacingAlertsEnabled" BOOLEAN NOT NULL DEFAULT false,
  "orderBlockingEnabled" BOOLEAN NOT NULL DEFAULT false,
  "clinicalActivationPerformed" BOOLEAN NOT NULL DEFAULT false,
  "immutable" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MedicationSafetyActivationReadinessAttestation_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MedicationSafetyActivationReadinessAttestation_assessment_fkey"
    FOREIGN KEY ("assessmentId") REFERENCES "MedicationSafetyActivationReadinessAssessment"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "MedicationSafetyActivationReadinessAttestation_policy_fkey"
    FOREIGN KEY ("policyId") REFERENCES "MedicationSafetyActivationReadinessPolicy"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "MedicationSafetyActivationReadinessAttestation_alerts_off_chk"
    CHECK ("providerFacingAlertsEnabled" = false),
  CONSTRAINT "MedicationSafetyActivationReadinessAttestation_blocks_off_chk"
    CHECK ("orderBlockingEnabled" = false),
  CONSTRAINT "MedicationSafetyActivationReadinessAttestation_activation_off_chk"
    CHECK ("clinicalActivationPerformed" = false),
  CONSTRAINT "MedicationSafetyActivationReadinessAttestation_immutable_chk"
    CHECK ("immutable" = true)
);
CREATE INDEX IF NOT EXISTS "MedicationSafetyActivationReadinessAttestation_assessment_idx"
  ON "MedicationSafetyActivationReadinessAttestation"("assessmentId");
CREATE INDEX IF NOT EXISTS "MedicationSafetyActivationReadinessAttestation_policy_idx"
  ON "MedicationSafetyActivationReadinessAttestation"("policyId");
CREATE INDEX IF NOT EXISTS "MedicationSafetyActivationReadinessAttestation_attestedAt_idx"
  ON "MedicationSafetyActivationReadinessAttestation"("attestedAt");
CREATE INDEX IF NOT EXISTS "MedicationSafetyActivationReadinessAttestation_checksum_idx"
  ON "MedicationSafetyActivationReadinessAttestation"("checksum");

CREATE TABLE IF NOT EXISTS "MedicationSafetyValidationAuditEvent" (
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
  "identifiableAccess" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MedicationSafetyValidationAuditEvent_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "MedicationSafetyValidationAuditEvent_entity_idx"
  ON "MedicationSafetyValidationAuditEvent"("entityType", "entityId");
CREATE INDEX IF NOT EXISTS "MedicationSafetyValidationAuditEvent_action_idx"
  ON "MedicationSafetyValidationAuditEvent"("action");
CREATE INDEX IF NOT EXISTS "MedicationSafetyValidationAuditEvent_performedByUserId_idx"
  ON "MedicationSafetyValidationAuditEvent"("performedByUserId");
CREATE INDEX IF NOT EXISTS "MedicationSafetyValidationAuditEvent_performedAt_idx"
  ON "MedicationSafetyValidationAuditEvent"("performedAt");
CREATE INDEX IF NOT EXISTS "MedicationSafetyValidationAuditEvent_identifiableAccess_idx"
  ON "MedicationSafetyValidationAuditEvent"("identifiableAccess");
