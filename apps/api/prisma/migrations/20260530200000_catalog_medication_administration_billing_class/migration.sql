-- Phase 6A: optional structured catalog hints for infusion vs push and billing class suggestions (nullable; no backfill).
ALTER TABLE "CatalogMedication" ADD COLUMN "administrationType" TEXT;
ALTER TABLE "CatalogMedication" ADD COLUMN "billingClass" TEXT;
