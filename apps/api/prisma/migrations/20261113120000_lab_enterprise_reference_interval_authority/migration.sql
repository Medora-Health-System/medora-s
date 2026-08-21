-- MEDUI.LAB.REF.1 — Enterprise laboratory analyte / reference / critical-value authority (foundation).
-- Does not seed clinical numeric intervals. Does not alter Result.resultData historic rows.

CREATE TYPE "LabSexApplicability" AS ENUM ('ANY', 'MALE', 'FEMALE', 'OTHER');
CREATE TYPE "LabPregnancyApplicability" AS ENUM ('ANY', 'NOT_PREGNANT', 'PREGNANT', 'UNKNOWN');
CREATE TYPE "LabReferenceIntervalStatus" AS ENUM ('ACTIVE', 'SUPERSEDED', 'DRAFT', 'RETIRED');
CREATE TYPE "LabCriticalValuePolicyStatus" AS ENUM ('ACTIVE', 'SUPERSEDED', 'DRAFT', 'RETIRED');

CREATE TABLE "CanonicalLabAnalyte" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "displayNameEn" TEXT NOT NULL,
    "displayNameFr" TEXT,
    "description" TEXT,
    "defaultLoincCode" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CanonicalLabAnalyte_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CanonicalLabAnalyte_code_key" ON "CanonicalLabAnalyte"("code");

