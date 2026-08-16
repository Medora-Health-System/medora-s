-- MEDUI.D5A.5 — Enterprise dental complete clinical board (additive).

-- AlterEnum
ALTER TYPE "AuditAction" ADD VALUE 'DENTAL_PERIODONTAL_EXAM_SAVE';
ALTER TYPE "AuditAction" ADD VALUE 'DENTAL_TREATMENT_PLAN_SAVE';
ALTER TYPE "AuditAction" ADD VALUE 'DENTAL_TREATMENT_PLAN_ITEM_SAVE';
ALTER TYPE "AuditAction" ADD VALUE 'DENTAL_PROCEDURE_RECORD_SAVE';

-- CreateTable
CREATE TABLE "DentalPeriodontalExam" (
    "id" TEXT NOT NULL,
    "facilityId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "encounterId" TEXT NOT NULL,
    "periodontalStatus" TEXT NOT NULL DEFAULT 'NOT_ASSESSED',
    "periodontitisStage" TEXT,
    "periodontitisGrade" TEXT,
    "extentDistribution" TEXT,
    "periImplantStatus" TEXT NOT NULL DEFAULT 'NOT_APPLICABLE',
    "narrativeAssessment" TEXT,
    "documentedByUserId" TEXT NOT NULL,
    "documentedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DentalPeriodontalExam_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DentalPeriodontalSiteMeasurement" (
    "id" TEXT NOT NULL,
    "examId" TEXT NOT NULL,
    "facilityId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "encounterId" TEXT NOT NULL,
    "toothCode" TEXT NOT NULL,
    "site" TEXT NOT NULL,
    "probingDepthMm" DOUBLE PRECISION,
    "gingivalMarginMm" DOUBLE PRECISION,
    "clinicalAttachmentLevelMm" DOUBLE PRECISION,
    "bleedingOnProbing" BOOLEAN NOT NULL DEFAULT false,
    "plaque" BOOLEAN NOT NULL DEFAULT false,
    "suppuration" BOOLEAN NOT NULL DEFAULT false,
    "mobilityGrade" INTEGER,
    "furcationGrade" INTEGER,
    "missingTooth" BOOLEAN NOT NULL DEFAULT false,
    "implantSite" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DentalPeriodontalSiteMeasurement_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DentalTreatmentPlan" (
    "id" TEXT NOT NULL,
    "facilityId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "encounterId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "proposedTreatmentSummary" TEXT,
    "expectedBenefits" TEXT,
    "materialRisks" TEXT,
    "reasonableAlternatives" TEXT,
    "noTreatmentDiscussed" BOOLEAN NOT NULL DEFAULT false,
    "patientQuestions" TEXT,
    "acceptanceOutcome" TEXT NOT NULL DEFAULT 'NOT_DISCUSSED',
    "documentedByUserId" TEXT NOT NULL,
    "documentedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "proposedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DentalTreatmentPlan_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DentalTreatmentPlanItem" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "facilityId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "encounterId" TEXT NOT NULL,
    "problemText" TEXT,
    "diagnosisId" TEXT,
    "toothCodes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "surfaces" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "proposedTreatment" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 3,
    "phase" TEXT NOT NULL DEFAULT 'DISEASE_CONTROL',
    "status" TEXT NOT NULL DEFAULT 'PROPOSED',
    "sequence" INTEGER NOT NULL DEFAULT 0,
    "responsibleUserId" TEXT,
    "notes" TEXT,
    "plannedDate" TIMESTAMP(3),
    "codingSystem" TEXT,
    "code" TEXT,
    "codeVersion" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DentalTreatmentPlanItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DentalProcedureRecord" (
    "id" TEXT NOT NULL,
    "facilityId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "encounterId" TEXT NOT NULL,
    "treatmentPlanItemId" TEXT,
    "clinicalName" TEXT NOT NULL,
    "toothCodes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "surfaces" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "performedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "providerUserId" TEXT NOT NULL,
    "assistantUserId" TEXT,
    "indication" TEXT,
    "anesthesiaUsed" BOOLEAN NOT NULL DEFAULT false,
    "anesthesiaDetails" TEXT,
    "materials" TEXT,
    "techniqueDetails" TEXT,
    "findings" TEXT,
    "complications" TEXT,
    "postProcedureStatus" TEXT,
    "postOpInstructions" TEXT,
    "followUpNotes" TEXT,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DOCUMENTED',
    "codingSystem" TEXT,
    "code" TEXT,
    "codeVersion" TEXT,
    "voidedAt" TIMESTAMP(3),
    "voidReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DentalProcedureRecord_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE UNIQUE INDEX "DentalPeriodontalExam_encounterId_key" ON "DentalPeriodontalExam"("encounterId");
CREATE INDEX "DentalPeriodontalExam_facilityId_patientId_idx" ON "DentalPeriodontalExam"("facilityId", "patientId");
CREATE INDEX "DentalPeriodontalExam_facilityId_encounterId_idx" ON "DentalPeriodontalExam"("facilityId", "encounterId");
CREATE INDEX "DentalPeriodontalExam_documentedByUserId_idx" ON "DentalPeriodontalExam"("documentedByUserId");

CREATE UNIQUE INDEX "DentalPeriodontalSiteMeasurement_examId_toothCode_site_key" ON "DentalPeriodontalSiteMeasurement"("examId", "toothCode", "site");
CREATE INDEX "DentalPeriodontalSiteMeasurement_facilityId_encounterId_idx" ON "DentalPeriodontalSiteMeasurement"("facilityId", "encounterId");
CREATE INDEX "DentalPeriodontalSiteMeasurement_patientId_toothCode_idx" ON "DentalPeriodontalSiteMeasurement"("patientId", "toothCode");
CREATE INDEX "DentalPeriodontalSiteMeasurement_examId_idx" ON "DentalPeriodontalSiteMeasurement"("examId");

CREATE UNIQUE INDEX "DentalTreatmentPlan_encounterId_key" ON "DentalTreatmentPlan"("encounterId");
CREATE INDEX "DentalTreatmentPlan_facilityId_patientId_idx" ON "DentalTreatmentPlan"("facilityId", "patientId");
CREATE INDEX "DentalTreatmentPlan_facilityId_encounterId_idx" ON "DentalTreatmentPlan"("facilityId", "encounterId");
CREATE INDEX "DentalTreatmentPlan_documentedByUserId_idx" ON "DentalTreatmentPlan"("documentedByUserId");

CREATE INDEX "DentalTreatmentPlanItem_planId_sequence_idx" ON "DentalTreatmentPlanItem"("planId", "sequence");
CREATE INDEX "DentalTreatmentPlanItem_facilityId_encounterId_idx" ON "DentalTreatmentPlanItem"("facilityId", "encounterId");
CREATE INDEX "DentalTreatmentPlanItem_diagnosisId_idx" ON "DentalTreatmentPlanItem"("diagnosisId");
CREATE INDEX "DentalTreatmentPlanItem_status_idx" ON "DentalTreatmentPlanItem"("status");

CREATE INDEX "DentalProcedureRecord_facilityId_encounterId_idx" ON "DentalProcedureRecord"("facilityId", "encounterId");
CREATE INDEX "DentalProcedureRecord_facilityId_patientId_idx" ON "DentalProcedureRecord"("facilityId", "patientId");
CREATE INDEX "DentalProcedureRecord_treatmentPlanItemId_idx" ON "DentalProcedureRecord"("treatmentPlanItemId");
CREATE INDEX "DentalProcedureRecord_providerUserId_idx" ON "DentalProcedureRecord"("providerUserId");
CREATE INDEX "DentalProcedureRecord_status_idx" ON "DentalProcedureRecord"("status");

-- ForeignKeys
ALTER TABLE "DentalPeriodontalExam" ADD CONSTRAINT "DentalPeriodontalExam_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "Facility"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DentalPeriodontalExam" ADD CONSTRAINT "DentalPeriodontalExam_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DentalPeriodontalExam" ADD CONSTRAINT "DentalPeriodontalExam_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES "Encounter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DentalPeriodontalExam" ADD CONSTRAINT "DentalPeriodontalExam_documentedByUserId_fkey" FOREIGN KEY ("documentedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "DentalPeriodontalSiteMeasurement" ADD CONSTRAINT "DentalPeriodontalSiteMeasurement_examId_fkey" FOREIGN KEY ("examId") REFERENCES "DentalPeriodontalExam"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "DentalTreatmentPlan" ADD CONSTRAINT "DentalTreatmentPlan_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "Facility"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DentalTreatmentPlan" ADD CONSTRAINT "DentalTreatmentPlan_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DentalTreatmentPlan" ADD CONSTRAINT "DentalTreatmentPlan_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES "Encounter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DentalTreatmentPlan" ADD CONSTRAINT "DentalTreatmentPlan_documentedByUserId_fkey" FOREIGN KEY ("documentedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "DentalTreatmentPlanItem" ADD CONSTRAINT "DentalTreatmentPlanItem_planId_fkey" FOREIGN KEY ("planId") REFERENCES "DentalTreatmentPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DentalTreatmentPlanItem" ADD CONSTRAINT "DentalTreatmentPlanItem_diagnosisId_fkey" FOREIGN KEY ("diagnosisId") REFERENCES "Diagnosis"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "DentalTreatmentPlanItem" ADD CONSTRAINT "DentalTreatmentPlanItem_responsibleUserId_fkey" FOREIGN KEY ("responsibleUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "DentalProcedureRecord" ADD CONSTRAINT "DentalProcedureRecord_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "Facility"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DentalProcedureRecord" ADD CONSTRAINT "DentalProcedureRecord_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DentalProcedureRecord" ADD CONSTRAINT "DentalProcedureRecord_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES "Encounter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DentalProcedureRecord" ADD CONSTRAINT "DentalProcedureRecord_treatmentPlanItemId_fkey" FOREIGN KEY ("treatmentPlanItemId") REFERENCES "DentalTreatmentPlanItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "DentalProcedureRecord" ADD CONSTRAINT "DentalProcedureRecord_providerUserId_fkey" FOREIGN KEY ("providerUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DentalProcedureRecord" ADD CONSTRAINT "DentalProcedureRecord_assistantUserId_fkey" FOREIGN KEY ("assistantUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
