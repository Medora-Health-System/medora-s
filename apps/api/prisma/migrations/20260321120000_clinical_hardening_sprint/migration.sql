-- CreateEnum
CREATE TYPE "MedicationFulfillmentIntent" AS ENUM ('ADMINISTER_CHART', 'PHARMACY_DISPENSE');

-- AlterTable Encounter
ALTER TABLE "Encounter" ADD COLUMN     "roomLabel" TEXT,
ADD COLUMN     "physicianAssignedUserId" TEXT,
ADD COLUMN     "dischargeSummaryJson" JSONB;

-- AlterTable Encounter
ALTER TABLE "Encounter" ADD CONSTRAINT "Encounter_physicianAssignedUserId_fkey" FOREIGN KEY ("physicianAssignedUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "Encounter_physicianAssignedUserId_idx" ON "Encounter"("physicianAssignedUserId");

-- AlterTable OrderItem
ALTER TABLE "OrderItem" ADD COLUMN     "medicationFulfillmentIntent" "MedicationFulfillmentIntent",
ADD COLUMN     "completedAt" TIMESTAMP(3),
ADD COLUMN     "completedByUserId" TEXT;

-- AlterTable OrderItem
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_completedByUserId_fkey" FOREIGN KEY ("completedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "OrderItem_completedByUserId_idx" ON "OrderItem"("completedByUserId");

-- CreateIndex
CREATE INDEX "OrderItem_medicationFulfillmentIntent_idx" ON "OrderItem"("medicationFulfillmentIntent");

-- AlterTable MedicationDispense
ALTER TABLE "MedicationDispense" ALTER COLUMN "inventoryItemId" DROP NOT NULL;

-- AlterTable MedicationDispense
ALTER TABLE "MedicationDispense" ADD COLUMN     "orderItemId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "MedicationDispense_orderItemId_key" ON "MedicationDispense"("orderItemId");

-- AddForeignKey
ALTER TABLE "MedicationDispense" ADD CONSTRAINT "MedicationDispense_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
