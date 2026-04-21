-- AlterTable
ALTER TABLE "BillingEvent" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "ClaimControlCounter" ALTER COLUMN "id" SET DEFAULT 'default';
