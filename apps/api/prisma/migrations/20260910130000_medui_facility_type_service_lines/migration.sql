-- MEDUI.FACILITY.TYPE.1 — facility type and service-line governance (non-destructive).

-- Phase 1 created an unused `FacilityType` enum (never bound to a column). Rename to preserve history.
ALTER TYPE "FacilityType" RENAME TO "PublicHealthSiteType";

CREATE TYPE "FacilityType" AS ENUM (
  'HOSPITAL',
  'FREESTANDING_ER',
  'URGENT_CARE',
  'CLINIC',
  'OUTSIDE_LABORATORY',
  'OUTSIDE_RADIOLOGY',
  'OUTSIDE_PHARMACY'
);

ALTER TABLE "Facility" ADD COLUMN IF NOT EXISTS "facilityType" "FacilityType" NOT NULL DEFAULT 'CLINIC';
ALTER TABLE "Facility" ADD COLUMN IF NOT EXISTS "serviceLinesJson" JSONB;

-- Wayne Urgent Care Emergency Room and billing freestanding-ER sites.
UPDATE "Facility"
SET "facilityType" = 'FREESTANDING_ER'
WHERE "billingSiteType" = 'FREESTANDING_ER'
   OR name ILIKE '%Wayne%Urgent%'
   OR name ILIKE '%Wayne Urgent Care%';

-- Seed demo facilities remain clinics unless already classified above.
UPDATE "Facility"
SET "facilityType" = 'CLINIC'
WHERE code IN ('HT', 'DR')
  AND "facilityType" = 'CLINIC';

-- Hospital billing profile → hospital operational type when not already specialized.
UPDATE "Facility"
SET "facilityType" = 'HOSPITAL'
WHERE "billingSiteType" = 'HOSPITAL'
  AND "facilityType" = 'CLINIC';
