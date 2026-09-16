-- CreateEnum
ALTER TYPE "AuditAction" ADD VALUE 'FACILITY_CONFIGURATION_UPDATE';

-- CreateTable
CREATE TABLE "FacilityConfiguration" (
    "id" TEXT NOT NULL,
    "facilityId" TEXT NOT NULL,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "settingsJson" JSONB NOT NULL,
    "updatedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FacilityConfiguration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FacilityConfigurationRevision" (
    "id" TEXT NOT NULL,
    "configurationId" TEXT NOT NULL,
    "facilityId" TEXT NOT NULL,
    "revision" INTEGER NOT NULL,
    "settingsJson" JSONB NOT NULL,
    "changedByUserId" TEXT NOT NULL,
    "reason" TEXT,
    "ip" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FacilityConfigurationRevision_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FacilityConfiguration_facilityId_key" ON "FacilityConfiguration"("facilityId");

-- CreateIndex
CREATE INDEX "FacilityConfiguration_updatedAt_idx" ON "FacilityConfiguration"("updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "FacilityConfigurationRevision_facilityId_revision_key" ON "FacilityConfigurationRevision"("facilityId", "revision");

-- CreateIndex
CREATE INDEX "FacilityConfigurationRevision_facilityId_createdAt_idx" ON "FacilityConfigurationRevision"("facilityId", "createdAt");

-- CreateIndex
CREATE INDEX "FacilityConfigurationRevision_configurationId_idx" ON "FacilityConfigurationRevision"("configurationId");

-- AddForeignKey
ALTER TABLE "FacilityConfiguration" ADD CONSTRAINT "FacilityConfiguration_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "Facility"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FacilityConfigurationRevision" ADD CONSTRAINT "FacilityConfigurationRevision_configurationId_fkey" FOREIGN KEY ("configurationId") REFERENCES "FacilityConfiguration"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
