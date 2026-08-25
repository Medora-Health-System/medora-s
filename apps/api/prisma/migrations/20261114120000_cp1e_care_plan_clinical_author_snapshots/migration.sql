-- MEDUI.CP.1E — Immutable clinical author attribution snapshots for EncounterCarePlan*.
-- Additive / nullable only. No backfill of historical display names.
-- Identity FKs (activatedByUserId, createdByUserId, authorUserId, …) remain authoritative.

ALTER TABLE "EncounterCarePlan"
  ADD COLUMN "activatedByDisplayNameSnapshot" TEXT,
  ADD COLUMN "activatedByProfessionalTitleSnapshot" TEXT;

ALTER TABLE "EncounterCarePlanComponent"
  ADD COLUMN "createdByDisplayNameSnapshot" TEXT,
  ADD COLUMN "createdByProfessionalTitleSnapshot" TEXT,
  ADD COLUMN "correctedByUserId" TEXT,
  ADD COLUMN "correctedByDisplayNameSnapshot" TEXT,
  ADD COLUMN "correctedByProfessionalTitleSnapshot" TEXT,
  ADD COLUMN "correctedAt" TIMESTAMP(3),
  ADD COLUMN "correctionReason" TEXT;

ALTER TABLE "EncounterCarePlanProgress"
  ADD COLUMN "authorDisplayNameSnapshot" TEXT,
  ADD COLUMN "authorProfessionalTitleSnapshot" TEXT;

ALTER TABLE "EncounterCarePlanReview"
  ADD COLUMN "reviewerDisplayNameSnapshot" TEXT,
  ADD COLUMN "reviewerProfessionalTitleSnapshot" TEXT;

ALTER TABLE "EncounterCarePlanTransition"
  ADD COLUMN "actorDisplayNameSnapshot" TEXT,
  ADD COLUMN "actorProfessionalTitleSnapshot" TEXT;

ALTER TABLE "EncounterCarePlanComponent"
  ADD CONSTRAINT "EncounterCarePlanComponent_correctedByUserId_fkey"
  FOREIGN KEY ("correctedByUserId") REFERENCES "User"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
