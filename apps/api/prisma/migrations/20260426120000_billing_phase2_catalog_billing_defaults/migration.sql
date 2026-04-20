-- Phase 2 billing: optional default billing codes on catalogs (additive, nullable).

ALTER TABLE "CatalogImagingStudy" ADD COLUMN "billingCodeDefault" TEXT;
COMMENT ON COLUMN "CatalogImagingStudy"."billingCodeDefault" IS 'Optional CPT/HCPCS-style suggestion for billing; not validated.';

ALTER TABLE "CatalogMedication" ADD COLUMN "billingCodeDefault" TEXT;
COMMENT ON COLUMN "CatalogMedication"."billingCodeDefault" IS 'Optional HCPCS/J-code-style suggestion for billing; not validated.';

ALTER TABLE "VaccineCatalog" ADD COLUMN "billingCodeDefault" TEXT;
COMMENT ON COLUMN "VaccineCatalog"."billingCodeDefault" IS 'Optional CPT/HCPCS-style suggestion for billing; not validated.';
