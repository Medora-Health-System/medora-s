-- Structured validation checklist (last decision snapshot) for MSPP approve/reject.
ALTER TABLE "DiseaseCaseReview" ADD COLUMN "validationFever" BOOLEAN;
ALTER TABLE "DiseaseCaseReview" ADD COLUMN "validationDuration" TEXT;
ALTER TABLE "DiseaseCaseReview" ADD COLUMN "validationLabConfirmed" BOOLEAN;
ALTER TABLE "DiseaseCaseReview" ADD COLUMN "validationExposureRisk" TEXT;
