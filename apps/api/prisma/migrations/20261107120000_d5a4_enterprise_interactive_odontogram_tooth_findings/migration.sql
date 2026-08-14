-- MEDUI.D5A.4 — Interactive odontogram tooth findings (additive).

-- CreateEnum
CREATE TYPE "DentitionType" AS ENUM ('PRIMARY', 'MIXED', 'PERMANENT');

-- CreateEnum
CREATE TYPE "ToothNumberingSystem" AS ENUM ('UNIVERSAL', 'FDI', 'PALMER');

-- CreateEnum
CREATE TYPE "ToothFindingScope" AS ENUM ('WHOLE_TOOTH', 'SURFACE_SPECIFIC');

-- CreateEnum
CREATE TYPE "ToothFindingClinicalState" AS ENUM ('OBSERVED', 'EXISTING', 'PLANNED', 'IN_PROGRESS', 'COMPLETED', 'RESOLVED', 'AMENDED', 'VOIDED');

-- AlterEnum
ALTER TYPE "AuditAction" ADD VALUE 'TOOTH_FINDING_CREATE';
ALTER TYPE "AuditAction" ADD VALUE 'TOOTH_FINDING_AMEND';
ALTER TYPE "AuditAction" ADD VALUE 'TOOTH_FINDING_RESOLVE';

-- CreateTable
CREATE TABLE "PatientDentitionState" (
    "id" TEXT NOT NULL,
    "facilityId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "dentitionType" "DentitionType" NOT NULL DEFAULT 'PERMANENT',
    "numberingSystem" "ToothNumberingSystem" NOT NULL DEFAULT 'FDI',
    "updatedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PatientDentitionState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ToothFinding" (
    "id" TEXT NOT NULL,
    "facilityId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "encounterId" TEXT NOT NULL,
    "toothCode" TEXT NOT NULL,
    "scope" "ToothFindingScope" NOT NULL,
    "surfaces" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "findingType" TEXT NOT NULL,
    "clinicalState" "ToothFindingClinicalState" NOT NULL DEFAULT 'OBSERVED',
    "notes" TEXT,
    "documentedByUserId" TEXT NOT NULL,
    "documentedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "supersedesFindingId" TEXT,
    "voidedAt" TIMESTAMP(3),
    "voidedByUserId" TEXT,
    "voidReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ToothFinding_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PatientDentitionState_patientId_idx" ON "PatientDentitionState"("patientId");

-- CreateIndex
CREATE INDEX "PatientDentitionState_facilityId_idx" ON "PatientDentitionState"("facilityId");

-- CreateIndex
CREATE UNIQUE INDEX "PatientDentitionState_facilityId_patientId_key" ON "PatientDentitionState"("facilityId", "patientId");

-- CreateIndex
CREATE INDEX "ToothFinding_facilityId_patientId_idx" ON "ToothFinding"("facilityId", "patientId");

-- CreateIndex
CREATE INDEX "ToothFinding_patientId_toothCode_idx" ON "ToothFinding"("patientId", "toothCode");

-- CreateIndex
CREATE INDEX "ToothFinding_encounterId_idx" ON "ToothFinding"("encounterId");

-- CreateIndex
CREATE INDEX "ToothFinding_facilityId_encounterId_idx" ON "ToothFinding"("facilityId", "encounterId");

-- CreateIndex
CREATE INDEX "ToothFinding_toothCode_clinicalState_idx" ON "ToothFinding"("toothCode", "clinicalState");

-- CreateIndex
CREATE INDEX "ToothFinding_documentedByUserId_idx" ON "ToothFinding"("documentedByUserId");

-- CreateIndex
CREATE INDEX "ToothFinding_voidedByUserId_idx" ON "ToothFinding"("voidedByUserId");

-- CreateIndex
CREATE INDEX "ToothFinding_supersedesFindingId_idx" ON "ToothFinding"("supersedesFindingId");

-- AddForeignKey
ALTER TABLE "PatientDentitionState" ADD CONSTRAINT "PatientDentitionState_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "Facility"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientDentitionState" ADD CONSTRAINT "PatientDentitionState_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientDentitionState" ADD CONSTRAINT "PatientDentitionState_updatedByUserId_fkey" FOREIGN KEY ("updatedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ToothFinding" ADD CONSTRAINT "ToothFinding_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "Facility"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ToothFinding" ADD CONSTRAINT "ToothFinding_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ToothFinding" ADD CONSTRAINT "ToothFinding_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES "Encounter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ToothFinding" ADD CONSTRAINT "ToothFinding_documentedByUserId_fkey" FOREIGN KEY ("documentedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ToothFinding" ADD CONSTRAINT "ToothFinding_voidedByUserId_fkey" FOREIGN KEY ("voidedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ToothFinding" ADD CONSTRAINT "ToothFinding_supersedesFindingId_fkey" FOREIGN KEY ("supersedesFindingId") REFERENCES "ToothFinding"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
