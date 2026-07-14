-- Additive ICD-10-CM production catalog versioning (safe for historic Diagnosis FKs).
-- Preserves existing row IDs; does not delete catalog rows.

ALTER TABLE "Icd10DiagnosisCode" ADD COLUMN IF NOT EXISTS "isSelectable" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Icd10DiagnosisCode" ADD COLUMN IF NOT EXISTS "codeSystem" VARCHAR(32) NOT NULL DEFAULT 'ICD-10-CM';
ALTER TABLE "Icd10DiagnosisCode" ADD COLUMN IF NOT EXISTS "releaseVersion" VARCHAR(32) NOT NULL DEFAULT 'UNSPECIFIED';
ALTER TABLE "Icd10DiagnosisCode" ADD COLUMN IF NOT EXISTS "releaseYear" INTEGER;
ALTER TABLE "Icd10DiagnosisCode" ADD COLUMN IF NOT EXISTS "effectiveFrom" TIMESTAMP(3);
ALTER TABLE "Icd10DiagnosisCode" ADD COLUMN IF NOT EXISTS "effectiveTo" TIMESTAMP(3);
ALTER TABLE "Icd10DiagnosisCode" ADD COLUMN IF NOT EXISTS "requiresSeventhCharacter" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Icd10DiagnosisCode" ADD COLUMN IF NOT EXISTS "validSeventhCharacters" VARCHAR(32);
ALTER TABLE "Icd10DiagnosisCode" ADD COLUMN IF NOT EXISTS "sourceChecksum" VARCHAR(64);
ALTER TABLE "Icd10DiagnosisCode" ADD COLUMN IF NOT EXISTS "importedAt" TIMESTAMP(3);

-- Backfill release metadata from legacy sample/dev labels when present.
UPDATE "Icd10DiagnosisCode"
SET
  "releaseVersion" = COALESCE(NULLIF(TRIM("codeSetVersion"), ''), "releaseVersion"),
  "releaseYear" = COALESCE("releaseYear", "effectiveYear"),
  "isSelectable" = CASE WHEN "isBillable" = false THEN false ELSE "isSelectable" END
WHERE "releaseVersion" = 'UNSPECIFIED' OR "releaseYear" IS NULL OR "isBillable" = false;

-- Drop legacy single-code uniqueness so annual releases can coexist.
DROP INDEX IF EXISTS "Icd10DiagnosisCode_code_key";

CREATE UNIQUE INDEX IF NOT EXISTS "Icd10DiagnosisCode_release_code_key"
  ON "Icd10DiagnosisCode" ("codeSystem", "releaseVersion", "code");

CREATE INDEX IF NOT EXISTS "Icd10DiagnosisCode_isSelectable_idx"
  ON "Icd10DiagnosisCode" ("isSelectable");

CREATE INDEX IF NOT EXISTS "Icd10DiagnosisCode_releaseVersion_isActive_isSelectable_idx"
  ON "Icd10DiagnosisCode" ("releaseVersion", "isActive", "isSelectable");

CREATE INDEX IF NOT EXISTS "Icd10DiagnosisCode_effectiveFrom_effectiveTo_idx"
  ON "Icd10DiagnosisCode" ("effectiveFrom", "effectiveTo");
