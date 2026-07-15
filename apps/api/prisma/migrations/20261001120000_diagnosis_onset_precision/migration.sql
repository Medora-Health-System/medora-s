-- CreateEnum
CREATE TYPE "DiagnosisOnsetPrecision" AS ENUM ('UNKNOWN', 'DATE', 'DATETIME');

-- AlterTable
ALTER TABLE "Diagnosis" ADD COLUMN "onsetPrecision" "DiagnosisOnsetPrecision";

-- Backfill: existing rows with onsetDate → DATE (legacy stored calendar/date semantics);
-- rows without onsetDate remain null (treated as unknown at read time).
UPDATE "Diagnosis"
SET "onsetPrecision" = 'DATE'
WHERE "onsetDate" IS NOT NULL AND "onsetPrecision" IS NULL;
