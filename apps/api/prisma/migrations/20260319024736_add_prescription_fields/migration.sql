-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "prescriberContact" TEXT,
ADD COLUMN     "prescriberLicense" TEXT,
ADD COLUMN     "prescriberName" TEXT;

-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN     "refillCount" INTEGER,
ADD COLUMN     "strength" TEXT;
