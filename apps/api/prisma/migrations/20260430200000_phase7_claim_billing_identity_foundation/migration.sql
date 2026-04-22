-- Phase 7 — claim content identity: facility billing profile, provider NPI, coverage dates / policy number.

ALTER TABLE "Facility" ADD COLUMN IF NOT EXISTS "billingLegalName" TEXT;
ALTER TABLE "Facility" ADD COLUMN IF NOT EXISTS "billingNpi" TEXT;
ALTER TABLE "Facility" ADD COLUMN IF NOT EXISTS "taxIdEin" TEXT;
ALTER TABLE "Facility" ADD COLUMN IF NOT EXISTS "billingAddressLine1" TEXT;
ALTER TABLE "Facility" ADD COLUMN IF NOT EXISTS "billingAddressLine2" TEXT;
ALTER TABLE "Facility" ADD COLUMN IF NOT EXISTS "billingCity" TEXT;
ALTER TABLE "Facility" ADD COLUMN IF NOT EXISTS "billingStateProvince" TEXT;
ALTER TABLE "Facility" ADD COLUMN IF NOT EXISTS "billingPostalCode" TEXT;
ALTER TABLE "Facility" ADD COLUMN IF NOT EXISTS "billingCountry" TEXT;
ALTER TABLE "Facility" ADD COLUMN IF NOT EXISTS "billingFacilityTypeLabel" TEXT;

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "billingNpi" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "billingTaxonomyCode" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "billingNameOverride" TEXT;

ALTER TABLE "PatientInsuranceCoverage" ADD COLUMN IF NOT EXISTS "policyNumber" TEXT;
ALTER TABLE "PatientInsuranceCoverage" ADD COLUMN IF NOT EXISTS "effectiveFrom" TIMESTAMP(3);
ALTER TABLE "PatientInsuranceCoverage" ADD COLUMN IF NOT EXISTS "effectiveTo" TIMESTAMP(3);
ALTER TABLE "PatientInsuranceCoverage" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true;
