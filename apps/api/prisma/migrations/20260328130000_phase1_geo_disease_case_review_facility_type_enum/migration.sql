-- CreateEnum
CREATE TYPE "FacilityType" AS ENUM ('HOSPITAL', 'CLINIC', 'HEALTH_CENTER', 'LABORATORY', 'SURVEILLANCE_POST', 'COMMUNITY_SITE', 'OTHER');

-- CreateTable
CREATE TABLE "DiseaseCaseReview" (
    "id" TEXT NOT NULL,
    "diseaseCaseReportId" TEXT,
    "reviewerUserId" TEXT,
    "notes" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DiseaseCaseReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GeoDepartment" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GeoDepartment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GeoCommune" (
    "id" TEXT NOT NULL,
    "geoDepartmentId" TEXT NOT NULL,
    "code" TEXT,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GeoCommune_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DiseaseCaseReview_diseaseCaseReportId_idx" ON "DiseaseCaseReview"("diseaseCaseReportId");

-- CreateIndex
CREATE INDEX "DiseaseCaseReview_reviewerUserId_idx" ON "DiseaseCaseReview"("reviewerUserId");

-- CreateIndex
CREATE UNIQUE INDEX "GeoDepartment_code_key" ON "GeoDepartment"("code");

-- CreateIndex
CREATE INDEX "GeoCommune_geoDepartmentId_idx" ON "GeoCommune"("geoDepartmentId");

-- CreateIndex
CREATE INDEX "GeoCommune_name_idx" ON "GeoCommune"("name");

-- AddForeignKey
ALTER TABLE "GeoCommune" ADD CONSTRAINT "GeoCommune_geoDepartmentId_fkey" FOREIGN KEY ("geoDepartmentId") REFERENCES "GeoDepartment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
