-- MEDUI.D4C.11A — allow one profession across multiple departments at a facility.
-- Replaces unique (userId, facilityId, professionCode) which blocked
-- PHYSICIAN_MD + CLINIC + EMERGENCY + MEDSURG as separate assignment rows.
--
-- departmentId is TEXT (UUID string). COALESCE uses a zero-UUID text sentinel so
-- unassigned-department is a single slot per profession.

DROP INDEX IF EXISTS "UserRole_userId_facilityId_professionCode_key";
ALTER TABLE "UserRole" DROP CONSTRAINT IF EXISTS "UserRole_userId_facilityId_professionCode_key";

DROP INDEX IF EXISTS "UserRole_userId_facilityId_professionCode_departmentId_key";
ALTER TABLE "UserRole" DROP CONSTRAINT IF EXISTS "UserRole_userId_facilityId_professionCode_departmentId_key";

CREATE UNIQUE INDEX "UserRole_userId_facilityId_professionCode_departmentId_key"
  ON "UserRole" (
    "userId",
    "facilityId",
    "professionCode",
    (COALESCE("departmentId", '00000000-0000-0000-0000-000000000000'))
  );
