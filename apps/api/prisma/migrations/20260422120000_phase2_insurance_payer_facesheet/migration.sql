-- CreateEnum
CREATE TYPE "InsuranceCoverageRank" AS ENUM ('PRIMARY', 'SECONDARY');

-- CreateTable
CREATE TABLE "InsurancePayer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "code" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InsurancePayer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PatientInsuranceCoverage" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "facilityId" TEXT NOT NULL,
    "rank" "InsuranceCoverageRank" NOT NULL,
    "payerId" TEXT,
    "payerNameFreeText" TEXT,
    "planName" TEXT,
    "memberId" TEXT,
    "groupNumber" TEXT,
    "subscriberName" TEXT,
    "relationToSubscriber" TEXT,
    "phone" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PatientInsuranceCoverage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InsurancePayer_normalizedName_idx" ON "InsurancePayer"("normalizedName");

-- CreateIndex
CREATE UNIQUE INDEX "PatientInsuranceCoverage_patientId_facilityId_rank_key" ON "PatientInsuranceCoverage"("patientId", "facilityId", "rank");

-- CreateIndex
CREATE INDEX "PatientInsuranceCoverage_patientId_idx" ON "PatientInsuranceCoverage"("patientId");

-- CreateIndex
CREATE INDEX "PatientInsuranceCoverage_facilityId_idx" ON "PatientInsuranceCoverage"("facilityId");

-- AddForeignKey
ALTER TABLE "PatientInsuranceCoverage" ADD CONSTRAINT "PatientInsuranceCoverage_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientInsuranceCoverage" ADD CONSTRAINT "PatientInsuranceCoverage_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "Facility"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientInsuranceCoverage" ADD CONSTRAINT "PatientInsuranceCoverage_payerId_fkey" FOREIGN KEY ("payerId") REFERENCES "InsurancePayer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Seed minimal payers for autocomplete (installation-level catalogue)
INSERT INTO "InsurancePayer" ("id", "name", "normalizedName", "code", "isActive", "createdAt", "updatedAt")
VALUES
  (gen_random_uuid()::text, 'OPM / CNSS (à préciser)', 'opm / cnss (à préciser)', NULL, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'Assurance privée', 'assurance privée', NULL, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'Sans assurance / patient payeur', 'sans assurance / patient payeur', NULL, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
