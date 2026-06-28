-- MEDUI.CARE_PROCEDURES.CANONICAL_CATALOG_FOUNDATION.1
CREATE TABLE "CatalogProcedure" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "displayNameEn" TEXT,
    "displayNameFr" TEXT,
    "category" TEXT NOT NULL,
    "executionRoleCategory" TEXT NOT NULL,
    "orderable" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deprecatedBy" TEXT,
    "documentationTemplateId" TEXT,
    "billingCode" TEXT,
    "defaultInstructions" TEXT,
    "requiresProviderOrder" BOOLEAN NOT NULL DEFAULT false,
    "nursingProtocolAllowed" BOOLEAN NOT NULL DEFAULT true,
    "requiresClinicalNote" BOOLEAN NOT NULL DEFAULT false,
    "searchText" TEXT,
    "sortPriority" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CatalogProcedure_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CatalogProcedureAlias" (
    "id" TEXT NOT NULL,
    "catalogProcedureId" TEXT NOT NULL,
    "alias" TEXT NOT NULL,
    "language" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CatalogProcedureAlias_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CatalogProcedure_code_key" ON "CatalogProcedure"("code");
CREATE INDEX "CatalogProcedure_isActive_idx" ON "CatalogProcedure"("isActive");
CREATE INDEX "CatalogProcedure_category_idx" ON "CatalogProcedure"("category");
CREATE INDEX "CatalogProcedure_orderable_idx" ON "CatalogProcedure"("orderable");

CREATE UNIQUE INDEX "CatalogProcedureAlias_catalogProcedureId_alias_key" ON "CatalogProcedureAlias"("catalogProcedureId", "alias");
CREATE INDEX "CatalogProcedureAlias_catalogProcedureId_idx" ON "CatalogProcedureAlias"("catalogProcedureId");
CREATE INDEX "CatalogProcedureAlias_alias_idx" ON "CatalogProcedureAlias"("alias");

ALTER TABLE "CatalogProcedureAlias" ADD CONSTRAINT "CatalogProcedureAlias_catalogProcedureId_fkey" FOREIGN KEY ("catalogProcedureId") REFERENCES "CatalogProcedure"("id") ON DELETE CASCADE ON UPDATE CASCADE;
