-- CreateTable
CREATE TABLE "MsppReviewAuditEvent" (
    "id" TEXT NOT NULL,
    "diseaseCaseReviewId" TEXT NOT NULL,
    "diseaseCaseReportId" TEXT,
    "action" TEXT NOT NULL,
    "reviewerUserId" TEXT NOT NULL,
    "reviewerLevel" TEXT NOT NULL,
    "statusBefore" TEXT,
    "statusAfter" TEXT,
    "requeued" BOOLEAN NOT NULL DEFAULT false,
    "criteriaSnapshot" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MsppReviewAuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MsppReviewAuditEvent_diseaseCaseReviewId_idx" ON "MsppReviewAuditEvent"("diseaseCaseReviewId");

-- CreateIndex
CREATE INDEX "MsppReviewAuditEvent_diseaseCaseReportId_idx" ON "MsppReviewAuditEvent"("diseaseCaseReportId");

-- CreateIndex
CREATE INDEX "MsppReviewAuditEvent_createdAt_idx" ON "MsppReviewAuditEvent"("createdAt");

-- AddForeignKey
ALTER TABLE "MsppReviewAuditEvent" ADD CONSTRAINT "MsppReviewAuditEvent_diseaseCaseReviewId_fkey" FOREIGN KEY ("diseaseCaseReviewId") REFERENCES "DiseaseCaseReview"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MsppReviewAuditEvent" ADD CONSTRAINT "MsppReviewAuditEvent_reviewerUserId_fkey" FOREIGN KEY ("reviewerUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
