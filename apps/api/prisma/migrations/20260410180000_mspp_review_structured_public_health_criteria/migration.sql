-- Additive MSPP structured review criteria (nullable for existing rows).
CREATE TYPE "MsppCaseClassification" AS ENUM ('SUSPECT', 'PROBABLE', 'CONFIRMED', 'NOT_A_CASE');
CREATE TYPE "MsppLabEvidenceType" AS ENUM ('NONE', 'PCR', 'RAPID_ANTIGEN', 'CULTURE', 'SEROLOGY', 'OTHER');

ALTER TABLE "DiseaseCaseReview" ADD COLUMN "caseClassification" "MsppCaseClassification";
ALTER TABLE "DiseaseCaseReview" ADD COLUMN "inclusionCriteriaSummary" TEXT;
ALTER TABLE "DiseaseCaseReview" ADD COLUMN "exclusionCriteriaSummary" TEXT;
ALTER TABLE "DiseaseCaseReview" ADD COLUMN "symptomOnsetDate" TIMESTAMP(3);
ALTER TABLE "DiseaseCaseReview" ADD COLUMN "hospitalized" BOOLEAN;
ALTER TABLE "DiseaseCaseReview" ADD COLUMN "outcomeStatus" VARCHAR(128);
ALTER TABLE "DiseaseCaseReview" ADD COLUMN "labEvidenceType" "MsppLabEvidenceType";
ALTER TABLE "DiseaseCaseReview" ADD COLUMN "epiLinkedCase" BOOLEAN;
ALTER TABLE "DiseaseCaseReview" ADD COLUMN "travelOrExposureContext" TEXT;
ALTER TABLE "DiseaseCaseReview" ADD COLUMN "finalDecisionRationale" TEXT;
