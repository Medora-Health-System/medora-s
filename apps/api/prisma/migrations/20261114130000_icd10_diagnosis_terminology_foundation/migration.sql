-- MEDUI.TRILANG.DX.P2.2 — durable ICD-10-CM terminology + search-alias foundation.
-- Additive only. Does not rewrite Diagnosis rows, overlay maps, billing codes, or canonical ICD identity.
-- pg_trgm is created by 20260515130000_icd10_search_indexes (must run before this GIN).
-- Ordered immediately after 20261114120000_cp1e_care_plan_clinical_author_snapshots.

CREATE TYPE "Icd10TerminologyLabelRegister" AS ENUM ('CLINICIAN_PREFERRED', 'CONSUMER');
CREATE TYPE "Icd10TerminologyProvenance" AS ENUM ('OFFICIAL_SOURCE', 'LICENSED_VENDOR', 'MEDORA_GOVERNED');
CREATE TYPE "Icd10TerminologyExactness" AS ENUM ('EXACT_SOURCE', 'EXACT_GOVERNED');
CREATE TYPE "Icd10TerminologyStatus" AS ENUM ('APPROVED', 'PENDING_REVIEW', 'REJECTED', 'SUPERSEDED');

CREATE UNIQUE INDEX "Icd10DiagnosisCode_identity_anchor_key"
ON "Icd10DiagnosisCode"("id", "codeSystem", "releaseVersion", "code");

CREATE TABLE "Icd10DiagnosisTerminology" (
    "id" TEXT NOT NULL,
    "icd10CatalogId" TEXT NOT NULL,
    "codeSystem" VARCHAR(32) NOT NULL,
    "releaseVersion" VARCHAR(32) NOT NULL,
    "code" TEXT NOT NULL,
    "normalizedCode" TEXT NOT NULL,
    "locale" VARCHAR(8) NOT NULL,
    "preferredLabel" TEXT NOT NULL,
    "labelRegister" "Icd10TerminologyLabelRegister" NOT NULL,
    "provenance" "Icd10TerminologyProvenance" NOT NULL,
    "exactness" "Icd10TerminologyExactness" NOT NULL,
    "sourceId" VARCHAR(128) NOT NULL,
    "terminologyVersion" VARCHAR(64) NOT NULL,
    "sourcePriority" INTEGER NOT NULL DEFAULT 100,
    "status" "Icd10TerminologyStatus" NOT NULL DEFAULT 'APPROVED',
    "isEffective" BOOLEAN NOT NULL DEFAULT FALSE,
    "reviewedAt" TIMESTAMP(3),
    "reviewedByUserId" TEXT,
    "sourceUpdatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Icd10DiagnosisTerminology_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Icd10DiagnosisTerminology_sourceId_nonempty" CHECK (char_length(btrim("sourceId")) > 0)
);

CREATE TABLE "Icd10DiagnosisSearchAlias" (
    "id" TEXT NOT NULL,
    "icd10CatalogId" TEXT NOT NULL,
    "codeSystem" VARCHAR(32) NOT NULL,
    "releaseVersion" VARCHAR(32) NOT NULL,
    "code" TEXT NOT NULL,
    "normalizedCode" TEXT NOT NULL,
    "locale" VARCHAR(8) NOT NULL,
    "aliasText" TEXT NOT NULL,
    "provenance" "Icd10TerminologyProvenance" NOT NULL,
    "sourceId" VARCHAR(128) NOT NULL,
    "terminologyVersion" VARCHAR(64) NOT NULL,
    "status" "Icd10TerminologyStatus" NOT NULL DEFAULT 'APPROVED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Icd10DiagnosisSearchAlias_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Icd10DiagnosisSearchAlias_sourceId_nonempty" CHECK (char_length(btrim("sourceId")) > 0)
);

