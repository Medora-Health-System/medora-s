/**
 * Exhaustive registry of ED narrative-bearing sources supported by the encounter record projection.
 * Adding a source requires an explicit record disposition; the Summary remains a read projection.
 */
export const ED_CLINICAL_DOCUMENTATION_DISPOSITIONS = [
  "INCLUDE_FULL",
  "INCLUDE_STRUCTURED",
  "REFERENCE",
  "EXCLUDE_WITH_REASON",
] as const;
export type EdClinicalDocumentationDisposition =
  (typeof ED_CLINICAL_DOCUMENTATION_DISPOSITIONS)[number];

export const ED_CLINICAL_DOCUMENTATION_CATALOG = [
  { source: "TRIAGE_CHIEF_COMPLAINT", owner: "TriageAssessment/Encounter", disposition: "INCLUDE_FULL" },
  { source: "TRIAGE_NARRATIVE", owner: "TriageAssessment", disposition: "INCLUDE_FULL" },
  { source: "TRIAGE_ARRIVAL_CONTEXT", owner: "TriageAssessment", disposition: "INCLUDE_STRUCTURED" },
  { source: "INITIAL_NURSING_ASSESSMENT", owner: "Encounter.nursingAssessment.nursingEvalV1", disposition: "INCLUDE_STRUCTURED" },
  { source: "NURSING_REASSESSMENT", owner: "EncounterClinicalEvent/NURSING_ASSESSMENT_SAVED", disposition: "INCLUDE_STRUCTURED" },
  { source: "ENCOUNTER_NURSING_NOTE", owner: "EncounterNote", disposition: "INCLUDE_FULL" },
  { source: "ENCOUNTER_PROVIDER_NOTE", owner: "EncounterNote", disposition: "INCLUDE_FULL" },
  { source: "ENCOUNTER_TECHNICIAN_NOTE", owner: "EncounterNote", disposition: "INCLUDE_FULL" },
  { source: "ENCOUNTER_OTHER_NOTE", owner: "EncounterNote", disposition: "INCLUDE_FULL" },
  { source: "LEGACY_ER_NOTE", owner: "Encounter.nursingAssessment.erNotesV1", disposition: "INCLUDE_FULL" },
  { source: "PROVIDER_DOCUMENTATION", owner: "Encounter.nursingAssessment/provider documentation", disposition: "INCLUDE_STRUCTURED" },
  { source: "PROVIDER_MSE_HISTORY", owner: "EncounterClinicalEvent/PROVIDER_MSE_SAVED", disposition: "INCLUDE_STRUCTURED" },
  { source: "PROCEDURE_DOCUMENTATION", owner: "EncounterProcedure", disposition: "INCLUDE_STRUCTURED" },
  { source: "HANDOFF_NURSING", owner: "EncounterClinicalEvent/HANDOFF_NURSING", disposition: "INCLUDE_STRUCTURED" },
  { source: "DISPOSITION_DOCUMENTATION", owner: "Encounter disposition supplement", disposition: "INCLUDE_STRUCTURED" },
  { source: "DISCHARGE_DOCUMENTATION", owner: "Encounter discharge summary/provider+nursing discharge", disposition: "INCLUDE_STRUCTURED" },
  { source: "ADMISSION_TRANSFER_DOCUMENTATION", owner: "Encounter admission summary/clinical event", disposition: "INCLUDE_STRUCTURED" },
  { source: "MEDICATION_ADMINISTRATION", owner: "MedicationAdministration", disposition: "REFERENCE" },
  { source: "ORDER_COMMENT", owner: "Order", disposition: "EXCLUDE_WITH_REASON", reason: "Order comments are workflow data; no ED legal narrative field is implemented." },
] as const satisfies readonly {
  source: string;
  owner: string;
  disposition: EdClinicalDocumentationDisposition;
  reason?: string;
}[];
