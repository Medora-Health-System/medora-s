-- AlterTable
ALTER TABLE "CatalogImagingStudy" ADD COLUMN     "bodyRegion" TEXT,
ADD COLUMN     "displayNameFr" TEXT,
ADD COLUMN     "isEssential" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "modality" TEXT,
ADD COLUMN     "searchText" TEXT,
ADD COLUMN     "sortPriority" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "CatalogLabTest" ADD COLUMN     "displayNameFr" TEXT,
ADD COLUMN     "isEssential" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "searchText" TEXT,
ADD COLUMN     "sortPriority" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "LabTestAlias" (
    "id" TEXT NOT NULL,
    "catalogLabTestId" TEXT NOT NULL,
    "alias" TEXT NOT NULL,
    "language" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LabTestAlias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImagingStudyAlias" (
    "id" TEXT NOT NULL,
    "catalogImagingStudyId" TEXT NOT NULL,
    "alias" TEXT NOT NULL,
    "language" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImagingStudyAlias_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LabTestAlias_catalogLabTestId_idx" ON "LabTestAlias"("catalogLabTestId");

-- CreateIndex
CREATE INDEX "LabTestAlias_alias_idx" ON "LabTestAlias"("alias");

-- CreateIndex
CREATE UNIQUE INDEX "LabTestAlias_catalogLabTestId_alias_key" ON "LabTestAlias"("catalogLabTestId", "alias");

-- CreateIndex
CREATE INDEX "ImagingStudyAlias_catalogImagingStudyId_idx" ON "ImagingStudyAlias"("catalogImagingStudyId");

-- CreateIndex
CREATE INDEX "ImagingStudyAlias_alias_idx" ON "ImagingStudyAlias"("alias");

-- CreateIndex
CREATE UNIQUE INDEX "ImagingStudyAlias_catalogImagingStudyId_alias_key" ON "ImagingStudyAlias"("catalogImagingStudyId", "alias");

-- AddForeignKey
ALTER TABLE "LabTestAlias" ADD CONSTRAINT "LabTestAlias_catalogLabTestId_fkey" FOREIGN KEY ("catalogLabTestId") REFERENCES "CatalogLabTest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImagingStudyAlias" ADD CONSTRAINT "ImagingStudyAlias_catalogImagingStudyId_fkey" FOREIGN KEY ("catalogImagingStudyId") REFERENCES "CatalogImagingStudy"("id") ON DELETE CASCADE ON UPDATE CASCADE;
