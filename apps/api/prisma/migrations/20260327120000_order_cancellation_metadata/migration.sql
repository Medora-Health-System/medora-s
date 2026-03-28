-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "cancelledAt" TIMESTAMP(3),
ADD COLUMN     "cancelledByUserId" TEXT,
ADD COLUMN     "cancellationReason" TEXT;

-- CreateIndex
CREATE INDEX "Order_cancelledByUserId_idx" ON "Order"("cancelledByUserId");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_cancelledByUserId_fkey" FOREIGN KEY ("cancelledByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
