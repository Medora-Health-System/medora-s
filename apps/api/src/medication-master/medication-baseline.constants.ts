/** Phase 19H — global medication baseline sources (no runtime activation). */

export const MEDICATION_BASELINE_SOURCES = ["PRIORITY_ER_INVENTORY"] as const;

export type MedicationBaselineSource = (typeof MEDICATION_BASELINE_SOURCES)[number];

export const MEDICATION_BASELINE_SOURCE_PRIORITY_ER: MedicationBaselineSource =
  "PRIORITY_ER_INVENTORY";
