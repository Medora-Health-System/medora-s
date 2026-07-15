-- AlterEnum
ALTER TYPE "DiagnosisStatus" ADD VALUE 'REMOVED';

-- AlterEnum
ALTER TYPE "AuditAction" ADD VALUE 'DIAGNOSIS_REMOVED';

-- AlterTable
ALTER TABLE "Diagnosis" ADD COLUMN     "removedAt" TIMESTAMP(3),
ADD COLUMN     "removedByUserId" TEXT,
ADD COLUMN     "removalReasonCode" TEXT,
ADD COLUMN     "removalReasonText" TEXT;

-- CreateIndex
CREATE INDEX "Diagnosis_removedByUserId_idx" ON "Diagnosis"("removedByUserId");

-- AddForeignKey
ALTER TABLE "Diagnosis" ADD CONSTRAINT "Diagnosis_removedByUserId_fkey" FOREIGN KEY ("removedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
