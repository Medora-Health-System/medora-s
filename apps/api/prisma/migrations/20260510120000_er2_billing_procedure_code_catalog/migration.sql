-- ER-2: CPT/HCPCS reference catalog (additive). Not a payer rule engine; optional annual refresh via import.

CREATE TYPE "BillingProcedureCodeSystem" AS ENUM ('CPT', 'HCPCS');

CREATE TABLE "BillingProcedureCode" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "normalizedCode" TEXT NOT NULL,
    "codeSystem" "BillingProcedureCodeSystem" NOT NULL,
    "shortDescription" TEXT NOT NULL,
    "longDescription" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "effectiveYear" INTEGER,
    "codeSetVersion" VARCHAR(32),
    "searchText" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BillingProcedureCode_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BillingProcedureCode_codeSystem_normalizedCode_key" ON "BillingProcedureCode"("codeSystem", "normalizedCode");
CREATE INDEX "BillingProcedureCode_isActive_idx" ON "BillingProcedureCode"("isActive");
CREATE INDEX "BillingProcedureCode_codeSystem_idx" ON "BillingProcedureCode"("codeSystem");
