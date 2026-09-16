-- Manual rollback for 20261117121500_facility_configuration_backfill.
-- Safe only before administrators have saved hospital-specific configuration.
-- Does not drop FacilityConfiguration / FacilityConfigurationRevision tables.
DELETE FROM "FacilityConfigurationRevision";
DELETE FROM "FacilityConfiguration" WHERE "revision" = 1 AND "updatedByUserId" IS NULL;
