-- MEDUI.PERFORMANCE.MEDICATION_RUNTIME_REMEDIATION.1
-- Additive catalog medication search indexes for provider search hot path.

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS "CatalogMedication_isActive_idx"
ON "CatalogMedication"("isActive");

CREATE INDEX IF NOT EXISTS "CatalogMedication_searchText_trgm_idx"
ON "CatalogMedication"
USING GIN ("searchText" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "CatalogMedication_name_trgm_idx"
ON "CatalogMedication"
USING GIN ("name" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "CatalogMedication_genericName_trgm_idx"
ON "CatalogMedication"
USING GIN ("genericName" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "CatalogMedication_displayNameEn_trgm_idx"
ON "CatalogMedication"
USING GIN ("displayNameEn" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "CatalogMedication_displayNameFr_trgm_idx"
ON "CatalogMedication"
USING GIN ("displayNameFr" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "MedicationAlias_alias_trgm_idx"
ON "MedicationAlias"
USING GIN ("alias" gin_trgm_ops);
