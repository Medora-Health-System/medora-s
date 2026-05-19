-- Phase 19D.1 — governance activation state on canonical products (no runtime cutover).

ALTER TABLE "MedicationProduct"
  ADD COLUMN "governanceStatus" VARCHAR(48) NOT NULL DEFAULT 'REVIEW_REQUIRED',
  ADD COLUMN "activationApprovedAt" TIMESTAMP(3),
  ADD COLUMN "activationApprovedByUserId" TEXT,
  ADD COLUMN "governanceNotes" TEXT;

CREATE INDEX "MedicationProduct_governanceStatus_idx" ON "MedicationProduct"("governanceStatus");

ALTER TABLE "MedicationProduct"
  ADD CONSTRAINT "MedicationProduct_activationApprovedByUserId_fkey"
  FOREIGN KEY ("activationApprovedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
