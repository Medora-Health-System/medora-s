import type { DischargeFormState } from "@/lib/encounterDischarge";

/** Provider-facing discharge packet fields (mergeDischargeForSave medical keys + follow-up narrative). */
export const OBSERVATION_DISCHARGE_QUICK_NOTE_PROVIDER_FIELDS = [
  "disposition",
  "dischargeInstructions",
  "medicationsGiven",
  "followUp",
] as const satisfies readonly (keyof DischargeFormState)[];

/** Nursing-facing discharge packet fields. */
export const OBSERVATION_DISCHARGE_QUICK_NOTE_NURSING_FIELDS = [
  "exitCondition",
  "returnIfWorse",
  "patientDestination",
] as const satisfies readonly (keyof DischargeFormState)[];

export type ObservationDischargeQuickNoteProviderField =
  (typeof OBSERVATION_DISCHARGE_QUICK_NOTE_PROVIDER_FIELDS)[number];
export type ObservationDischargeQuickNoteNursingField =
  (typeof OBSERVATION_DISCHARGE_QUICK_NOTE_NURSING_FIELDS)[number];

export type ObservationDischargeQuickNoteDefinition = {
  id: string;
  field: ObservationDischargeQuickNoteProviderField | ObservationDischargeQuickNoteNursingField;
  messageKey: string;
};

export const OBSERVATION_DISCHARGE_PROVIDER_QUICK_NOTES: readonly ObservationDischargeQuickNoteDefinition[] = [
  { id: "stable_course", field: "disposition", messageKey: "observationDischarge.quickNotes.provider.stableCourse" },
  { id: "symptoms_improved", field: "disposition", messageKey: "observationDischarge.quickNotes.provider.symptomsImproved" },
  { id: "vitals_reviewed", field: "dischargeInstructions", messageKey: "observationDischarge.quickNotes.provider.vitalsReviewed" },
  { id: "labs_imaging_reviewed", field: "dischargeInstructions", messageKey: "observationDischarge.quickNotes.provider.labsImagingReviewed" },
  { id: "medications_reviewed", field: "medicationsGiven", messageKey: "observationDischarge.quickNotes.provider.medicationsReviewed" },
  { id: "discharge_home_precautions", field: "followUp", messageKey: "observationDischarge.quickNotes.provider.dischargeHomePrecautions" },
  { id: "transfer_arranged", field: "followUp", messageKey: "observationDischarge.quickNotes.provider.transferRecommended" },
  { id: "ama_counseling", field: "dischargeInstructions", messageKey: "observationDischarge.quickNotes.provider.amaCounseling" },
  { id: "return_precautions", field: "followUp", messageKey: "observationDischarge.quickNotes.provider.returnPrecautions" },
  { id: "follow_up_advised", field: "followUp", messageKey: "observationDischarge.quickNotes.provider.followUpAdvised" },
];

export const OBSERVATION_DISCHARGE_NURSING_QUICK_NOTES: readonly ObservationDischargeQuickNoteDefinition[] = [
  { id: "instructions_reviewed", field: "exitCondition", messageKey: "observationDischarge.quickNotes.nursing.instructionsReviewed" },
  { id: "verbalized_understanding", field: "exitCondition", messageKey: "observationDischarge.quickNotes.nursing.verbalizedUnderstanding" },
  { id: "iv_removed", field: "returnIfWorse", messageKey: "observationDischarge.quickNotes.nursing.ivRemoved" },
  { id: "belongings", field: "patientDestination", messageKey: "observationDischarge.quickNotes.nursing.belongingsReturned" },
  { id: "transport", field: "patientDestination", messageKey: "observationDischarge.quickNotes.nursing.transportArranged" },
  { id: "transfer_paperwork", field: "patientDestination", messageKey: "observationDischarge.quickNotes.nursing.transferPaperwork" },
  { id: "left_ambulatory", field: "exitCondition", messageKey: "observationDischarge.quickNotes.nursing.leftAmbulatory" },
  { id: "ama_witness", field: "returnIfWorse", messageKey: "observationDischarge.quickNotes.nursing.amaWitness" },
];

/**
 * Appends a quick-note snippet into a free-text field. Does not persist; caller applies setState.
 * Inserts a newline when the field already has content.
 */
export function appendQuickNoteToField(current: string, snippet: string): string {
  const s = snippet.trim();
  if (!s) return current;
  const c = current.replace(/\s+$/u, "");
  if (!c) return s;
  return `${c}\n${s}`;
}
