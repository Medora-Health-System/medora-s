-- Multi-user safety: append-only discharge summary saves on EncounterClinicalEvent.
-- Additive enum extension only. No data migration. No backfill.
-- Pre-existing rows are unaffected; existing dischargeSummaryJson flat-blob behavior preserved.
ALTER TYPE "EncounterClinicalEventType" ADD VALUE 'DISCHARGE_SUMMARY_SAVED';
