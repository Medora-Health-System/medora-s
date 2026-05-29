-- MEDPROC.2: canonical enterprise procedure identity on CARE order lines (nullable, additive).
ALTER TABLE "OrderItem" ADD COLUMN "enterpriseProcedureId" TEXT;

CREATE INDEX "OrderItem_enterpriseProcedureId_idx" ON "OrderItem"("enterpriseProcedureId");
