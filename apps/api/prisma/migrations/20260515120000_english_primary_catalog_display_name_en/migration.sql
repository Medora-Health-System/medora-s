-- Phase A: additive English-primary display columns (nullable). No data backfill.
ALTER TABLE "CatalogLabTest" ADD COLUMN "displayNameEn" TEXT;
ALTER TABLE "CatalogImagingStudy" ADD COLUMN "displayNameEn" TEXT;
ALTER TABLE "CatalogMedication" ADD COLUMN "displayNameEn" TEXT;
