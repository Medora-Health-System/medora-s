import { ConflictException } from "@nestjs/common";

/**
 * Stable code returned in the 409 body when a triage save is rejected because the caller's
 * `lastKnownTriageUpdatedAt` token no longer matches the current `Triage.updatedAt` AND the save
 * would materially change non-vitals flat triage fields. Mirrors the encounter concurrency
 * pattern (`ENCOUNTER_CONCURRENT_MODIFICATION_CODE`) so frontend callers can detect this case
 * generically and surface a localized refresh prompt without touching the local draft.
 *
 * Vitals-only and no-op saves never reach this guard — the shared
 * `triageAssessmentSnapshotChanged` util excludes vitals + system metadata, so an append-only
 * vitals reading or an unchanged save passes through and continues to land its
 * `TriageVitalsReading` + `VITALS_RECORDED` history rows.
 */
export const TRIAGE_CONCURRENT_MODIFICATION_CODE = "TRIAGE_CONCURRENT_MODIFICATION";

export function throwTriageConcurrentModification(): never {
  throw new ConflictException({
    statusCode: 409,
    code: TRIAGE_CONCURRENT_MODIFICATION_CODE,
    message: TRIAGE_CONCURRENT_MODIFICATION_CODE,
  });
}
