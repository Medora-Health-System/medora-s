-- Multi-user safety: append-only triage assessment saves on EncounterClinicalEvent.
-- Additive enum extension only. No data migration. No backfill.
-- Pre-existing rows are unaffected; existing Triage row + TriageVitalsReading + VITALS_RECORDED
-- behavior preserved.
ALTER TYPE "EncounterClinicalEventType" ADD VALUE 'TRIAGE_ASSESSMENT_SAVED';
