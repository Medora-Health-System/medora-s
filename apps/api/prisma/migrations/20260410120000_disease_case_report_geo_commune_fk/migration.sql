-- Optional link from disease case report to referential GeoCommune (commune-level alignment).
ALTER TABLE "DiseaseCaseReport" ADD COLUMN "geoCommuneId" TEXT;

CREATE INDEX "DiseaseCaseReport_geoCommuneId_idx" ON "DiseaseCaseReport"("geoCommuneId");

ALTER TABLE "DiseaseCaseReport" ADD CONSTRAINT "DiseaseCaseReport_geoCommuneId_fkey" FOREIGN KEY ("geoCommuneId") REFERENCES "GeoCommune"("id") ON DELETE SET NULL ON UPDATE CASCADE;
