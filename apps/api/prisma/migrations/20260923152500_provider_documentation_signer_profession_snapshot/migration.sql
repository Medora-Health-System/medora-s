-- This migration runs before the historical signed-version table migration
-- (20261115120000_encounter_provider_documentation_versions) in fresh CI databases.
-- Add the snapshot column only if that table already exists (deployed databases).
DO $$
BEGIN
  IF to_regclass('public."EncounterProviderDocumentationVersion"') IS NOT NULL THEN
    ALTER TABLE "EncounterProviderDocumentationVersion"
      ADD COLUMN IF NOT EXISTS "signedByProfessionSnapshot" VARCHAR(80);
  END IF;
END
$$;
