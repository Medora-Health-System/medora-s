-- Phase 3C-M1 — imaging taxonomy classifier FKs (additive only)

ALTER TABLE "CatalogImagingStudy"
  ADD COLUMN "lateralityClassifierId" TEXT,
  ADD COLUMN "anatomicSubregionClassifierId" TEXT,
  ADD COLUMN "protocolClassifierId" TEXT;

CREATE INDEX "CatalogImagingStudy_lateralityClassifierId_idx"
  ON "CatalogImagingStudy"("lateralityClassifierId");

CREATE INDEX "CatalogImagingStudy_anatomicSubregionClassifierId_idx"
  ON "CatalogImagingStudy"("anatomicSubregionClassifierId");

CREATE INDEX "CatalogImagingStudy_protocolClassifierId_idx"
  ON "CatalogImagingStudy"("protocolClassifierId");

ALTER TABLE "CatalogImagingStudy"
  ADD CONSTRAINT "CatalogImagingStudy_lateralityClassifierId_fkey"
  FOREIGN KEY ("lateralityClassifierId") REFERENCES "TermClassifier"("id")
  ON DELETE SET NULL ON UPDATE NO ACTION;

ALTER TABLE "CatalogImagingStudy"
  ADD CONSTRAINT "CatalogImagingStudy_anatomicSubregionClassifierId_fkey"
  FOREIGN KEY ("anatomicSubregionClassifierId") REFERENCES "TermClassifier"("id")
  ON DELETE SET NULL ON UPDATE NO ACTION;

ALTER TABLE "CatalogImagingStudy"
  ADD CONSTRAINT "CatalogImagingStudy_protocolClassifierId_fkey"
  FOREIGN KEY ("protocolClassifierId") REFERENCES "TermClassifier"("id")
  ON DELETE SET NULL ON UPDATE NO ACTION;