-- Immutable source identity: class + sourceId + terminologyVersion.
-- Multiple licensed vendors AND multiple versions of the same source may coexist.
CREATE UNIQUE INDEX "Icd10DiagnosisTerminology_source_identity_key"
ON "Icd10DiagnosisTerminology"("codeSystem", "releaseVersion", "code", "locale", "labelRegister", "provenance", "sourceId", "terminologyVersion");

-- At most one effective clinician display label per canonical identity (separate from source uniqueness).
CREATE UNIQUE INDEX "Icd10DiagnosisTerminology_one_effective_clinician_preferred"
ON "Icd10DiagnosisTerminology"("codeSystem", "releaseVersion", "code", "locale")
WHERE "isEffective" = TRUE AND "labelRegister" = 'CLINICIAN_PREFERRED';

CREATE INDEX "Icd10DiagnosisTerminology_icd10CatalogId_idx"
ON "Icd10DiagnosisTerminology"("icd10CatalogId");

CREATE INDEX "Icd10DiagnosisTerminology_releaseVersion_locale_status_idx"
ON "Icd10DiagnosisTerminology"("releaseVersion", "locale", "status");

CREATE INDEX "Icd10DiagnosisTerminology_normalizedCode_locale_status_idx"
ON "Icd10DiagnosisTerminology"("normalizedCode", "locale", "status");

CREATE INDEX "Icd10DiagnosisTerminology_status_labelRegister_idx"
ON "Icd10DiagnosisTerminology"("status", "labelRegister");

CREATE INDEX "Icd10DiagnosisTerminology_isEffective_labelRegister_status_idx"
ON "Icd10DiagnosisTerminology"("isEffective", "labelRegister", "status");

CREATE INDEX "Icd10DiagnosisTerminology_sourceId_idx"
ON "Icd10DiagnosisTerminology"("sourceId");

CREATE INDEX "Icd10DiagnosisTerminology_preferredLabel_trgm_idx"
ON "Icd10DiagnosisTerminology" USING GIN ("preferredLabel" gin_trgm_ops);

CREATE UNIQUE INDEX "Icd10DiagnosisSearchAlias_identity_key"
ON "Icd10DiagnosisSearchAlias"("codeSystem", "releaseVersion", "code", "locale", "aliasText");

CREATE INDEX "Icd10DiagnosisSearchAlias_icd10CatalogId_idx"
ON "Icd10DiagnosisSearchAlias"("icd10CatalogId");

CREATE INDEX "Icd10DiagnosisSearchAlias_releaseVersion_locale_status_idx"
ON "Icd10DiagnosisSearchAlias"("releaseVersion", "locale", "status");

CREATE INDEX "Icd10DiagnosisSearchAlias_normalizedCode_locale_status_idx"
ON "Icd10DiagnosisSearchAlias"("normalizedCode", "locale", "status");

CREATE INDEX "Icd10DiagnosisSearchAlias_status_idx"
ON "Icd10DiagnosisSearchAlias"("status");

CREATE INDEX "Icd10DiagnosisSearchAlias_aliasText_trgm_idx"
ON "Icd10DiagnosisSearchAlias" USING GIN ("aliasText" gin_trgm_ops);

ALTER TABLE "Icd10DiagnosisTerminology"
  ADD CONSTRAINT "Icd10DxTerm_catalog_identity_fkey"
  FOREIGN KEY ("icd10CatalogId", "codeSystem", "releaseVersion", "code")
  REFERENCES "Icd10DiagnosisCode"("id", "codeSystem", "releaseVersion", "code")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Icd10DiagnosisSearchAlias"
  ADD CONSTRAINT "Icd10DxAlias_catalog_identity_fkey"
  FOREIGN KEY ("icd10CatalogId", "codeSystem", "releaseVersion", "code")
  REFERENCES "Icd10DiagnosisCode"("id", "codeSystem", "releaseVersion", "code")
  ON DELETE RESTRICT ON UPDATE CASCADE;
