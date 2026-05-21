-- Phase 19H — global medication baseline (Priority ER inventory), facility activation remains separate.

ALTER TABLE "MedicationProduct"
  ADD COLUMN IF NOT EXISTS "baselineAvailable" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "baselineSource" VARCHAR(48),
  ADD COLUMN IF NOT EXISTS "baselineSourceRowId" VARCHAR(128);

CREATE INDEX IF NOT EXISTS "MedicationProduct_baselineSource_idx"
  ON "MedicationProduct"("baselineSource");

CREATE INDEX IF NOT EXISTS "MedicationProduct_baselineAvailable_idx"
  ON "MedicationProduct"("baselineAvailable");

CREATE UNIQUE INDEX IF NOT EXISTS "MedicationProduct_baseline_source_row_unique"
  ON "MedicationProduct"("baselineSource", "baselineSourceRowId")
  WHERE "baselineSourceRowId" IS NOT NULL;
