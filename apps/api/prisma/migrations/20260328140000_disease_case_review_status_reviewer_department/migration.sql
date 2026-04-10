-- AlterTable
ALTER TABLE "DiseaseCaseReview" ADD COLUMN "status" TEXT NOT NULL;
ALTER TABLE "DiseaseCaseReview" ADD COLUMN "reviewerLevel" TEXT NOT NULL;
ALTER TABLE "DiseaseCaseReview" ADD COLUMN "departmentId" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "DiseaseCaseReview_departmentId_idx" ON "DiseaseCaseReview"("departmentId");
