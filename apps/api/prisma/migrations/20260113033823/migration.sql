/*
  Warnings:

  - A unique constraint covering the columns `[facilityId,mrn]` on the table `Patient` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `facilityId` to the `Patient` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "EncounterType" AS ENUM ('OUTPATIENT', 'INPATIENT', 'EMERGENCY', 'URGENT_CARE');

-- CreateEnum
CREATE TYPE "EncounterStatus" AS ENUM ('OPEN', 'CLOSED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "OrderPriority" AS ENUM ('ROUTINE', 'URGENT', 'STAT');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'PATIENT_CREATE';
ALTER TYPE "AuditAction" ADD VALUE 'PATIENT_UPDATE';
ALTER TYPE "AuditAction" ADD VALUE 'PATIENT_VIEW';
ALTER TYPE "AuditAction" ADD VALUE 'ENCOUNTER_CREATE';
ALTER TYPE "AuditAction" ADD VALUE 'ENCOUNTER_UPDATE';
ALTER TYPE "AuditAction" ADD VALUE 'ENCOUNTER_CLOSE';
ALTER TYPE "AuditAction" ADD VALUE 'ENCOUNTER_VIEW';
ALTER TYPE "AuditAction" ADD VALUE 'ORDER_CREATE';
ALTER TYPE "AuditAction" ADD VALUE 'ORDER_CANCEL';
ALTER TYPE "AuditAction" ADD VALUE 'ORDER_VIEW';

-- AlterTable
ALTER TABLE "AuditLog" ADD COLUMN     "encounterId" TEXT,
ADD COLUMN     "orderId" TEXT;

-- AlterTable
ALTER TABLE "Patient" ADD COLUMN     "address" TEXT,
ADD COLUMN     "city" TEXT,
ADD COLUMN     "country" TEXT,
ADD COLUMN     "email" TEXT,
ADD COLUMN     "facilityId" TEXT NOT NULL,
ADD COLUMN     "language" TEXT,
ADD COLUMN     "mrn" TEXT;

-- CreateTable
CREATE TABLE "Encounter" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "facilityId" TEXT NOT NULL,
    "type" "EncounterType" NOT NULL,
    "status" "EncounterStatus" NOT NULL DEFAULT 'OPEN',
    "startAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endAt" TIMESTAMP(3),
    "providerId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Encounter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "encounterId" TEXT NOT NULL,
    "facilityId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
    "priority" "OrderPriority" NOT NULL DEFAULT 'ROUTINE',
    "notes" TEXT,
    "orderedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "patientId" TEXT NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderItem" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "catalogItemId" TEXT NOT NULL,
    "catalogItemType" TEXT NOT NULL,
    "quantity" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CatalogLabTest" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CatalogLabTest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CatalogImagingStudy" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CatalogImagingStudy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CatalogMedication" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CatalogMedication_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Encounter_patientId_idx" ON "Encounter"("patientId");

-- CreateIndex
CREATE INDEX "Encounter_facilityId_idx" ON "Encounter"("facilityId");

-- CreateIndex
CREATE INDEX "Encounter_status_idx" ON "Encounter"("status");

-- CreateIndex
CREATE INDEX "Encounter_startAt_idx" ON "Encounter"("startAt");

-- CreateIndex
CREATE INDEX "Order_encounterId_idx" ON "Order"("encounterId");

-- CreateIndex
CREATE INDEX "Order_facilityId_idx" ON "Order"("facilityId");

-- CreateIndex
CREATE INDEX "Order_patientId_idx" ON "Order"("patientId");

-- CreateIndex
CREATE INDEX "Order_status_idx" ON "Order"("status");

-- CreateIndex
CREATE INDEX "OrderItem_orderId_idx" ON "OrderItem"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "CatalogLabTest_code_key" ON "CatalogLabTest"("code");

-- CreateIndex
CREATE UNIQUE INDEX "CatalogImagingStudy_code_key" ON "CatalogImagingStudy"("code");

-- CreateIndex
CREATE UNIQUE INDEX "CatalogMedication_code_key" ON "CatalogMedication"("code");

-- CreateIndex
CREATE INDEX "AuditLog_encounterId_idx" ON "AuditLog"("encounterId");

-- CreateIndex
CREATE INDEX "Patient_facilityId_idx" ON "Patient"("facilityId");

-- CreateIndex
CREATE INDEX "Patient_mrn_idx" ON "Patient"("mrn");

-- CreateIndex
CREATE UNIQUE INDEX "Patient_facilityId_mrn_key" ON "Patient"("facilityId", "mrn");

-- AddForeignKey
ALTER TABLE "Patient" ADD CONSTRAINT "Patient_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "Facility"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES "Encounter"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Encounter" ADD CONSTRAINT "Encounter_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Encounter" ADD CONSTRAINT "Encounter_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "Facility"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES "Encounter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "Facility"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
