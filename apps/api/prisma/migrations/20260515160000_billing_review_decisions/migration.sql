-- B15: durable manual billing review decisions.
CREATE TYPE "BillingReviewDecisionStatus" AS ENUM ('APPROVED', 'NEEDS_INFO', 'DO_NOT_BILL');

CREATE TABLE "BillingReviewDecision" (
    "id" TEXT NOT NULL,
    "facilityId" TEXT NOT NULL,
    "encounterId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "orderItemId" TEXT NOT NULL,
    "billingEventId" TEXT,
    "decision" "BillingReviewDecisionStatus" NOT NULL,
    "notes" TEXT,
    "reviewerId" TEXT NOT NULL,
    "reviewedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BillingReviewDecision_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BillingReviewDecision_facilityId_orderItemId_key" ON "BillingReviewDecision"("facilityId", "orderItemId");
CREATE INDEX "BillingReviewDecision_facilityId_decision_idx" ON "BillingReviewDecision"("facilityId", "decision");
CREATE INDEX "BillingReviewDecision_encounterId_idx" ON "BillingReviewDecision"("encounterId");
CREATE INDEX "BillingReviewDecision_orderItemId_idx" ON "BillingReviewDecision"("orderItemId");
CREATE INDEX "BillingReviewDecision_reviewerId_idx" ON "BillingReviewDecision"("reviewerId");

ALTER TABLE "BillingReviewDecision" ADD CONSTRAINT "BillingReviewDecision_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "Facility"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BillingReviewDecision" ADD CONSTRAINT "BillingReviewDecision_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES "Encounter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BillingReviewDecision" ADD CONSTRAINT "BillingReviewDecision_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BillingReviewDecision" ADD CONSTRAINT "BillingReviewDecision_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BillingReviewDecision" ADD CONSTRAINT "BillingReviewDecision_billingEventId_fkey" FOREIGN KEY ("billingEventId") REFERENCES "BillingEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BillingReviewDecision" ADD CONSTRAINT "BillingReviewDecision_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
