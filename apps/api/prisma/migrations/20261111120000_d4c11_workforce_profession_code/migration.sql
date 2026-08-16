-- MEDUI.D4C.11 — first-class workforce profession on facility membership.
-- Allows MEDICINE + DENTIST (both RoleCode.PROVIDER) as distinct assignments.

ALTER TABLE "UserRole" ADD COLUMN IF NOT EXISTS "professionCode" TEXT;

-- Backfill from RoleCode + Department before enforcing NOT NULL / unique.
UPDATE "UserRole" AS ur
SET "professionCode" = src.inferred
FROM (
  SELECT
    ur2.id,
    CASE
      WHEN r.code IN ('ADMIN', 'MEDORA_SUPER_ADMIN') THEN 'ADMINISTRATION'
      WHEN r.code = 'PROVIDER' AND d.code = 'DENTAL' THEN 'DENTIST'
      WHEN r.code = 'PROVIDER' THEN 'PROVIDER_UNSPECIFIED'
      WHEN r.code = 'RN' THEN 'NURSING'
      WHEN r.code = 'LAB' THEN 'TECHNICIAN'
      WHEN r.code = 'RADIOLOGY' THEN 'TECHNICIAN'
      WHEN r.code = 'PATIENT_CARE_TECH' AND d.code = 'DENTAL' THEN 'DENTAL_TECHNICIAN'
      WHEN r.code = 'PATIENT_CARE_TECH' THEN 'TECHNICIAN'
      WHEN r.code = 'PHARMACY' THEN 'PHARMACY'
      WHEN r.code = 'BILLING' THEN 'BILLING'
      WHEN r.code = 'FRONT_DESK' AND d.code = 'DENTAL' THEN 'DENTAL_ASSISTANT'
      WHEN r.code = 'FRONT_DESK' THEN 'FRONT_DESK'
      ELSE 'ADMINISTRATION'
    END AS inferred
  FROM "UserRole" ur2
  INNER JOIN "Role" r ON r.id = ur2."roleId"
  LEFT JOIN "Department" d ON d.id = ur2."departmentId"
) AS src
WHERE ur.id = src.id
  AND (ur."professionCode" IS NULL OR btrim(ur."professionCode") = '');

UPDATE "UserRole"
SET "professionCode" = 'ADMINISTRATION'
WHERE "professionCode" IS NULL OR btrim("professionCode") = '';

-- Disambiguate rare duplicates after backfill (same user/facility/profession).
WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY "userId", "facilityId", "professionCode"
      ORDER BY "isActive" DESC, "updatedAt" DESC, "createdAt" DESC
    ) AS rn
  FROM "UserRole"
)
UPDATE "UserRole" ur
SET "professionCode" = ur."professionCode" || '_LEGACY_' || substr(ur.id, 1, 8)
FROM ranked
WHERE ur.id = ranked.id
  AND ranked.rn > 1;

ALTER TABLE "UserRole" ALTER COLUMN "professionCode" SET NOT NULL;

DROP INDEX IF EXISTS "UserRole_userId_roleId_facilityId_key";
ALTER TABLE "UserRole" DROP CONSTRAINT IF EXISTS "UserRole_userId_roleId_facilityId_key";

CREATE UNIQUE INDEX IF NOT EXISTS "UserRole_userId_facilityId_professionCode_key"
  ON "UserRole"("userId", "facilityId", "professionCode");

CREATE INDEX IF NOT EXISTS "UserRole_professionCode_idx" ON "UserRole"("professionCode");
