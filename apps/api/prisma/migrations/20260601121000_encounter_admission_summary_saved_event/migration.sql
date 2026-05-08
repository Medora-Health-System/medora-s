-- Multi-user safety: append-only admission summary saves on EncounterClinicalEvent.
-- Additive enum extension only. No data migration. No backfill.
-- Pre-existing rows are unaffected; existing admissionSummaryJson flat-blob behavior preserved.
ALTER TYPE "EncounterClinicalEventType" ADD VALUE 'ADMISSION_SUMMARY_SAVED';
