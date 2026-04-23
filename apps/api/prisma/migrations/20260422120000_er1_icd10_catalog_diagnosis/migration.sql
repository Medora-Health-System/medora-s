-- ER-1: ICD-10-CM reference catalog + structured diagnosis ordering (additive).

CREATE TYPE "DiagnosisCodeSource" AS ENUM ('LEGACY', 'ICD10_CATALOG', 'MANUAL_DECLARED');

CREATE TABLE "Icd10DiagnosisCode" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "normalizedCode" TEXT NOT NULL,
    "shortDescription" TEXT NOT NULL,
    "longDescription" TEXT,
    "chapter" TEXT,
    "category" TEXT,
    "isBillable" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "effectiveYear" INTEGER,
    "codeSetVersion" VARCHAR(32),
    "searchText" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Icd10DiagnosisCode_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Icd10DiagnosisCode_code_key" ON "Icd10DiagnosisCode"("code");
CREATE INDEX "Icd10DiagnosisCode_normalizedCode_idx" ON "Icd10DiagnosisCode"("normalizedCode");
CREATE INDEX "Icd10DiagnosisCode_isActive_idx" ON "Icd10DiagnosisCode"("isActive");

ALTER TABLE "Diagnosis" ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Diagnosis" ADD COLUMN "icd10CatalogId" TEXT;
ALTER TABLE "Diagnosis" ADD COLUMN "codeSource" "DiagnosisCodeSource" NOT NULL DEFAULT 'LEGACY';

ALTER TABLE "Diagnosis" ADD CONSTRAINT "Diagnosis_icd10CatalogId_fkey" FOREIGN KEY ("icd10CatalogId") REFERENCES "Icd10DiagnosisCode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Diagnosis_encounterId_sortOrder_idx" ON "Diagnosis"("encounterId", "sortOrder");
CREATE INDEX "Diagnosis_icd10CatalogId_idx" ON "Diagnosis"("icd10CatalogId");

-- Preserve historical ordering: oldest diagnosis per encounter = lower sortOrder (principal-first default).
WITH ordered AS (
    SELECT "id", ROW_NUMBER() OVER (PARTITION BY "encounterId" ORDER BY "createdAt" ASC) - 1 AS rn
    FROM "Diagnosis"
)
UPDATE "Diagnosis" d
SET "sortOrder" = o.rn
FROM ordered o
WHERE d."id" = o."id";
