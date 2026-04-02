-- AlterTable
ALTER TABLE "Encounter" ADD COLUMN "admissionSummaryJson" JSONB,
ADD COLUMN "admittedAt" TIMESTAMP(3);
