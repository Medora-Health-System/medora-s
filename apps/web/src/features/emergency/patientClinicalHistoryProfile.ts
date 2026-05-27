/** Phase 19T.3 — Web adapters for patient longitudinal clinical history profile. */
export {
  buildPatientClinicalHistorySummary,
  buildPatientHistoryReconciliationAuditMetadata,
  compareEncounterDraftWithProfile,
  emptyPatientClinicalHistoryProfile,
  PATIENT_CLINICAL_HISTORY_PROFILE_VERSION,
  patientClinicalHistoryProfileFromJson,
  profileHasClinicalContent,
  profilePrimaryProvenance,
  profileToCarryForwardExtraction,
  profileToTriageDraft,
  reconcileEncounterHistoryIntoPatientProfile,
  type PatientClinicalHistoryProfile,
  type PatientHistoryProfileDiff,
  type PatientHistoryReconciliationAction,
  type PatientHistoryReconciliationResult,
  type PatientHistorySectionKey,
} from "@medora/shared";