CREATE TABLE "CanonicalLabAnalyteAlias" (
    "id" TEXT NOT NULL,
    "canonicalLabAnalyteId" TEXT NOT NULL,
    "aliasCode" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CanonicalLabAnalyteAlias_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CanonicalLabAnalyteAlias_aliasCode_key" ON "CanonicalLabAnalyteAlias"("aliasCode");
CREATE INDEX "CanonicalLabAnalyteAlias_canonicalLabAnalyteId_idx" ON "CanonicalLabAnalyteAlias"("canonicalLabAnalyteId");

CREATE TABLE "LabPanelDefinition" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "displayNameEn" TEXT NOT NULL,
    "displayNameFr" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LabPanelDefinition_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "LabPanelDefinition_code_key" ON "LabPanelDefinition"("code");

CREATE TABLE "LabPanelMember" (
    "id" TEXT NOT NULL,
    "panelId" TEXT NOT NULL,
    "canonicalLabAnalyteId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "unitHint" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LabPanelMember_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "LabPanelMember_panelId_canonicalLabAnalyteId_key" ON "LabPanelMember"("panelId", "canonicalLabAnalyteId");
CREATE INDEX "LabPanelMember_panelId_sortOrder_idx" ON "LabPanelMember"("panelId", "sortOrder");
CREATE INDEX "LabPanelMember_canonicalLabAnalyteId_idx" ON "LabPanelMember"("canonicalLabAnalyteId");

CREATE TABLE "LabReferenceInterval" (
    "id" TEXT NOT NULL,
    "canonicalLabAnalyteId" TEXT NOT NULL,
    "loincCode" TEXT,
    "specimen" TEXT,
    "unit" TEXT,
    "ageMinYears" DOUBLE PRECISION,
    "ageMaxYears" DOUBLE PRECISION,
    "sexApplicability" "LabSexApplicability" NOT NULL DEFAULT 'ANY',
    "pregnancyApplicability" "LabPregnancyApplicability" NOT NULL DEFAULT 'ANY',
    "methodOrAnalyzer" TEXT,
    "low" DOUBLE PRECISION,
    "high" DOUBLE PRECISION,
    "textualInterval" TEXT,
    "sourceName" TEXT NOT NULL,
    "sourceIdentifier" TEXT,
    "sourceUrl" TEXT,
    "sourceVersion" TEXT,
    "sourcePublishedAt" TIMESTAMP(3),
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveTo" TIMESTAMP(3),
    "status" "LabReferenceIntervalStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LabReferenceInterval_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "LabReferenceInterval_canonicalLabAnalyteId_status_idx" ON "LabReferenceInterval"("canonicalLabAnalyteId", "status");
CREATE INDEX "LabReferenceInterval_effectiveFrom_effectiveTo_idx" ON "LabReferenceInterval"("effectiveFrom", "effectiveTo");
CREATE INDEX "LabReferenceInterval_specimen_unit_idx" ON "LabReferenceInterval"("specimen", "unit");

CREATE TABLE "FacilityLabReferenceIntervalOverride" (
    "id" TEXT NOT NULL,
    "facilityId" TEXT NOT NULL,
    "canonicalLabAnalyteId" TEXT NOT NULL,
    "loincCode" TEXT,
    "specimen" TEXT,
    "unit" TEXT,
    "ageMinYears" DOUBLE PRECISION,
    "ageMaxYears" DOUBLE PRECISION,
    "sexApplicability" "LabSexApplicability" NOT NULL DEFAULT 'ANY',
    "pregnancyApplicability" "LabPregnancyApplicability" NOT NULL DEFAULT 'ANY',
    "methodOrAnalyzer" TEXT,
    "low" DOUBLE PRECISION,
    "high" DOUBLE PRECISION,
    "textualInterval" TEXT,
    "sourceName" TEXT,
    "sourceIdentifier" TEXT,
    "sourceUrl" TEXT,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveTo" TIMESTAMP(3),
    "status" "LabReferenceIntervalStatus" NOT NULL DEFAULT 'ACTIVE',
    "validatedByUserId" TEXT,
    "validatedAt" TIMESTAMP(3),
    "validationNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FacilityLabReferenceIntervalOverride_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "FacilityLabReferenceIntervalOverride_facilityId_canonicalLabAnalyteId_status_idx" ON "FacilityLabReferenceIntervalOverride"("facilityId", "canonicalLabAnalyteId", "status");
CREATE INDEX "FacilityLabReferenceIntervalOverride_effectiveFrom_effectiveTo_idx" ON "FacilityLabReferenceIntervalOverride"("effectiveFrom", "effectiveTo");

CREATE TABLE "LabCriticalValuePolicy" (
    "id" TEXT NOT NULL,
    "canonicalLabAnalyteId" TEXT NOT NULL,
    "facilityId" TEXT,
    "specimen" TEXT,
    "unit" TEXT,
    "ageMinYears" DOUBLE PRECISION,
    "ageMaxYears" DOUBLE PRECISION,
    "sexApplicability" "LabSexApplicability" NOT NULL DEFAULT 'ANY',
    "methodOrAnalyzer" TEXT,
    "criticalLow" DOUBLE PRECISION,
    "criticalHigh" DOUBLE PRECISION,
    "textualCritical" TEXT,
    "sourceName" TEXT,
    "sourceIdentifier" TEXT,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveTo" TIMESTAMP(3),
    "status" "LabCriticalValuePolicyStatus" NOT NULL DEFAULT 'ACTIVE',
    "validatedByUserId" TEXT,
    "validatedAt" TIMESTAMP(3),
    "validationNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LabCriticalValuePolicy_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "LabCriticalValuePolicy_canonicalLabAnalyteId_facilityId_status_idx" ON "LabCriticalValuePolicy"("canonicalLabAnalyteId", "facilityId", "status");
CREATE INDEX "LabCriticalValuePolicy_effectiveFrom_effectiveTo_idx" ON "LabCriticalValuePolicy"("effectiveFrom", "effectiveTo");

ALTER TABLE "CanonicalLabAnalyteAlias" ADD CONSTRAINT "CanonicalLabAnalyteAlias_canonicalLabAnalyteId_fkey" FOREIGN KEY ("canonicalLabAnalyteId") REFERENCES "CanonicalLabAnalyte"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "LabPanelMember" ADD CONSTRAINT "LabPanelMember_panelId_fkey" FOREIGN KEY ("panelId") REFERENCES "LabPanelDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "LabPanelMember" ADD CONSTRAINT "LabPanelMember_canonicalLabAnalyteId_fkey" FOREIGN KEY ("canonicalLabAnalyteId") REFERENCES "CanonicalLabAnalyte"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "LabReferenceInterval" ADD CONSTRAINT "LabReferenceInterval_canonicalLabAnalyteId_fkey" FOREIGN KEY ("canonicalLabAnalyteId") REFERENCES "CanonicalLabAnalyte"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "FacilityLabReferenceIntervalOverride" ADD CONSTRAINT "FacilityLabReferenceIntervalOverride_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "Facility"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "FacilityLabReferenceIntervalOverride" ADD CONSTRAINT "FacilityLabReferenceIntervalOverride_canonicalLabAnalyteId_fkey" FOREIGN KEY ("canonicalLabAnalyteId") REFERENCES "CanonicalLabAnalyte"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "LabCriticalValuePolicy" ADD CONSTRAINT "LabCriticalValuePolicy_canonicalLabAnalyteId_fkey" FOREIGN KEY ("canonicalLabAnalyteId") REFERENCES "CanonicalLabAnalyte"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "LabCriticalValuePolicy" ADD CONSTRAINT "LabCriticalValuePolicy_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "Facility"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
