-- Phase 2B.2 — MRV classifier foundation (additive only)

-- CreateTable
CREATE TABLE "TermClassifier" (
    "id" TEXT NOT NULL,
    "domain" VARCHAR(32) NOT NULL,
    "code" VARCHAR(64) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortPriority" INTEGER NOT NULL DEFAULT 0,
    "searchText" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TermClassifier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TermClassifierLabel" (
    "id" TEXT NOT NULL,
    "classifierId" TEXT NOT NULL,
    "locale" VARCHAR(8) NOT NULL,
    "displayName" TEXT NOT NULL,
    "definition" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TermClassifierLabel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TermClassifierAlias" (
    "id" TEXT NOT NULL,
    "classifierId" TEXT NOT NULL,
    "alias" TEXT NOT NULL,
    "language" VARCHAR(8),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TermClassifierAlias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CatalogClassifierBackfillAudit" (
    "id" TEXT NOT NULL,
    "runId" VARCHAR(64) NOT NULL,
    "catalogTable" VARCHAR(64) NOT NULL,
    "catalogRowId" TEXT NOT NULL,
    "catalogCode" VARCHAR(64),
    "fieldName" VARCHAR(64) NOT NULL,
    "legacyValue" TEXT,
    "classifierId" TEXT,
    "status" VARCHAR(32) NOT NULL,
    "message" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CatalogClassifierBackfillAudit_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "CatalogImagingStudy" ADD COLUMN     "bodyRegionClassifierId" TEXT,
ADD COLUMN     "modalityClassifierId" TEXT,
ADD COLUMN     "contrastTypeClassifierId" TEXT,
ADD COLUMN     "viewCountClassifierId" TEXT;

-- AlterTable
ALTER TABLE "CatalogLabTest" ADD COLUMN     "labCategoryClassifierId" TEXT;

-- CreateIndex
CREATE INDEX "TermClassifier_domain_idx" ON "TermClassifier"("domain");

-- CreateIndex
CREATE INDEX "TermClassifier_domain_isActive_idx" ON "TermClassifier"("domain", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "TermClassifier_domain_code_key" ON "TermClassifier"("domain", "code");

-- CreateIndex
CREATE INDEX "TermClassifierLabel_classifierId_idx" ON "TermClassifierLabel"("classifierId");

-- CreateIndex
CREATE UNIQUE INDEX "TermClassifierLabel_classifierId_locale_key" ON "TermClassifierLabel"("classifierId", "locale");

-- CreateIndex
CREATE INDEX "TermClassifierAlias_classifierId_idx" ON "TermClassifierAlias"("classifierId");

-- CreateIndex
CREATE INDEX "TermClassifierAlias_alias_idx" ON "TermClassifierAlias"("alias");

-- CreateIndex
CREATE UNIQUE INDEX "TermClassifierAlias_classifierId_alias_key" ON "TermClassifierAlias"("classifierId", "alias");

-- CreateIndex
CREATE INDEX "CatalogClassifierBackfillAudit_runId_idx" ON "CatalogClassifierBackfillAudit"("runId");

-- CreateIndex
CREATE INDEX "CatalogClassifierBackfillAudit_catalogTable_catalogRowId_idx" ON "CatalogClassifierBackfillAudit"("catalogTable", "catalogRowId");

-- CreateIndex
CREATE INDEX "CatalogClassifierBackfillAudit_status_idx" ON "CatalogClassifierBackfillAudit"("status");

-- CreateIndex
CREATE INDEX "CatalogImagingStudy_bodyRegionClassifierId_idx" ON "CatalogImagingStudy"("bodyRegionClassifierId");

-- CreateIndex
CREATE INDEX "CatalogImagingStudy_modalityClassifierId_idx" ON "CatalogImagingStudy"("modalityClassifierId");

-- CreateIndex
CREATE INDEX "CatalogImagingStudy_contrastTypeClassifierId_idx" ON "CatalogImagingStudy"("contrastTypeClassifierId");

-- CreateIndex
CREATE INDEX "CatalogImagingStudy_viewCountClassifierId_idx" ON "CatalogImagingStudy"("viewCountClassifierId");

-- CreateIndex
CREATE INDEX "CatalogLabTest_labCategoryClassifierId_idx" ON "CatalogLabTest"("labCategoryClassifierId");

-- AddForeignKey
ALTER TABLE "TermClassifierLabel" ADD CONSTRAINT "TermClassifierLabel_classifierId_fkey" FOREIGN KEY ("classifierId") REFERENCES "TermClassifier"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "TermClassifierAlias" ADD CONSTRAINT "TermClassifierAlias_classifierId_fkey" FOREIGN KEY ("classifierId") REFERENCES "TermClassifier"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "CatalogClassifierBackfillAudit" ADD CONSTRAINT "CatalogClassifierBackfillAudit_classifierId_fkey" FOREIGN KEY ("classifierId") REFERENCES "TermClassifier"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "CatalogImagingStudy" ADD CONSTRAINT "CatalogImagingStudy_bodyRegionClassifierId_fkey" FOREIGN KEY ("bodyRegionClassifierId") REFERENCES "TermClassifier"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "CatalogImagingStudy" ADD CONSTRAINT "CatalogImagingStudy_modalityClassifierId_fkey" FOREIGN KEY ("modalityClassifierId") REFERENCES "TermClassifier"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "CatalogImagingStudy" ADD CONSTRAINT "CatalogImagingStudy_contrastTypeClassifierId_fkey" FOREIGN KEY ("contrastTypeClassifierId") REFERENCES "TermClassifier"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "CatalogImagingStudy" ADD CONSTRAINT "CatalogImagingStudy_viewCountClassifierId_fkey" FOREIGN KEY ("viewCountClassifierId") REFERENCES "TermClassifier"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "CatalogLabTest" ADD CONSTRAINT "CatalogLabTest_labCategoryClassifierId_fkey" FOREIGN KEY ("labCategoryClassifierId") REFERENCES "TermClassifier"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
