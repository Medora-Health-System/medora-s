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
  /** Full sentence inserted into the field (editable by user before save). */
  insertKey: string;
  /** Short chip / button label (French in `fr.ts` for product UI). */
  chipLabelKey: string;
};

const chipProv = (id: string) => `observationDischarge.chips.provider.${id}`;
const chipNur = (id: string) => `observationDischarge.chips.nursing.${id}`;

export const OBSERVATION_DISCHARGE_PROVIDER_QUICK_NOTES: readonly ObservationDischargeQuickNoteDefinition[] = [
  {
    id: "stable_course",
    field: "disposition",
    insertKey: "observationDischarge.quickNotes.provider.stableCourse",
    chipLabelKey: chipProv("stable_course"),
  },
  {
    id: "improved_stable",
    field: "disposition",
    insertKey: "observationDischarge.quickNotes.provider.improvedStable",
    chipLabelKey: chipProv("improved_stable"),
  },
  {
    id: "symptoms_improved",
    field: "disposition",
    insertKey: "observationDischarge.quickNotes.provider.symptomsImproved",
    chipLabelKey: chipProv("symptoms_improved"),
  },
  {
    id: "tolerating_po",
    field: "dischargeInstructions",
    insertKey: "observationDischarge.quickNotes.provider.toleratingPo",
    chipLabelKey: chipProv("tolerating_po"),
  },
  {
    id: "ambulating_safely",
    field: "dischargeInstructions",
    insertKey: "observationDischarge.quickNotes.provider.ambulatingSafely",
    chipLabelKey: chipProv("ambulating_safely"),
  },
  {
    id: "no_acute_distress",
    field: "dischargeInstructions",
    insertKey: "observationDischarge.quickNotes.provider.noAcuteDistress",
    chipLabelKey: chipProv("no_acute_distress"),
  },
  {
    id: "vitals_reviewed",
    field: "dischargeInstructions",
    insertKey: "observationDischarge.quickNotes.provider.vitalsReviewed",
    chipLabelKey: chipProv("vitals_reviewed"),
  },
  {
    id: "labs_imaging_reviewed",
    field: "dischargeInstructions",
    insertKey: "observationDischarge.quickNotes.provider.labsImagingReviewed",
    chipLabelKey: chipProv("labs_imaging_reviewed"),
  },
  {
    id: "medications_reviewed",
    field: "medicationsGiven",
    insertKey: "observationDischarge.quickNotes.provider.medicationsReviewed",
    chipLabelKey: chipProv("medications_reviewed"),
  },
  {
    id: "discharge_home_precautions",
    field: "followUp",
    insertKey: "observationDischarge.quickNotes.provider.dischargeHomePrecautions",
    chipLabelKey: chipProv("discharge_home_precautions"),
  },
  {
    id: "transfer_arranged",
    field: "followUp",
    insertKey: "observationDischarge.quickNotes.provider.transferRecommended",
    chipLabelKey: chipProv("transfer_arranged"),
  },
  {
    id: "ama_counseling",
    field: "dischargeInstructions",
    insertKey: "observationDischarge.quickNotes.provider.amaCounseling",
    chipLabelKey: chipProv("ama_counseling"),
  },
  {
    id: "return_precautions",
    field: "followUp",
    insertKey: "observationDischarge.quickNotes.provider.returnPrecautions",
    chipLabelKey: chipProv("return_precautions"),
  },
  {
    id: "follow_up_advised",
    field: "followUp",
    insertKey: "observationDischarge.quickNotes.provider.followUpAdvised",
    chipLabelKey: chipProv("follow_up_advised"),
  },
  {
    id: "verbalized_understanding_provider",
    field: "followUp",
    insertKey: "observationDischarge.quickNotes.provider.verbalizedUnderstandingProvider",
    chipLabelKey: chipProv("verbalized_understanding_provider"),
  },
];

export const OBSERVATION_DISCHARGE_NURSING_QUICK_NOTES: readonly ObservationDischargeQuickNoteDefinition[] = [
  {
    id: "instructions_reviewed",
    field: "exitCondition",
    insertKey: "observationDischarge.quickNotes.nursing.instructionsReviewed",
    chipLabelKey: chipNur("instructions_reviewed"),
  },
  {
    id: "verbalized_understanding",
    field: "exitCondition",
    insertKey: "observationDischarge.quickNotes.nursing.verbalizedUnderstanding",
    chipLabelKey: chipNur("verbalized_understanding"),
  },
  {
    id: "iv_removed",
    field: "returnIfWorse",
    insertKey: "observationDischarge.quickNotes.nursing.ivRemoved",
    chipLabelKey: chipNur("iv_removed"),
  },
  {
    id: "vitals_stable",
    field: "exitCondition",
    insertKey: "observationDischarge.quickNotes.nursing.vitalsStable",
    chipLabelKey: chipNur("vitals_stable"),
  },
  {
    id: "discharge_teaching_completed",
    field: "exitCondition",
    insertKey: "observationDischarge.quickNotes.nursing.dischargeTeachingCompleted",
    chipLabelKey: chipNur("discharge_teaching_completed"),
  },
  {
    id: "pain_controlled_nursing",
    field: "exitCondition",
    insertKey: "observationDischarge.quickNotes.nursing.painControlled",
    chipLabelKey: chipNur("pain_controlled_nursing"),
  },
  {
    id: "left_ambulatory",
    field: "exitCondition",
    insertKey: "observationDischarge.quickNotes.nursing.leftAmbulatory",
    chipLabelKey: chipNur("left_ambulatory"),
  },
  {
    id: "wheelchair_escort",
    field: "patientDestination",
    insertKey: "observationDischarge.quickNotes.nursing.wheelchairEscort",
    chipLabelKey: chipNur("wheelchair_escort"),
  },
  {
    id: "belongings",
    field: "patientDestination",
    insertKey: "observationDischarge.quickNotes.nursing.belongingsReturned",
    chipLabelKey: chipNur("belongings"),
  },
  {
    id: "transport",
    field: "patientDestination",
    insertKey: "observationDischarge.quickNotes.nursing.transportArranged",
    chipLabelKey: chipNur("transport"),
  },
  {
    id: "awaiting_transport",
    field: "patientDestination",
    insertKey: "observationDischarge.quickNotes.nursing.awaitingTransport",
    chipLabelKey: chipNur("awaiting_transport"),
  },
  {
    id: "family_notified",
    field: "patientDestination",
    insertKey: "observationDischarge.quickNotes.nursing.familyNotified",
    chipLabelKey: chipNur("family_notified"),
  },
  {
    id: "transfer_paperwork",
    field: "patientDestination",
    insertKey: "observationDischarge.quickNotes.nursing.transferPaperwork",
    chipLabelKey: chipNur("transfer_paperwork"),
  },
  {
    id: "ama_witness",
    field: "returnIfWorse",
    insertKey: "observationDischarge.quickNotes.nursing.amaWitness",
    chipLabelKey: chipNur("ama_witness"),
  },
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
