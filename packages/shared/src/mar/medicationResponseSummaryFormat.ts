/** MEDUI.MAR.MEDICATION_RESPONSE_POST_SUBMIT_UX_FINALIZATION.1 */

import type { ParsedMarMedicationResponse } from "./marMedicationResponseGovernance.js";

const SIDE_EFFECT_KEYS = [
  "noAdverseReaction",
  "nausea",
  "vomiting",
  "itching",
  "sedation",
  "dizziness",
  "constipation",
  "respiratoryDepression",
] as const;

export type MedicationResponseSideEffectKey = (typeof SIDE_EFFECT_KEYS)[number];

export function listMedicationResponseSideEffectKeys(
  response: ParsedMarMedicationResponse
): MedicationResponseSideEffectKey[] {
  return SIDE_EFFECT_KEYS.filter((key) => response[key] === true);
}

export function resolveMedicationResponsePainTrendLabelKey(
  trend: ParsedMarMedicationResponse["painResponseTrend"]
): string | null {
  if (trend === "IMPROVED") return "marMedicationResponse.reassessment.improved";
  if (trend === "SAME") return "marMedicationResponse.reassessment.same";
  if (trend === "WORSE") return "marMedicationResponse.reassessment.worse";
  return null;
}

export function formatMedicationResponseCountLabel(count: number): string {
  if (count <= 1) return "RESPONSE";
  return `RESPONSE (${count})`;
}

export type MedicationResponseSummaryField = {
  testId?: string;
  text: string;
};

export type BuildMedicationResponseSummaryFieldsInput = {
  outcomeLabel: string;
  responseTimeLabel: string | null;
  documentedAtLabel: string | null;
  documentedByLabel: string | null;
  documentedByUnknownLabel: string;
  painLine: string | null;
  painTrendLine: string | null;
  sideEffectsLine: string | null;
  commentLine: string | null;
};

/** Build ordered summary field lines for unified response summary rendering. */
export function buildMedicationResponseSummaryFields(
  input: BuildMedicationResponseSummaryFieldsInput
): MedicationResponseSummaryField[] {
  const fields: MedicationResponseSummaryField[] = [
    { testId: "mar-medication-response-outcome", text: input.outcomeLabel },
  ];
  if (input.responseTimeLabel) {
    fields.push({ testId: "mar-medication-response-response-time", text: input.responseTimeLabel });
  }
  if (input.documentedAtLabel) {
    fields.push({ testId: "mar-medication-response-documented-at", text: input.documentedAtLabel });
  }
  fields.push({
    testId: "mar-medication-response-documented-by",
    text: input.documentedByLabel ?? input.documentedByUnknownLabel,
  });
  if (input.painLine) {
    fields.push({ testId: "mar-medication-response-pain-summary", text: input.painLine });
  }
  if (input.painTrendLine) {
    fields.push({ testId: "mar-medication-response-pain-trend", text: input.painTrendLine });
  }
  if (input.sideEffectsLine) {
    fields.push({ testId: "mar-medication-response-side-effects-summary", text: input.sideEffectsLine });
  }
  if (input.commentLine) {
    fields.push({ testId: "mar-medication-response-comment", text: input.commentLine });
  }
  return fields;
}
