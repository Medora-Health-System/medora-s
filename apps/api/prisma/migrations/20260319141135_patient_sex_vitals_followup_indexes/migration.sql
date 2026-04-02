-- CreateEnum
CREATE TYPE "PatientSex" AS ENUM ('MALE', 'FEMALE', 'OTHER', 'UNKNOWN');

-- AlterTable
ALTER TABLE "Patient" ADD COLUMN     "latestVitalsAt" TIMESTAMP(3),
ADD COLUMN     "latestVitalsJson" JSONB,
ADD COLUMN     "sex" "PatientSex" NOT NULL DEFAULT 'UNKNOWN';

-- Backfill canonical sex from legacy SexAtBirth (M/F/X/U)
UPDATE "Patient" SET "sex" = CASE "sexAtBirth"::text
  WHEN 'M' THEN 'MALE'::"PatientSex"
  WHEN 'F' THEN 'FEMALE'::"PatientSex"
  WHEN 'X' THEN 'OTHER'::"PatientSex"
  WHEN 'U' THEN 'UNKNOWN'::"PatientSex"
  ELSE 'UNKNOWN'::"PatientSex"
END
WHERE "sexAtBirth" IS NOT NULL;

-- CreateIndex
CREATE INDEX "UserRole_facilityId_roleId_idx" ON "UserRole"("facilityId", "roleId");
