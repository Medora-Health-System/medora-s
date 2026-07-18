-- Phase 9 — interaction / allergy / duplicate-therapy knowledge foundation.
-- Storage and governance only. clinicalActivationAllowed defaults false. No patient evaluation.

ALTER TABLE "MedicationTherapeuticClass"
  ADD COLUMN IF NOT EXISTS "codeSystem" VARCHAR(64),
  ADD COLUMN IF NOT EXISTS "normalizedName" VARCHAR(255),
  ADD COLUMN IF NOT EXISTS "displayNameFr" TEXT,
  ADD COLUMN IF NOT EXISTS "description" TEXT,
  ADD COLUMN IF NOT EXISTS "active" BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS "MedicationTherapeuticClass_active_idx"
  ON "MedicationTherapeuticClass"("active");
CREATE INDEX IF NOT EXISTS "MedicationTherapeuticClass_normalizedName_idx"
  ON "MedicationTherapeuticClass"("normalizedName");

CREATE TABLE IF NOT EXISTS "MedicationSafetyKnowledgeSource" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "sourceCode" VARCHAR(64) NOT NULL,
  "sourceType" VARCHAR(48) NOT NULL DEFAULT 'INTERNAL_CURATED',
  "publisher" TEXT,
  "sourceUrl" TEXT,
  "licenseReference" TEXT,
  "releaseVersion" VARCHAR(64),
  "publicationDate" TIMESTAMP(3),
  "effectiveDate" TIMESTAMP(3),
  "expirationDate" TIMESTAMP(3),
  "language" VARCHAR(16),
  "jurisdiction" VARCHAR(64),
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MedicationSafetyKnowledgeSource_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "MedicationSafetyKnowledgeSource_sourceCode_key"
  ON "MedicationSafetyKnowledgeSource"("sourceCode");
CREATE INDEX IF NOT EXISTS "MedicationSafetyKnowledgeSource_sourceType_idx"
  ON "MedicationSafetyKnowledgeSource"("sourceType");
CREATE INDEX IF NOT EXISTS "MedicationSafetyKnowledgeSource_active_idx"
  ON "MedicationSafetyKnowledgeSource"("active");

