-- Phase 4.5: BillingCatalog + auto-billing source modules (no changes to existing billing logic).

CREATE TABLE "BillingCatalog" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "system" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "triggerSource" TEXT NOT NULL,
    "externalCode" TEXT,
    "billClass" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BillingCatalog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "BillingCatalog_triggerSource_idx" ON "BillingCatalog"("triggerSource");

CREATE INDEX "BillingCatalog_externalCode_idx" ON "BillingCatalog"("externalCode");

ALTER TYPE "BillingSourceModule" ADD VALUE 'LAB_RESULT';
ALTER TYPE "BillingSourceModule" ADD VALUE 'IMAGING_RESULT';
ALTER TYPE "BillingSourceModule" ADD VALUE 'MED_ADMIN';
ALTER TYPE "BillingSourceModule" ADD VALUE 'PROCEDURE';
