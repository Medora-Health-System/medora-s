ALTER TABLE "EncounterProviderAddendum"
  ADD COLUMN "signedVersionId" TEXT,
  ADD COLUMN "amendmentReason" TEXT;

ALTER TABLE "EncounterProviderAddendum"
  ADD CONSTRAINT "EncounterProviderAddendum_signedVersionId_fkey"
  FOREIGN KEY ("signedVersionId") REFERENCES "EncounterProviderDocumentationVersion"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "EncounterProviderAddendum_signedVersionId_idx"
  ON "EncounterProviderAddendum"("signedVersionId");
