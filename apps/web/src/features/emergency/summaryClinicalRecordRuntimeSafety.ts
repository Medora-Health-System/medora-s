import type { EncounterClinicalRecord } from "@medora/shared";

/**
 * Phase 3C — decides whether the clinical-record Summary layout may render.
 * Legacy Summary is used when the flag is off or projection fails.
 */
export function shouldUseClinicalRecordSummaryV2(input: {
  flagEnabled: boolean;
  record: EncounterClinicalRecord | null;
  projectionFailed: boolean;
}): boolean {
  if (!input.flagEnabled) return false;
  if (input.projectionFailed) return false;
  if (!input.record) return false;
  return true;
}
