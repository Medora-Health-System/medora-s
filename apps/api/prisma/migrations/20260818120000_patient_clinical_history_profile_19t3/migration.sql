-- Phase 19T.3 — patient longitudinal clinical history profile
ALTER TABLE "Patient" ADD COLUMN "clinicalHistoryProfileJson" JSONB;
