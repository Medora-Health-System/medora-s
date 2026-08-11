-- CreateEnum
CREATE TYPE "CarePlanStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ON_HOLD', 'UNDER_REVIEW', 'COMPLETED', 'DISCONTINUED');

-- CreateEnum
CREATE TYPE "CarePlanComponentType" AS ENUM ('GOAL', 'INTERVENTION');

-- CreateEnum
CREATE TYPE "CarePlanComponentStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'MET', 'PARTIALLY_MET', 'NOT_MET', 'DISCONTINUED');

-- CreateEnum
CREATE TYPE "CarePlanPriority" AS ENUM ('ROUTINE', 'HIGH', 'URGENT');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "EncounterClinicalEventType" ADD VALUE 'CARE_PLAN_ACTIVATED';
ALTER TYPE "EncounterClinicalEventType" ADD VALUE 'CARE_PLAN_REVIEWED';
ALTER TYPE "EncounterClinicalEventType" ADD VALUE 'CARE_PLAN_GOAL_COMPLETED';
ALTER TYPE "EncounterClinicalEventType" ADD VALUE 'CARE_PLAN_COMPLETED';
ALTER TYPE "EncounterClinicalEventType" ADD VALUE 'CARE_PLAN_DISCONTINUED';

-- CreateTable
CREATE TABLE "EncounterCarePlan" (
    "id" TEXT NOT NULL,
    "facilityId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "encounterId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "templateVersion" TEXT NOT NULL,
    "templateSnapshotJson" JSONB NOT NULL,
    "title" TEXT NOT NULL,
    "status" "CarePlanStatus" NOT NULL DEFAULT 'ACTIVE',
    "revision" INTEGER NOT NULL DEFAULT 1,
    "priority" "CarePlanPriority" NOT NULL DEFAULT 'ROUTINE',
    "activatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "activatedByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "discontinuedAt" TIMESTAMP(3),
    "currentReviewDueAt" TIMESTAMP(3),

    CONSTRAINT "EncounterCarePlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EncounterCarePlanComponent" (
    "id" TEXT NOT NULL,
    "carePlanId" TEXT NOT NULL,
    "componentType" "CarePlanComponentType" NOT NULL,
    "sourceTemplateComponentId" TEXT,
    "discipline" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "targetOutcome" TEXT,
    "status" "CarePlanComponentStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "sequence" INTEGER NOT NULL,
    "monitoringJson" JSONB,
    "educationJson" JSONB,
    "responsibleRole" TEXT,
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "revision" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "EncounterCarePlanComponent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EncounterCarePlanProgress" (
    "id" TEXT NOT NULL,
    "carePlanId" TEXT NOT NULL,
    "componentId" TEXT,
    "facilityId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "encounterId" TEXT NOT NULL,
    "discipline" TEXT NOT NULL,
    "status" "CarePlanComponentStatus" NOT NULL,
    "narrative" TEXT NOT NULL,
    "structuredOutcomeJson" JSONB,
    "authorUserId" TEXT NOT NULL,
    "authorRoleSnapshot" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EncounterCarePlanProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EncounterCarePlanReview" (
    "id" TEXT NOT NULL,
    "carePlanId" TEXT NOT NULL,
    "facilityId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "encounterId" TEXT NOT NULL,
    "reviewStatus" TEXT NOT NULL,
    "nextReviewAt" TIMESTAMP(3),
    "componentStateSnapshotJson" JSONB NOT NULL,
    "narrative" TEXT,
    "reviewerUserId" TEXT NOT NULL,
    "reviewerRoleSnapshot" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EncounterCarePlanReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EncounterCarePlanTransition" (
    "id" TEXT NOT NULL,
    "carePlanId" TEXT NOT NULL,
    "fromStatus" "CarePlanStatus" NOT NULL,
    "toStatus" "CarePlanStatus" NOT NULL,
    "reason" TEXT,
    "actorUserId" TEXT NOT NULL,
    "actorRoleSnapshot" TEXT NOT NULL,
    "aggregateRevision" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EncounterCarePlanTransition_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EncounterCarePlan_facilityId_encounterId_status_idx" ON "EncounterCarePlan"("facilityId", "encounterId", "status");

-- CreateIndex
CREATE INDEX "EncounterCarePlan_facilityId_patientId_idx" ON "EncounterCarePlan"("facilityId", "patientId");

-- CreateIndex
CREATE INDEX "EncounterCarePlan_encounterId_createdAt_idx" ON "EncounterCarePlan"("encounterId", "createdAt");

-- CreateIndex
CREATE INDEX "EncounterCarePlan_templateId_templateVersion_idx" ON "EncounterCarePlan"("templateId", "templateVersion");

-- CreateIndex
CREATE INDEX "EncounterCarePlanComponent_carePlanId_sequence_idx" ON "EncounterCarePlanComponent"("carePlanId", "sequence");

-- CreateIndex
CREATE INDEX "EncounterCarePlanComponent_carePlanId_discipline_idx" ON "EncounterCarePlanComponent"("carePlanId", "discipline");

-- CreateIndex
CREATE INDEX "EncounterCarePlanProgress_carePlanId_createdAt_idx" ON "EncounterCarePlanProgress"("carePlanId", "createdAt");

-- CreateIndex
CREATE INDEX "EncounterCarePlanProgress_facilityId_encounterId_createdAt_idx" ON "EncounterCarePlanProgress"("facilityId", "encounterId", "createdAt");

-- CreateIndex
CREATE INDEX "EncounterCarePlanReview_carePlanId_createdAt_idx" ON "EncounterCarePlanReview"("carePlanId", "createdAt");

-- CreateIndex
CREATE INDEX "EncounterCarePlanReview_facilityId_encounterId_createdAt_idx" ON "EncounterCarePlanReview"("facilityId", "encounterId", "createdAt");

-- CreateIndex
CREATE INDEX "EncounterCarePlanTransition_carePlanId_createdAt_idx" ON "EncounterCarePlanTransition"("carePlanId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "EncounterCarePlanTransition_carePlanId_aggregateRevision_key" ON "EncounterCarePlanTransition"("carePlanId", "aggregateRevision");

-- AddForeignKey
ALTER TABLE "EncounterCarePlan" ADD CONSTRAINT "EncounterCarePlan_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "Facility"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EncounterCarePlan" ADD CONSTRAINT "EncounterCarePlan_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EncounterCarePlan" ADD CONSTRAINT "EncounterCarePlan_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES "Encounter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EncounterCarePlan" ADD CONSTRAINT "EncounterCarePlan_activatedByUserId_fkey" FOREIGN KEY ("activatedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EncounterCarePlanComponent" ADD CONSTRAINT "EncounterCarePlanComponent_carePlanId_fkey" FOREIGN KEY ("carePlanId") REFERENCES "EncounterCarePlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EncounterCarePlanComponent" ADD CONSTRAINT "EncounterCarePlanComponent_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EncounterCarePlanProgress" ADD CONSTRAINT "EncounterCarePlanProgress_carePlanId_fkey" FOREIGN KEY ("carePlanId") REFERENCES "EncounterCarePlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EncounterCarePlanProgress" ADD CONSTRAINT "EncounterCarePlanProgress_componentId_fkey" FOREIGN KEY ("componentId") REFERENCES "EncounterCarePlanComponent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EncounterCarePlanProgress" ADD CONSTRAINT "EncounterCarePlanProgress_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "Facility"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EncounterCarePlanProgress" ADD CONSTRAINT "EncounterCarePlanProgress_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EncounterCarePlanProgress" ADD CONSTRAINT "EncounterCarePlanProgress_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES "Encounter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EncounterCarePlanProgress" ADD CONSTRAINT "EncounterCarePlanProgress_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EncounterCarePlanReview" ADD CONSTRAINT "EncounterCarePlanReview_carePlanId_fkey" FOREIGN KEY ("carePlanId") REFERENCES "EncounterCarePlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EncounterCarePlanReview" ADD CONSTRAINT "EncounterCarePlanReview_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "Facility"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EncounterCarePlanReview" ADD CONSTRAINT "EncounterCarePlanReview_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EncounterCarePlanReview" ADD CONSTRAINT "EncounterCarePlanReview_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES "Encounter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EncounterCarePlanReview" ADD CONSTRAINT "EncounterCarePlanReview_reviewerUserId_fkey" FOREIGN KEY ("reviewerUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EncounterCarePlanTransition" ADD CONSTRAINT "EncounterCarePlanTransition_carePlanId_fkey" FOREIGN KEY ("carePlanId") REFERENCES "EncounterCarePlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EncounterCarePlanTransition" ADD CONSTRAINT "EncounterCarePlanTransition_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

