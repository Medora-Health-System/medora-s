-- CreateEnum
CREATE TYPE "MsppDiseaseReportFeedbackCategory" AS ENUM ('GEO_INCOMPLETE', 'CLINICAL_INCOMPLETE', 'LAB_MISSING', 'CODE_VERIFY', 'DUPLICATE_SUSPECTED', 'DATA_INCONSISTENT', 'OTHER');

-- CreateEnum
CREATE TYPE "MsppDiseaseReportFeedbackSeverity" AS ENUM ('INFO', 'WARNING', 'ACTION_REQUIRED');

-- CreateEnum
CREATE TYPE "MsppDiseaseReportFeedbackStatus" AS ENUM ('OPEN', 'REVIEWED', 'RESOLVED');

-- CreateTable
CREATE TABLE "MsppDiseaseReportFeedback" (
    "id" TEXT NOT NULL,
    "diseaseCaseReportId" TEXT NOT NULL,
    "diseaseCaseReviewId" TEXT,
    "category" "MsppDiseaseReportFeedbackCategory" NOT NULL,
    "severity" "MsppDiseaseReportFeedbackSeverity" NOT NULL,
    "feedbackText" TEXT NOT NULL,
    "status" "MsppDiseaseReportFeedbackStatus" NOT NULL DEFAULT 'OPEN',
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "facilityReviewedAt" TIMESTAMP(3),
    "facilityReviewedByUserId" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "resolvedByUserId" TEXT,

    CONSTRAINT "MsppDiseaseReportFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MsppDiseaseReportFeedback_diseaseCaseReportId_idx" ON "MsppDiseaseReportFeedback"("diseaseCaseReportId");

-- CreateIndex
CREATE INDEX "MsppDiseaseReportFeedback_status_idx" ON "MsppDiseaseReportFeedback"("status");

-- CreateIndex
CREATE INDEX "MsppDiseaseReportFeedback_severity_idx" ON "MsppDiseaseReportFeedback"("severity");

-- AddForeignKey
ALTER TABLE "MsppDiseaseReportFeedback" ADD CONSTRAINT "MsppDiseaseReportFeedback_diseaseCaseReportId_fkey" FOREIGN KEY ("diseaseCaseReportId") REFERENCES "DiseaseCaseReport"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MsppDiseaseReportFeedback" ADD CONSTRAINT "MsppDiseaseReportFeedback_diseaseCaseReviewId_fkey" FOREIGN KEY ("diseaseCaseReviewId") REFERENCES "DiseaseCaseReview"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MsppDiseaseReportFeedback" ADD CONSTRAINT "MsppDiseaseReportFeedback_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MsppDiseaseReportFeedback" ADD CONSTRAINT "MsppDiseaseReportFeedback_facilityReviewedByUserId_fkey" FOREIGN KEY ("facilityReviewedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MsppDiseaseReportFeedback" ADD CONSTRAINT "MsppDiseaseReportFeedback_resolvedByUserId_fkey" FOREIGN KEY ("resolvedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
