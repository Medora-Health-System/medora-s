-- Multi-user safety: append-only ER disposition supplement saves on EncounterClinicalEvent.
-- Additive enum extension only. No data migration. No backfill.
-- Pre-existing rows are unaffected; existing nursingAssessment.erDispositionV1 flat-blob behavior preserved.
ALTER TYPE "EncounterClinicalEventType" ADD VALUE 'DISPOSITION_SUPPLEMENT_SAVED';
