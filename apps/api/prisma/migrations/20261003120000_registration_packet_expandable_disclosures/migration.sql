-- Additive expandable disclosure fields + facility disclosure config.
-- Does not mutate EnterpriseDocumentPacketSource / signed PDF history.

CREATE TYPE "LegalContentReviewStatus" AS ENUM ('DRAFT', 'LEGAL_REVIEW', 'APPROVED', 'PUBLISHED', 'RETIRED');
CREATE TYPE "EmtalaApplicability" AS ENUM (
  'HOSPITAL_EMERGENCY_DEPARTMENT',
  'HOSPITAL_AFFILIATED_OFF_CAMPUS_ED',
  'INDEPENDENT_FREESTANDING_ER',
  'NOT_CONFIGURED'
);
CREATE TYPE "ParticipationStatus" AS ENUM ('PARTICIPATES', 'DOES_NOT_PARTICIPATE', 'NOT_CONFIGURED');

ALTER TABLE "RegistrationPacketSection"
  ADD COLUMN "conciseSummaryJson" JSONB,
  ADD COLUMN "fullBodyJson" JSONB,
  ADD COLUMN "sourceLabel" TEXT,
  ADD COLUMN "sourceUrl" TEXT,
  ADD COLUMN "authorityType" TEXT,
  ADD COLUMN "legalReviewStatus" "LegalContentReviewStatus" NOT NULL DEFAULT 'DRAFT',
  ADD COLUMN "legalReviewedBy" TEXT,
  ADD COLUMN "legalReviewedAt" TIMESTAMP(3),
  ADD COLUMN "effectiveFrom" TIMESTAMP(3),
  ADD COLUMN "effectiveTo" TIMESTAMP(3),
  ADD COLUMN "contentVersion" TEXT,
  ADD COLUMN "acknowledgmentRequired" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "acknowledgmentTextJson" JSONB,
  ADD COLUMN "separateSignatureRequired" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "pdfInclusionPolicy" TEXT DEFAULT 'FULL_BODY',
  ADD COLUMN "disclosureMetaJson" JSONB;

CREATE INDEX "RegistrationPacketSection_legalReviewStatus_idx"
  ON "RegistrationPacketSection"("legalReviewStatus");

CREATE TABLE "FacilityRegistrationDisclosureConfig" (
  "id" TEXT NOT NULL,
  "facilityId" TEXT NOT NULL,
  "emtalaApplicability" "EmtalaApplicability" NOT NULL DEFAULT 'NOT_CONFIGURED',
  "medicareParticipation" "ParticipationStatus" NOT NULL DEFAULT 'NOT_CONFIGURED',
  "medicaidParticipation" "ParticipationStatus" NOT NULL DEFAULT 'NOT_CONFIGURED',
  "noSurprisesApplicability" BOOLEAN NOT NULL DEFAULT false,
  "nondiscriminationApplicability" BOOLEAN NOT NULL DEFAULT true,
  "hospitalAffiliation" TEXT,
  "physicianOwnershipJson" JSONB,
  "networkDisclosureJson" JSONB,
  "facilityFeeDisclosureJson" JSONB,
  "observationDisclosureJson" JSONB,
  "separateBillingEntitiesJson" JSONB,
  "privacyOfficerName" TEXT,
  "privacyOfficerEmail" TEXT,
  "privacyOfficerPhone" TEXT,
  "grievanceContactJson" JSONB,
  "billingContactJson" JSONB,
  "approvedLegalPacketVersion" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FacilityRegistrationDisclosureConfig_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "FacilityRegistrationDisclosureConfig_facilityId_key"
  ON "FacilityRegistrationDisclosureConfig"("facilityId");

CREATE INDEX "FacilityRegistrationDisclosureConfig_facilityId_idx"
  ON "FacilityRegistrationDisclosureConfig"("facilityId");

ALTER TABLE "FacilityRegistrationDisclosureConfig"
  ADD CONSTRAINT "FacilityRegistrationDisclosureConfig_facilityId_fkey"
  FOREIGN KEY ("facilityId") REFERENCES "Facility"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
