/**
 * Encounter Clinical Record — enterprise clinical read-model projection.
 */

export type {
  BuildEncounterClinicalRecordInput,
  EncounterClinicalRecord,
  EncounterClinicalRecordAuditClassification,
  EncounterClinicalRecordAuditTimelineEntry,
  EncounterClinicalRecordClinicalMilestone,
  EncounterClinicalRecordClinicalTimelineEntry,
  EncounterClinicalRecordDiagnosis,
  EncounterClinicalRecordDisposition,
  EncounterClinicalRecordHeader,
  EncounterClinicalRecordImagingResult,
  EncounterClinicalRecordLaboratoryResult,
  EncounterClinicalRecordLocale,
  EncounterClinicalRecordMedicationAdministration,
  EncounterClinicalRecordNursingAssessment,
  EncounterClinicalRecordNursingAssessmentHistoryEntry,
  EncounterClinicalRecordOrderRow,
  EncounterClinicalRecordProcedure,
  EncounterClinicalRecordProviderAssessment,
  EncounterClinicalRecordProviderAssessmentHistoryEntry,
  EncounterClinicalRecordProviderStatus,
  EncounterClinicalRecordSignature,
  EncounterClinicalRecordTextBlock,
  EncounterClinicalRecordVitalPoint,
} from "./encounterClinicalRecordTypes.js";

export {
  buildProviderAssessmentHistory,
  dedupeClinicalTimelineEntries,
  dedupeImagingResults,
  dedupeLaboratoryResults,
  dedupeMedicationAdministrations,
  dedupeOrderRows,
  dedupeProcedures,
  isClinicalMilestoneEventType,
  isProviderSaveEventType,
  isWorkflowOrderEventType,
  resolveClinicalMilestoneFromEventType,
  resolveNursingAssessmentPrimary,
  resolveProviderAssessmentPrimary,
  resolveProviderDocumentationStatus,
} from "./encounterClinicalRecordDedupe.js";

export { buildEncounterClinicalRecord } from "./encounterClinicalRecordBuilder.js";
