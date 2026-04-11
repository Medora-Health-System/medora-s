-- Unique commune label within a geographic department (national reference integrity).
CREATE UNIQUE INDEX "GeoCommune_geoDepartmentId_name_key" ON "GeoCommune"("geoDepartmentId", "name");
