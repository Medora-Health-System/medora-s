-- Phase 19B.3: store canonical entity ids after manual promotion
ALTER TABLE "MedicationFormularyImportStaging" ADD COLUMN "promotionResultJson" JSONB;