CREATE TABLE IF NOT EXISTS "MedicationSafetyKnowledgeVersion" (
  "id" TEXT NOT NULL,
  "sourceId" TEXT NOT NULL,
  "version" VARCHAR(64) NOT NULL,
  "releaseIdentifier" VARCHAR(128),
  "effectiveDate" TIMESTAMP(3),
  "importedAt" TIMESTAMP(3),
  "importedByUserId" TEXT,
  "checksum" VARCHAR(128),
  "status" VARCHAR(32) NOT NULL DEFAULT 'DRAFT',
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MedicationSafetyKnowledgeVersion_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "MedicationSafetyKnowledgeVersion_sourceId_version_key"
  ON "MedicationSafetyKnowledgeVersion"("sourceId", "version");
CREATE INDEX IF NOT EXISTS "MedicationSafetyKnowledgeVersion_status_idx"
  ON "MedicationSafetyKnowledgeVersion"("status");
CREATE INDEX IF NOT EXISTS "MedicationSafetyKnowledgeVersion_checksum_idx"
  ON "MedicationSafetyKnowledgeVersion"("checksum");

CREATE TABLE IF NOT EXISTS "MedicationTherapeuticClassMembership" (
  "id" TEXT NOT NULL,
  "medicationConceptId" TEXT,
  "medicationProductId" TEXT,
  "therapeuticClassId" TEXT NOT NULL,
  "membershipType" VARCHAR(48) NOT NULL,
  "sourceVersionId" TEXT NOT NULL,
  "status" VARCHAR(32) NOT NULL DEFAULT 'DRAFT',
  "reviewedByUserId" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "approvedByUserId" TEXT,
  "approvedAt" TIMESTAMP(3),
  "futureAlertEligible" BOOLEAN NOT NULL DEFAULT false,
  "clinicalActivationAllowed" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MedicationTherapeuticClassMembership_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "MedicationTherapeuticClassMembership_medicationConceptId_idx"
  ON "MedicationTherapeuticClassMembership"("medicationConceptId");
CREATE INDEX IF NOT EXISTS "MedicationTherapeuticClassMembership_medicationProductId_idx"
  ON "MedicationTherapeuticClassMembership"("medicationProductId");
CREATE INDEX IF NOT EXISTS "MedicationTherapeuticClassMembership_therapeuticClassId_idx"
  ON "MedicationTherapeuticClassMembership"("therapeuticClassId");
CREATE INDEX IF NOT EXISTS "MedicationTherapeuticClassMembership_sourceVersionId_idx"
  ON "MedicationTherapeuticClassMembership"("sourceVersionId");
CREATE INDEX IF NOT EXISTS "MedicationTherapeuticClassMembership_status_idx"
  ON "MedicationTherapeuticClassMembership"("status");
CREATE INDEX IF NOT EXISTS "MedicationTherapeuticClassMembership_clinicalActivationAllowed_idx"
  ON "MedicationTherapeuticClassMembership"("clinicalActivationAllowed");
CREATE UNIQUE INDEX IF NOT EXISTS "MedicationTherapeuticClassMembership_concept_class_type_version_key"
  ON "MedicationTherapeuticClassMembership"("medicationConceptId", "therapeuticClassId", "membershipType", "sourceVersionId")
  WHERE "medicationConceptId" IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "MedicationTherapeuticClassMembership_product_class_type_version_key"
  ON "MedicationTherapeuticClassMembership"("medicationProductId", "therapeuticClassId", "membershipType", "sourceVersionId")
  WHERE "medicationProductId" IS NOT NULL;

CREATE TABLE IF NOT EXISTS "MedicationDrugInteraction" (
  "id" TEXT NOT NULL,
  "subjectMedicationConceptId" TEXT,
  "objectMedicationConceptId" TEXT,
  "subjectMedicationProductId" TEXT,
  "objectMedicationProductId" TEXT,
  "normalizedPairKey" VARCHAR(512) NOT NULL,
  "directional" BOOLEAN NOT NULL DEFAULT false,
  "interactionScope" VARCHAR(48) NOT NULL,
  "interactionType" VARCHAR(48) NOT NULL,
  "severity" VARCHAR(32) NOT NULL,
  "clinicalSignificance" VARCHAR(32),
  "evidenceLevel" VARCHAR(48),
  "onset" VARCHAR(32),
  "mechanism" TEXT,
  "clinicalEffect" TEXT,
  "managementRecommendation" TEXT,
  "monitoringRecommendation" TEXT,
  "administrationSeparationMinutes" INTEGER,
  "contraindicatedCombination" BOOLEAN NOT NULL DEFAULT false,
  "emergencyContextNotesJson" JSONB,
  "futureAlertEligible" BOOLEAN NOT NULL DEFAULT false,
  "clinicalActivationAllowed" BOOLEAN NOT NULL DEFAULT false,
  "sourceVersionId" TEXT NOT NULL,
  "status" VARCHAR(32) NOT NULL DEFAULT 'DRAFT',
  "reviewedByUserId" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "approvedByUserId" TEXT,
  "approvedAt" TIMESTAMP(3),
  "effectiveDate" TIMESTAMP(3),
  "supersedesId" TEXT,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MedicationDrugInteraction_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "MedicationDrugInteraction_normalizedPairKey_idx"
  ON "MedicationDrugInteraction"("normalizedPairKey");
CREATE INDEX IF NOT EXISTS "MedicationDrugInteraction_sourceVersionId_idx"
  ON "MedicationDrugInteraction"("sourceVersionId");
CREATE INDEX IF NOT EXISTS "MedicationDrugInteraction_status_idx"
  ON "MedicationDrugInteraction"("status");
CREATE INDEX IF NOT EXISTS "MedicationDrugInteraction_severity_idx"
  ON "MedicationDrugInteraction"("severity");
CREATE INDEX IF NOT EXISTS "MedicationDrugInteraction_directional_idx"
  ON "MedicationDrugInteraction"("directional");
CREATE INDEX IF NOT EXISTS "MedicationDrugInteraction_futureAlertEligible_idx"
  ON "MedicationDrugInteraction"("futureAlertEligible");
CREATE INDEX IF NOT EXISTS "MedicationDrugInteraction_clinicalActivationAllowed_idx"
  ON "MedicationDrugInteraction"("clinicalActivationAllowed");
CREATE INDEX IF NOT EXISTS "MedicationDrugInteraction_subjectMedicationConceptId_idx"
  ON "MedicationDrugInteraction"("subjectMedicationConceptId");
CREATE INDEX IF NOT EXISTS "MedicationDrugInteraction_objectMedicationConceptId_idx"
  ON "MedicationDrugInteraction"("objectMedicationConceptId");
CREATE UNIQUE INDEX IF NOT EXISTS "MedicationDrugInteraction_active_pair_key"
  ON "MedicationDrugInteraction"("normalizedPairKey")
  WHERE "status" IN ('DRAFT', 'UNDER_REVIEW', 'APPROVED');

CREATE TABLE IF NOT EXISTS "MedicationDrugClassInteraction" (
  "id" TEXT NOT NULL,
  "medicationConceptId" TEXT,
  "medicationProductId" TEXT,
  "therapeuticClassId" TEXT NOT NULL,
  "normalizedIdentityKey" VARCHAR(512) NOT NULL,
  "directional" BOOLEAN NOT NULL DEFAULT false,
  "interactionType" VARCHAR(48) NOT NULL,
  "severity" VARCHAR(32) NOT NULL,
  "clinicalSignificance" VARCHAR(32),
  "evidenceLevel" VARCHAR(48),
  "mechanism" TEXT,
  "clinicalEffect" TEXT,
  "managementRecommendation" TEXT,
  "monitoringRecommendation" TEXT,
  "contraindicatedCombination" BOOLEAN NOT NULL DEFAULT false,
  "futureAlertEligible" BOOLEAN NOT NULL DEFAULT false,
  "clinicalActivationAllowed" BOOLEAN NOT NULL DEFAULT false,
  "sourceVersionId" TEXT NOT NULL,
  "status" VARCHAR(32) NOT NULL DEFAULT 'DRAFT',
  "reviewedByUserId" TEXT,
  "approvedByUserId" TEXT,
  "effectiveDate" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MedicationDrugClassInteraction_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "MedicationDrugClassInteraction_normalizedIdentityKey_idx"
  ON "MedicationDrugClassInteraction"("normalizedIdentityKey");
CREATE INDEX IF NOT EXISTS "MedicationDrugClassInteraction_therapeuticClassId_idx"
  ON "MedicationDrugClassInteraction"("therapeuticClassId");
CREATE INDEX IF NOT EXISTS "MedicationDrugClassInteraction_sourceVersionId_idx"
  ON "MedicationDrugClassInteraction"("sourceVersionId");
CREATE INDEX IF NOT EXISTS "MedicationDrugClassInteraction_status_idx"
  ON "MedicationDrugClassInteraction"("status");
CREATE INDEX IF NOT EXISTS "MedicationDrugClassInteraction_clinicalActivationAllowed_idx"
  ON "MedicationDrugClassInteraction"("clinicalActivationAllowed");
CREATE UNIQUE INDEX IF NOT EXISTS "MedicationDrugClassInteraction_active_identity_key"
  ON "MedicationDrugClassInteraction"("normalizedIdentityKey")
  WHERE "status" IN ('DRAFT', 'UNDER_REVIEW', 'APPROVED');

CREATE TABLE IF NOT EXISTS "MedicationClassInteraction" (
  "id" TEXT NOT NULL,
  "subjectClassId" TEXT NOT NULL,
  "objectClassId" TEXT NOT NULL,
  "normalizedPairKey" VARCHAR(512) NOT NULL,
  "directional" BOOLEAN NOT NULL DEFAULT false,
  "interactionType" VARCHAR(48) NOT NULL,
  "severity" VARCHAR(32) NOT NULL,
  "clinicalSignificance" VARCHAR(32),
  "evidenceLevel" VARCHAR(48),
  "mechanism" TEXT,
  "clinicalEffect" TEXT,
  "managementRecommendation" TEXT,
  "monitoringRecommendation" TEXT,
  "futureAlertEligible" BOOLEAN NOT NULL DEFAULT false,
  "clinicalActivationAllowed" BOOLEAN NOT NULL DEFAULT false,
  "sourceVersionId" TEXT NOT NULL,
  "status" VARCHAR(32) NOT NULL DEFAULT 'DRAFT',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MedicationClassInteraction_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "MedicationClassInteraction_normalizedPairKey_idx"
  ON "MedicationClassInteraction"("normalizedPairKey");
CREATE INDEX IF NOT EXISTS "MedicationClassInteraction_sourceVersionId_idx"
  ON "MedicationClassInteraction"("sourceVersionId");
CREATE INDEX IF NOT EXISTS "MedicationClassInteraction_status_idx"
  ON "MedicationClassInteraction"("status");
CREATE INDEX IF NOT EXISTS "MedicationClassInteraction_clinicalActivationAllowed_idx"
  ON "MedicationClassInteraction"("clinicalActivationAllowed");
CREATE UNIQUE INDEX IF NOT EXISTS "MedicationClassInteraction_active_pair_key"
  ON "MedicationClassInteraction"("normalizedPairKey")
  WHERE "status" IN ('DRAFT', 'UNDER_REVIEW', 'APPROVED');

CREATE TABLE IF NOT EXISTS "MedicationAllergenConcept" (
  "id" TEXT NOT NULL,
  "allergenType" VARCHAR(48) NOT NULL,
  "normalizedName" VARCHAR(255) NOT NULL,
  "displayName" TEXT NOT NULL,
  "displayNameFr" TEXT,
  "codeSystem" VARCHAR(64),
  "code" VARCHAR(64),
  "parentAllergenId" TEXT,
  "description" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MedicationAllergenConcept_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "MedicationAllergenConcept_allergenType_normalizedName_key"
  ON "MedicationAllergenConcept"("allergenType", "normalizedName");
CREATE INDEX IF NOT EXISTS "MedicationAllergenConcept_codeSystem_code_idx"
  ON "MedicationAllergenConcept"("codeSystem", "code");
CREATE INDEX IF NOT EXISTS "MedicationAllergenConcept_active_idx"
  ON "MedicationAllergenConcept"("active");

CREATE TABLE IF NOT EXISTS "MedicationAllergenMapping" (
  "id" TEXT NOT NULL,
  "allergenConceptId" TEXT NOT NULL,
  "medicationConceptId" TEXT,
  "medicationProductId" TEXT,
  "therapeuticClassId" TEXT,
  "relationshipType" VARCHAR(48) NOT NULL,
  "reactionKind" VARCHAR(48),
  "crossReactivityRisk" VARCHAR(32),
  "evidenceLevel" VARCHAR(48),
  "clinicalDescription" TEXT,
  "futureAlertEligible" BOOLEAN NOT NULL DEFAULT false,
  "clinicalActivationAllowed" BOOLEAN NOT NULL DEFAULT false,
  "sourceVersionId" TEXT NOT NULL,
  "status" VARCHAR(32) NOT NULL DEFAULT 'DRAFT',
  "reviewedByUserId" TEXT,
  "approvedByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MedicationAllergenMapping_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "MedicationAllergenMapping_allergenConceptId_idx"
  ON "MedicationAllergenMapping"("allergenConceptId");
CREATE INDEX IF NOT EXISTS "MedicationAllergenMapping_medicationConceptId_idx"
  ON "MedicationAllergenMapping"("medicationConceptId");
CREATE INDEX IF NOT EXISTS "MedicationAllergenMapping_medicationProductId_idx"
  ON "MedicationAllergenMapping"("medicationProductId");
CREATE INDEX IF NOT EXISTS "MedicationAllergenMapping_therapeuticClassId_idx"
  ON "MedicationAllergenMapping"("therapeuticClassId");
CREATE INDEX IF NOT EXISTS "MedicationAllergenMapping_sourceVersionId_idx"
  ON "MedicationAllergenMapping"("sourceVersionId");
CREATE INDEX IF NOT EXISTS "MedicationAllergenMapping_status_idx"
  ON "MedicationAllergenMapping"("status");
CREATE INDEX IF NOT EXISTS "MedicationAllergenMapping_clinicalActivationAllowed_idx"
  ON "MedicationAllergenMapping"("clinicalActivationAllowed");
CREATE UNIQUE INDEX IF NOT EXISTS "MedicationAllergenMapping_allergen_concept_rel_version_key"
  ON "MedicationAllergenMapping"("allergenConceptId", "medicationConceptId", "relationshipType", "sourceVersionId")
  WHERE "medicationConceptId" IS NOT NULL;

CREATE TABLE IF NOT EXISTS "MedicationAllergyCrossReactivityRule" (
  "id" TEXT NOT NULL,
  "sourceAllergenId" TEXT NOT NULL,
  "targetMedicationConceptId" TEXT,
  "targetMedicationProductId" TEXT,
  "targetTherapeuticClassId" TEXT,
  "normalizedIdentityKey" VARCHAR(512) NOT NULL,
  "riskLevel" VARCHAR(32) NOT NULL,
  "crossReactivityType" VARCHAR(48),
  "evidenceLevel" VARCHAR(48),
  "estimatedFrequency" VARCHAR(64),
  "clinicalDescription" TEXT,
  "managementRecommendation" TEXT,
  "futureAlertEligible" BOOLEAN NOT NULL DEFAULT false,
  "clinicalActivationAllowed" BOOLEAN NOT NULL DEFAULT false,
  "sourceVersionId" TEXT NOT NULL,
  "status" VARCHAR(32) NOT NULL DEFAULT 'DRAFT',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MedicationAllergyCrossReactivityRule_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "MedicationAllergyCrossReactivityRule_normalizedIdentityKey_idx"
  ON "MedicationAllergyCrossReactivityRule"("normalizedIdentityKey");
CREATE INDEX IF NOT EXISTS "MedicationAllergyCrossReactivityRule_sourceAllergenId_idx"
  ON "MedicationAllergyCrossReactivityRule"("sourceAllergenId");
CREATE INDEX IF NOT EXISTS "MedicationAllergyCrossReactivityRule_sourceVersionId_idx"
  ON "MedicationAllergyCrossReactivityRule"("sourceVersionId");
CREATE INDEX IF NOT EXISTS "MedicationAllergyCrossReactivityRule_status_idx"
  ON "MedicationAllergyCrossReactivityRule"("status");
CREATE INDEX IF NOT EXISTS "MedicationAllergyCrossReactivityRule_clinicalActivationAllowed_idx"
  ON "MedicationAllergyCrossReactivityRule"("clinicalActivationAllowed");
CREATE UNIQUE INDEX IF NOT EXISTS "MedicationAllergyCrossReactivityRule_active_identity_key"
  ON "MedicationAllergyCrossReactivityRule"("normalizedIdentityKey")
  WHERE "status" IN ('DRAFT', 'UNDER_REVIEW', 'APPROVED');

CREATE TABLE IF NOT EXISTS "MedicationDuplicateTherapyGroup" (
  "id" TEXT NOT NULL,
  "code" VARCHAR(64) NOT NULL,
  "normalizedName" VARCHAR(255) NOT NULL,
  "displayName" TEXT NOT NULL,
  "displayNameFr" TEXT,
  "description" TEXT,
  "severity" VARCHAR(32),
  "defaultClinicalSignificance" VARCHAR(32),
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MedicationDuplicateTherapyGroup_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "MedicationDuplicateTherapyGroup_code_key"
  ON "MedicationDuplicateTherapyGroup"("code");
CREATE INDEX IF NOT EXISTS "MedicationDuplicateTherapyGroup_normalizedName_idx"
  ON "MedicationDuplicateTherapyGroup"("normalizedName");
CREATE INDEX IF NOT EXISTS "MedicationDuplicateTherapyGroup_active_idx"
  ON "MedicationDuplicateTherapyGroup"("active");

CREATE TABLE IF NOT EXISTS "MedicationDuplicateTherapyMembership" (
  "id" TEXT NOT NULL,
  "duplicateTherapyGroupId" TEXT NOT NULL,
  "medicationConceptId" TEXT,
  "medicationProductId" TEXT,
  "ingredientConceptId" TEXT,
  "membershipRole" VARCHAR(48) NOT NULL,
  "sourceVersionId" TEXT NOT NULL,
  "status" VARCHAR(32) NOT NULL DEFAULT 'DRAFT',
  "futureAlertEligible" BOOLEAN NOT NULL DEFAULT false,
  "clinicalActivationAllowed" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MedicationDuplicateTherapyMembership_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "MedicationDuplicateTherapyMembership_duplicateTherapyGroupId_idx"
  ON "MedicationDuplicateTherapyMembership"("duplicateTherapyGroupId");
CREATE INDEX IF NOT EXISTS "MedicationDuplicateTherapyMembership_medicationConceptId_idx"
  ON "MedicationDuplicateTherapyMembership"("medicationConceptId");
CREATE INDEX IF NOT EXISTS "MedicationDuplicateTherapyMembership_medicationProductId_idx"
  ON "MedicationDuplicateTherapyMembership"("medicationProductId");
CREATE INDEX IF NOT EXISTS "MedicationDuplicateTherapyMembership_ingredientConceptId_idx"
  ON "MedicationDuplicateTherapyMembership"("ingredientConceptId");
CREATE INDEX IF NOT EXISTS "MedicationDuplicateTherapyMembership_sourceVersionId_idx"
  ON "MedicationDuplicateTherapyMembership"("sourceVersionId");
CREATE INDEX IF NOT EXISTS "MedicationDuplicateTherapyMembership_status_idx"
  ON "MedicationDuplicateTherapyMembership"("status");
CREATE INDEX IF NOT EXISTS "MedicationDuplicateTherapyMembership_clinicalActivationAllowed_idx"
  ON "MedicationDuplicateTherapyMembership"("clinicalActivationAllowed");
CREATE UNIQUE INDEX IF NOT EXISTS "MedicationDuplicateTherapyMembership_group_concept_role_version_key"
  ON "MedicationDuplicateTherapyMembership"("duplicateTherapyGroupId", "medicationConceptId", "membershipRole", "sourceVersionId")
  WHERE "medicationConceptId" IS NOT NULL;

CREATE TABLE IF NOT EXISTS "MedicationDuplicateTherapyRule" (
  "id" TEXT NOT NULL,
  "duplicateTherapyGroupId" TEXT NOT NULL,
  "ruleType" VARCHAR(64) NOT NULL,
  "severity" VARCHAR(32) NOT NULL,
  "clinicalSignificance" VARCHAR(32),
  "minimumDistinctMedications" INTEGER NOT NULL DEFAULT 2,
  "maximumRecommendedConcurrentAgents" INTEGER,
  "sameIngredientOnly" BOOLEAN NOT NULL DEFAULT false,
  "sameRouteOnly" BOOLEAN NOT NULL DEFAULT false,
  "sameDosageFormOnly" BOOLEAN NOT NULL DEFAULT false,
  "includeCombinationProducts" BOOLEAN NOT NULL DEFAULT true,
  "excludeTopicalProducts" BOOLEAN NOT NULL DEFAULT false,
  "excludeSingleAdministrationEmergencyUse" BOOLEAN NOT NULL DEFAULT false,
  "emergencyContextNotesJson" JSONB,
  "futureAlertEligible" BOOLEAN NOT NULL DEFAULT false,
  "clinicalActivationAllowed" BOOLEAN NOT NULL DEFAULT false,
  "sourceVersionId" TEXT NOT NULL,
  "status" VARCHAR(32) NOT NULL DEFAULT 'DRAFT',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MedicationDuplicateTherapyRule_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "MedicationDuplicateTherapyRule_duplicateTherapyGroupId_idx"
  ON "MedicationDuplicateTherapyRule"("duplicateTherapyGroupId");
CREATE INDEX IF NOT EXISTS "MedicationDuplicateTherapyRule_sourceVersionId_idx"
  ON "MedicationDuplicateTherapyRule"("sourceVersionId");
CREATE INDEX IF NOT EXISTS "MedicationDuplicateTherapyRule_status_idx"
  ON "MedicationDuplicateTherapyRule"("status");
CREATE INDEX IF NOT EXISTS "MedicationDuplicateTherapyRule_clinicalActivationAllowed_idx"
  ON "MedicationDuplicateTherapyRule"("clinicalActivationAllowed");

CREATE TABLE IF NOT EXISTS "MedicationSafetyEvidence" (
  "id" TEXT NOT NULL,
  "interactionId" TEXT,
  "allergenMappingId" TEXT,
  "crossReactivityRuleId" TEXT,
  "duplicateTherapyRuleId" TEXT,
  "citationType" VARCHAR(48),
  "citationReference" TEXT NOT NULL,
  "sourceUrl" TEXT,
  "publicationDate" TIMESTAMP(3),
  "evidenceLevel" VARCHAR(48),
  "evidenceSummary" TEXT,
  "language" VARCHAR(16),
  "sourceVersionId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MedicationSafetyEvidence_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "MedicationSafetyEvidence_interactionId_idx"
  ON "MedicationSafetyEvidence"("interactionId");
CREATE INDEX IF NOT EXISTS "MedicationSafetyEvidence_allergenMappingId_idx"
  ON "MedicationSafetyEvidence"("allergenMappingId");
CREATE INDEX IF NOT EXISTS "MedicationSafetyEvidence_crossReactivityRuleId_idx"
  ON "MedicationSafetyEvidence"("crossReactivityRuleId");
CREATE INDEX IF NOT EXISTS "MedicationSafetyEvidence_duplicateTherapyRuleId_idx"
  ON "MedicationSafetyEvidence"("duplicateTherapyRuleId");
CREATE INDEX IF NOT EXISTS "MedicationSafetyEvidence_sourceVersionId_idx"
  ON "MedicationSafetyEvidence"("sourceVersionId");

CREATE TABLE IF NOT EXISTS "MedicationSafetyKnowledgeAuditEvent" (
  "id" TEXT NOT NULL,
  "entityType" VARCHAR(64) NOT NULL,
  "entityId" TEXT NOT NULL,
  "action" VARCHAR(64) NOT NULL,
  "beforeState" JSONB,
  "afterState" JSONB,
  "performedByUserId" TEXT NOT NULL,
  "performedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reason" TEXT,
  "sourceIp" VARCHAR(64),
  "requestId" VARCHAR(128),
  "sourceVersionId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MedicationSafetyKnowledgeAuditEvent_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "MedicationSafetyKnowledgeAuditEvent_entityType_entityId_idx"
  ON "MedicationSafetyKnowledgeAuditEvent"("entityType", "entityId");
CREATE INDEX IF NOT EXISTS "MedicationSafetyKnowledgeAuditEvent_action_idx"
  ON "MedicationSafetyKnowledgeAuditEvent"("action");
CREATE INDEX IF NOT EXISTS "MedicationSafetyKnowledgeAuditEvent_performedByUserId_idx"
  ON "MedicationSafetyKnowledgeAuditEvent"("performedByUserId");
CREATE INDEX IF NOT EXISTS "MedicationSafetyKnowledgeAuditEvent_performedAt_idx"
  ON "MedicationSafetyKnowledgeAuditEvent"("performedAt");
CREATE INDEX IF NOT EXISTS "MedicationSafetyKnowledgeAuditEvent_sourceVersionId_idx"
  ON "MedicationSafetyKnowledgeAuditEvent"("sourceVersionId");

-- Foreign keys (RESTRICT / SET NULL; never CASCADE to medication identity).
ALTER TABLE "MedicationSafetyKnowledgeVersion"
  DROP CONSTRAINT IF EXISTS "MedicationSafetyKnowledgeVersion_sourceId_fkey";
ALTER TABLE "MedicationSafetyKnowledgeVersion"
  ADD CONSTRAINT "MedicationSafetyKnowledgeVersion_sourceId_fkey"
  FOREIGN KEY ("sourceId") REFERENCES "MedicationSafetyKnowledgeSource"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "MedicationTherapeuticClassMembership"
  DROP CONSTRAINT IF EXISTS "MedicationTherapeuticClassMembership_medicationConceptId_fkey";
ALTER TABLE "MedicationTherapeuticClassMembership"
  ADD CONSTRAINT "MedicationTherapeuticClassMembership_medicationConceptId_fkey"
  FOREIGN KEY ("medicationConceptId") REFERENCES "MedicationConcept"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MedicationTherapeuticClassMembership"
  DROP CONSTRAINT IF EXISTS "MedicationTherapeuticClassMembership_medicationProductId_fkey";
ALTER TABLE "MedicationTherapeuticClassMembership"
  ADD CONSTRAINT "MedicationTherapeuticClassMembership_medicationProductId_fkey"
  FOREIGN KEY ("medicationProductId") REFERENCES "MedicationProduct"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MedicationTherapeuticClassMembership"
  DROP CONSTRAINT IF EXISTS "MedicationTherapeuticClassMembership_therapeuticClassId_fkey";
ALTER TABLE "MedicationTherapeuticClassMembership"
  ADD CONSTRAINT "MedicationTherapeuticClassMembership_therapeuticClassId_fkey"
  FOREIGN KEY ("therapeuticClassId") REFERENCES "MedicationTherapeuticClass"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MedicationTherapeuticClassMembership"
  DROP CONSTRAINT IF EXISTS "MedicationTherapeuticClassMembership_sourceVersionId_fkey";
ALTER TABLE "MedicationTherapeuticClassMembership"
  ADD CONSTRAINT "MedicationTherapeuticClassMembership_sourceVersionId_fkey"
  FOREIGN KEY ("sourceVersionId") REFERENCES "MedicationSafetyKnowledgeVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "MedicationDrugInteraction"
  DROP CONSTRAINT IF EXISTS "MedicationDrugInteraction_subjectMedicationConceptId_fkey";
ALTER TABLE "MedicationDrugInteraction"
  ADD CONSTRAINT "MedicationDrugInteraction_subjectMedicationConceptId_fkey"
  FOREIGN KEY ("subjectMedicationConceptId") REFERENCES "MedicationConcept"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MedicationDrugInteraction"
  DROP CONSTRAINT IF EXISTS "MedicationDrugInteraction_objectMedicationConceptId_fkey";
ALTER TABLE "MedicationDrugInteraction"
  ADD CONSTRAINT "MedicationDrugInteraction_objectMedicationConceptId_fkey"
  FOREIGN KEY ("objectMedicationConceptId") REFERENCES "MedicationConcept"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MedicationDrugInteraction"
  DROP CONSTRAINT IF EXISTS "MedicationDrugInteraction_subjectMedicationProductId_fkey";
ALTER TABLE "MedicationDrugInteraction"
  ADD CONSTRAINT "MedicationDrugInteraction_subjectMedicationProductId_fkey"
  FOREIGN KEY ("subjectMedicationProductId") REFERENCES "MedicationProduct"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MedicationDrugInteraction"
  DROP CONSTRAINT IF EXISTS "MedicationDrugInteraction_objectMedicationProductId_fkey";
ALTER TABLE "MedicationDrugInteraction"
  ADD CONSTRAINT "MedicationDrugInteraction_objectMedicationProductId_fkey"
  FOREIGN KEY ("objectMedicationProductId") REFERENCES "MedicationProduct"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MedicationDrugInteraction"
  DROP CONSTRAINT IF EXISTS "MedicationDrugInteraction_sourceVersionId_fkey";
ALTER TABLE "MedicationDrugInteraction"
  ADD CONSTRAINT "MedicationDrugInteraction_sourceVersionId_fkey"
  FOREIGN KEY ("sourceVersionId") REFERENCES "MedicationSafetyKnowledgeVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MedicationDrugInteraction"
  DROP CONSTRAINT IF EXISTS "MedicationDrugInteraction_supersedesId_fkey";
ALTER TABLE "MedicationDrugInteraction"
  ADD CONSTRAINT "MedicationDrugInteraction_supersedesId_fkey"
  FOREIGN KEY ("supersedesId") REFERENCES "MedicationDrugInteraction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "MedicationDrugClassInteraction"
  DROP CONSTRAINT IF EXISTS "MedicationDrugClassInteraction_medicationConceptId_fkey";
ALTER TABLE "MedicationDrugClassInteraction"
  ADD CONSTRAINT "MedicationDrugClassInteraction_medicationConceptId_fkey"
  FOREIGN KEY ("medicationConceptId") REFERENCES "MedicationConcept"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MedicationDrugClassInteraction"
  DROP CONSTRAINT IF EXISTS "MedicationDrugClassInteraction_medicationProductId_fkey";
ALTER TABLE "MedicationDrugClassInteraction"
  ADD CONSTRAINT "MedicationDrugClassInteraction_medicationProductId_fkey"
  FOREIGN KEY ("medicationProductId") REFERENCES "MedicationProduct"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MedicationDrugClassInteraction"
  DROP CONSTRAINT IF EXISTS "MedicationDrugClassInteraction_therapeuticClassId_fkey";
ALTER TABLE "MedicationDrugClassInteraction"
  ADD CONSTRAINT "MedicationDrugClassInteraction_therapeuticClassId_fkey"
  FOREIGN KEY ("therapeuticClassId") REFERENCES "MedicationTherapeuticClass"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MedicationDrugClassInteraction"
  DROP CONSTRAINT IF EXISTS "MedicationDrugClassInteraction_sourceVersionId_fkey";
ALTER TABLE "MedicationDrugClassInteraction"
  ADD CONSTRAINT "MedicationDrugClassInteraction_sourceVersionId_fkey"
  FOREIGN KEY ("sourceVersionId") REFERENCES "MedicationSafetyKnowledgeVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "MedicationClassInteraction"
  DROP CONSTRAINT IF EXISTS "MedicationClassInteraction_subjectClassId_fkey";
ALTER TABLE "MedicationClassInteraction"
  ADD CONSTRAINT "MedicationClassInteraction_subjectClassId_fkey"
  FOREIGN KEY ("subjectClassId") REFERENCES "MedicationTherapeuticClass"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MedicationClassInteraction"
  DROP CONSTRAINT IF EXISTS "MedicationClassInteraction_objectClassId_fkey";
ALTER TABLE "MedicationClassInteraction"
  ADD CONSTRAINT "MedicationClassInteraction_objectClassId_fkey"
  FOREIGN KEY ("objectClassId") REFERENCES "MedicationTherapeuticClass"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MedicationClassInteraction"
  DROP CONSTRAINT IF EXISTS "MedicationClassInteraction_sourceVersionId_fkey";
ALTER TABLE "MedicationClassInteraction"
  ADD CONSTRAINT "MedicationClassInteraction_sourceVersionId_fkey"
  FOREIGN KEY ("sourceVersionId") REFERENCES "MedicationSafetyKnowledgeVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "MedicationAllergenConcept"
  DROP CONSTRAINT IF EXISTS "MedicationAllergenConcept_parentAllergenId_fkey";
ALTER TABLE "MedicationAllergenConcept"
  ADD CONSTRAINT "MedicationAllergenConcept_parentAllergenId_fkey"
  FOREIGN KEY ("parentAllergenId") REFERENCES "MedicationAllergenConcept"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "MedicationAllergenMapping"
  DROP CONSTRAINT IF EXISTS "MedicationAllergenMapping_allergenConceptId_fkey";
ALTER TABLE "MedicationAllergenMapping"
  ADD CONSTRAINT "MedicationAllergenMapping_allergenConceptId_fkey"
  FOREIGN KEY ("allergenConceptId") REFERENCES "MedicationAllergenConcept"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MedicationAllergenMapping"
  DROP CONSTRAINT IF EXISTS "MedicationAllergenMapping_medicationConceptId_fkey";
ALTER TABLE "MedicationAllergenMapping"
  ADD CONSTRAINT "MedicationAllergenMapping_medicationConceptId_fkey"
  FOREIGN KEY ("medicationConceptId") REFERENCES "MedicationConcept"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MedicationAllergenMapping"
  DROP CONSTRAINT IF EXISTS "MedicationAllergenMapping_medicationProductId_fkey";
ALTER TABLE "MedicationAllergenMapping"
  ADD CONSTRAINT "MedicationAllergenMapping_medicationProductId_fkey"
  FOREIGN KEY ("medicationProductId") REFERENCES "MedicationProduct"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MedicationAllergenMapping"
  DROP CONSTRAINT IF EXISTS "MedicationAllergenMapping_therapeuticClassId_fkey";
ALTER TABLE "MedicationAllergenMapping"
  ADD CONSTRAINT "MedicationAllergenMapping_therapeuticClassId_fkey"
  FOREIGN KEY ("therapeuticClassId") REFERENCES "MedicationTherapeuticClass"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MedicationAllergenMapping"
  DROP CONSTRAINT IF EXISTS "MedicationAllergenMapping_sourceVersionId_fkey";
ALTER TABLE "MedicationAllergenMapping"
  ADD CONSTRAINT "MedicationAllergenMapping_sourceVersionId_fkey"
  FOREIGN KEY ("sourceVersionId") REFERENCES "MedicationSafetyKnowledgeVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "MedicationAllergyCrossReactivityRule"
  DROP CONSTRAINT IF EXISTS "MedicationAllergyCrossReactivityRule_sourceAllergenId_fkey";
ALTER TABLE "MedicationAllergyCrossReactivityRule"
  ADD CONSTRAINT "MedicationAllergyCrossReactivityRule_sourceAllergenId_fkey"
  FOREIGN KEY ("sourceAllergenId") REFERENCES "MedicationAllergenConcept"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MedicationAllergyCrossReactivityRule"
  DROP CONSTRAINT IF EXISTS "MedicationAllergyCrossReactivityRule_targetMedicationConceptId_fkey";
ALTER TABLE "MedicationAllergyCrossReactivityRule"
  ADD CONSTRAINT "MedicationAllergyCrossReactivityRule_targetMedicationConceptId_fkey"
  FOREIGN KEY ("targetMedicationConceptId") REFERENCES "MedicationConcept"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MedicationAllergyCrossReactivityRule"
  DROP CONSTRAINT IF EXISTS "MedicationAllergyCrossReactivityRule_targetMedicationProductId_fkey";
ALTER TABLE "MedicationAllergyCrossReactivityRule"
  ADD CONSTRAINT "MedicationAllergyCrossReactivityRule_targetMedicationProductId_fkey"
  FOREIGN KEY ("targetMedicationProductId") REFERENCES "MedicationProduct"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MedicationAllergyCrossReactivityRule"
  DROP CONSTRAINT IF EXISTS "MedicationAllergyCrossReactivityRule_targetTherapeuticClassId_fkey";
ALTER TABLE "MedicationAllergyCrossReactivityRule"
  ADD CONSTRAINT "MedicationAllergyCrossReactivityRule_targetTherapeuticClassId_fkey"
  FOREIGN KEY ("targetTherapeuticClassId") REFERENCES "MedicationTherapeuticClass"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MedicationAllergyCrossReactivityRule"
  DROP CONSTRAINT IF EXISTS "MedicationAllergyCrossReactivityRule_sourceVersionId_fkey";
ALTER TABLE "MedicationAllergyCrossReactivityRule"
  ADD CONSTRAINT "MedicationAllergyCrossReactivityRule_sourceVersionId_fkey"
  FOREIGN KEY ("sourceVersionId") REFERENCES "MedicationSafetyKnowledgeVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "MedicationDuplicateTherapyMembership"
  DROP CONSTRAINT IF EXISTS "MedicationDuplicateTherapyMembership_duplicateTherapyGroupId_fkey";
ALTER TABLE "MedicationDuplicateTherapyMembership"
  ADD CONSTRAINT "MedicationDuplicateTherapyMembership_duplicateTherapyGroupId_fkey"
  FOREIGN KEY ("duplicateTherapyGroupId") REFERENCES "MedicationDuplicateTherapyGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MedicationDuplicateTherapyMembership"
  DROP CONSTRAINT IF EXISTS "MedicationDuplicateTherapyMembership_medicationConceptId_fkey";
ALTER TABLE "MedicationDuplicateTherapyMembership"
  ADD CONSTRAINT "MedicationDuplicateTherapyMembership_medicationConceptId_fkey"
  FOREIGN KEY ("medicationConceptId") REFERENCES "MedicationConcept"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MedicationDuplicateTherapyMembership"
  DROP CONSTRAINT IF EXISTS "MedicationDuplicateTherapyMembership_medicationProductId_fkey";
ALTER TABLE "MedicationDuplicateTherapyMembership"
  ADD CONSTRAINT "MedicationDuplicateTherapyMembership_medicationProductId_fkey"
  FOREIGN KEY ("medicationProductId") REFERENCES "MedicationProduct"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MedicationDuplicateTherapyMembership"
  DROP CONSTRAINT IF EXISTS "MedicationDuplicateTherapyMembership_sourceVersionId_fkey";
ALTER TABLE "MedicationDuplicateTherapyMembership"
  ADD CONSTRAINT "MedicationDuplicateTherapyMembership_sourceVersionId_fkey"
  FOREIGN KEY ("sourceVersionId") REFERENCES "MedicationSafetyKnowledgeVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "MedicationDuplicateTherapyRule"
  DROP CONSTRAINT IF EXISTS "MedicationDuplicateTherapyRule_duplicateTherapyGroupId_fkey";
ALTER TABLE "MedicationDuplicateTherapyRule"
  ADD CONSTRAINT "MedicationDuplicateTherapyRule_duplicateTherapyGroupId_fkey"
  FOREIGN KEY ("duplicateTherapyGroupId") REFERENCES "MedicationDuplicateTherapyGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MedicationDuplicateTherapyRule"
  DROP CONSTRAINT IF EXISTS "MedicationDuplicateTherapyRule_sourceVersionId_fkey";
ALTER TABLE "MedicationDuplicateTherapyRule"
  ADD CONSTRAINT "MedicationDuplicateTherapyRule_sourceVersionId_fkey"
  FOREIGN KEY ("sourceVersionId") REFERENCES "MedicationSafetyKnowledgeVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "MedicationSafetyEvidence"
  DROP CONSTRAINT IF EXISTS "MedicationSafetyEvidence_interactionId_fkey";
ALTER TABLE "MedicationSafetyEvidence"
  ADD CONSTRAINT "MedicationSafetyEvidence_interactionId_fkey"
  FOREIGN KEY ("interactionId") REFERENCES "MedicationDrugInteraction"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MedicationSafetyEvidence"
  DROP CONSTRAINT IF EXISTS "MedicationSafetyEvidence_allergenMappingId_fkey";
ALTER TABLE "MedicationSafetyEvidence"
  ADD CONSTRAINT "MedicationSafetyEvidence_allergenMappingId_fkey"
  FOREIGN KEY ("allergenMappingId") REFERENCES "MedicationAllergenMapping"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MedicationSafetyEvidence"
  DROP CONSTRAINT IF EXISTS "MedicationSafetyEvidence_crossReactivityRuleId_fkey";
ALTER TABLE "MedicationSafetyEvidence"
  ADD CONSTRAINT "MedicationSafetyEvidence_crossReactivityRuleId_fkey"
  FOREIGN KEY ("crossReactivityRuleId") REFERENCES "MedicationAllergyCrossReactivityRule"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MedicationSafetyEvidence"
  DROP CONSTRAINT IF EXISTS "MedicationSafetyEvidence_duplicateTherapyRuleId_fkey";
ALTER TABLE "MedicationSafetyEvidence"
  ADD CONSTRAINT "MedicationSafetyEvidence_duplicateTherapyRuleId_fkey"
  FOREIGN KEY ("duplicateTherapyRuleId") REFERENCES "MedicationDuplicateTherapyRule"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MedicationSafetyEvidence"
  DROP CONSTRAINT IF EXISTS "MedicationSafetyEvidence_sourceVersionId_fkey";
ALTER TABLE "MedicationSafetyEvidence"
  ADD CONSTRAINT "MedicationSafetyEvidence_sourceVersionId_fkey"
  FOREIGN KEY ("sourceVersionId") REFERENCES "MedicationSafetyKnowledgeVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "MedicationSafetyKnowledgeAuditEvent"
  DROP CONSTRAINT IF EXISTS "MedicationSafetyKnowledgeAuditEvent_sourceVersionId_fkey";
ALTER TABLE "MedicationSafetyKnowledgeAuditEvent"
  ADD CONSTRAINT "MedicationSafetyKnowledgeAuditEvent_sourceVersionId_fkey"
  FOREIGN KEY ("sourceVersionId") REFERENCES "MedicationSafetyKnowledgeVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
