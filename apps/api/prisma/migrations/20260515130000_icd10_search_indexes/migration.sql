-- Additive ICD-10 search indexes for full-catalog scale.
-- B-tree indexes match Prisma schema; trigram indexes support contains-style text predicates.

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS "Icd10DiagnosisCode_code_idx"
ON "Icd10DiagnosisCode"("code");

CREATE INDEX IF NOT EXISTS "Icd10DiagnosisCode_shortDescription_idx"
ON "Icd10DiagnosisCode"("shortDescription");

CREATE INDEX IF NOT EXISTS "Icd10DiagnosisCode_normalizedCode_isActive_idx"
ON "Icd10DiagnosisCode"("normalizedCode", "isActive");

CREATE INDEX IF NOT EXISTS "Icd10DiagnosisCode_shortDescription_trgm_idx"
ON "Icd10DiagnosisCode"
USING GIN ("shortDescription" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "Icd10DiagnosisCode_longDescription_trgm_idx"
ON "Icd10DiagnosisCode"
USING GIN ("longDescription" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "Icd10DiagnosisCode_searchText_trgm_idx"
ON "Icd10DiagnosisCode"
USING GIN ("searchText" gin_trgm_ops);
