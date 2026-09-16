-- Backfill one FacilityConfiguration row for every existing facility.
-- Empty JSON is parsed against the facility seed on first read; settingsJson is never NULL.
INSERT INTO "FacilityConfiguration" ("id", "facilityId", "revision", "settingsJson", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, f."id", 1, '{}'::jsonb, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "Facility" f
WHERE NOT EXISTS (
  SELECT 1 FROM "FacilityConfiguration" c WHERE c."facilityId" = f."id"
);
