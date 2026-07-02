/**
 * Safe rollout switch for EncounterClinicalRecord-based ER Summary layout (Phase 3B).
 * Default: legacy Summary. Enable via NEXT_PUBLIC_SUMMARY_CLINICAL_RECORD_V2=true
 * or dev localStorage key medora:SUMMARY_CLINICAL_RECORD_V2=true.
 */

export const SUMMARY_CLINICAL_RECORD_V2_STORAGE_KEY = "medora:SUMMARY_CLINICAL_RECORD_V2";

export function isSummaryClinicalRecordV2Enabled(): boolean {
  if (process.env.NEXT_PUBLIC_SUMMARY_CLINICAL_RECORD_V2 === "true") {
    return true;
  }
  if (typeof window !== "undefined" && process.env.NODE_ENV !== "production") {
    try {
      return window.localStorage.getItem(SUMMARY_CLINICAL_RECORD_V2_STORAGE_KEY) === "true";
    } catch {
      return false;
    }
  }
  return false;
}
