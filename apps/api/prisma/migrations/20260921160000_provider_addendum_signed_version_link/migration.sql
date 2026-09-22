-- The signed-version table is created later in the migration history
-- (20261115120000_encounter_provider_documentation_versions). Add the
-- nullable link columns now, but defer the foreign key until the referenced
-- table exists so clean databases can replay the full migration chain.
ALTER TABLE "EncounterProviderAddendum"
  ADD COLUMN "signedVersionId" TEXT,
  ADD COLUMN "amendmentReason" TEXT;

CREATE INDEX "EncounterProviderAddendum_signedVersionId_idx"
  ON "EncounterProviderAddendum"("signedVersionId");
