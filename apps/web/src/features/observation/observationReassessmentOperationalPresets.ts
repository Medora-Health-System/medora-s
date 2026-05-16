/**
 * Operational reassessment narrative presets (encounterChrome.observationReassessment.quickPhrases.*).
 * Used by `ObservationReassessmentModal` and tests.
 */
export const OBSERVATION_REASSESSMENT_OPERATIONAL_PRESET_IDS = [
  "presetStable",
  "presetImproving",
  "presetPendingResults",
  "presetAwaitingImaging",
  "presetAwaitingConsult",
  "presetNeedsRepeatVitals",
  "presetContinueObservation",
  "presetEscalateReview",
] as const;

export type ObservationReassessmentOperationalPresetId = (typeof OBSERVATION_REASSESSMENT_OPERATIONAL_PRESET_IDS)[number];
