-- Additive nullable columns preserve integrations created by the P0.3A control plane.
-- Rollback note: Prisma deploy migrations are forward-only. An emergency manual
-- rollback would DROP the columns below (and permanently discard onboarding
-- metadata written after deployment), so application rollback should normally
-- leave these inert nullable columns in place.
ALTER TABLE "Integration"
  ADD COLUMN "organizationRegistrationId" VARCHAR(160),
  ADD COLUMN "website" VARCHAR(2048),
  ADD COLUMN "addressLine1" VARCHAR(200),
  ADD COLUMN "addressLine2" VARCHAR(200),
  ADD COLUMN "city" VARCHAR(120),
  ADD COLUMN "stateProvinceRegion" VARCHAR(120),
  ADD COLUMN "postalCode" VARCHAR(32),
  ADD COLUMN "country" VARCHAR(2),
  ADD COLUMN "primaryContactFirstName" VARCHAR(100),
  ADD COLUMN "primaryContactLastName" VARCHAR(100),
  ADD COLUMN "primaryContactJobTitle" VARCHAR(160),
  ADD COLUMN "primaryContactDepartment" VARCHAR(160),
  ADD COLUMN "primaryContactEmail" VARCHAR(254),
  ADD COLUMN "primaryContactPhone" VARCHAR(64),
  ADD COLUMN "primaryContactExtension" VARCHAR(20),
  ADD COLUMN "primaryContactMobile" VARCHAR(64),
  ADD COLUMN "technicalContactJobTitle" VARCHAR(160),
  ADD COLUMN "technicalContactExtension" VARCHAR(20),
  ADD COLUMN "technicalContactSameAsPrimary" BOOLEAN NOT NULL DEFAULT false;
