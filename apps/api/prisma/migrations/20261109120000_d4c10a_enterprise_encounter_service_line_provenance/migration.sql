-- MEDUI.D4C.10A — Enterprise Encounter service-line provenance (additive).
-- Prisma storage: String? validated by MedoraServiceLine shared registry (not Prisma enum).

ALTER TABLE "Encounter" ADD COLUMN IF NOT EXISTS "serviceLine" TEXT;

CREATE INDEX IF NOT EXISTS "Encounter_facilityId_patientId_status_serviceLine_idx"
  ON "Encounter"("facilityId", "patientId", "status", "serviceLine");

-- Deterministic historical backfill ONLY (do not invent CLINIC for all OUTPATIENT).

-- Dental: nursingAssessment.dentalServiceLineV1 tag
UPDATE "Encounter"
SET "serviceLine" = 'DENTAL'
WHERE "serviceLine" IS NULL
  AND "nursingAssessment" IS NOT NULL
  AND (
    "nursingAssessment"::text ILIKE '%dentalServiceLineV1%'
  );

-- Dental: operational roomLabel used by Dental start (product convention)
UPDATE "Encounter"
SET "serviceLine" = 'DENTAL'
WHERE "serviceLine" IS NULL
  AND UPPER(TRIM(COALESCE("roomLabel", ''))) = 'DENTAL';

-- Encounter type EMERGENCY
UPDATE "Encounter"
SET "serviceLine" = 'EMERGENCY'
WHERE "serviceLine" IS NULL
  AND "type" = 'EMERGENCY';

-- Encounter type URGENT_CARE
UPDATE "Encounter"
SET "serviceLine" = 'URGENT_CARE'
WHERE "serviceLine" IS NULL
  AND "type" = 'URGENT_CARE';

-- Inpatient observation billing class → OBSERVATION service line
UPDATE "Encounter"
SET "serviceLine" = 'OBSERVATION'
WHERE "serviceLine" IS NULL
  AND "type" = 'INPATIENT'
  AND "billingClassification" = 'OBSERVATION';

-- Remaining inpatient → MEDSURG (canonical hospital med-surg / direct admission mapping)
UPDATE "Encounter"
SET "serviceLine" = 'MEDSURG'
WHERE "serviceLine" IS NULL
  AND "type" = 'INPATIENT';

-- OUTPATIENT without dental provenance remains NULL (unknown / legacy).
