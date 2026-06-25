/** MEDUI.MAR.MEDICATION_RESPONSE_POST_SUBMIT_UX_FINALIZATION.1 */

import type { ParsedMarMedicationResponse } from "./marMedicationResponseGovernance.js";
import {
  hasMedicationResponseDocumentedByIdentity,
  resolveMedicationResponseDocumentedByLabel,
} from "./medicationResponseDocumentedByDisplay.js";

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
  documentedByUnknownLabel?: string | null;
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
  if (input.documentedByLabel) {
    fields.push({
      testId: "mar-medication-response-documented-by",
      text: input.documentedByLabel,
    });
  } else if (input.documentedByUnknownLabel) {
    fields.push({
      testId: "mar-medication-response-documented-by",
      text: input.documentedByUnknownLabel,
    });
  }
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

export type BuildMedicationResponseSummaryFieldsFromParsedInput = {
  response: ParsedMarMedicationResponse;
  outcomeLabel: string;
  responseTimePrefix: string;
  documentedAtPrefix: string;
  documentedByPrefix: string;
  documentedByUnknownLabel: string;
  painPrefix: string;
  painTrendPrefix: string;
  sideEffectsPrefix: string;
  commentPrefix: string;
  painTrendLabel: string | null;
  sideEffectLabels: string[];
  formatInstant: (iso: string | null | undefined) => string | null;
};

/** Shared formatter for MAR drawer, history rail, and encounter summary. */
export function buildMedicationResponseSummaryFieldsFromParsed(
  input: BuildMedicationResponseSummaryFieldsFromParsedInput
): MedicationResponseSummaryField[] {
  const documentedBy = resolveMedicationResponseDocumentedByLabel(input.response);
  return buildMedicationResponseSummaryFields({
    outcomeLabel: input.outcomeLabel,
    responseTimeLabel: input.response.responseTime
      ? `${input.responseTimePrefix}: ${input.formatInstant(input.response.responseTime)}`
      : null,
    documentedAtLabel: input.response.documentedAt
      ? `${input.documentedAtPrefix}: ${input.formatInstant(input.response.documentedAt)}`
      : null,
    documentedByLabel: documentedBy ? `${input.documentedByPrefix}: ${documentedBy}` : null,
    documentedByUnknownLabel:
      documentedBy || hasMedicationResponseDocumentedByIdentity(input.response)
        ? null
        : input.documentedByUnknownLabel,
    painLine:
      input.response.painBefore != null && input.response.painAfter != null
        ? `${input.painPrefix}: ${input.response.painBefore}/10 → ${input.response.painAfter}/10`
        : null,
    painTrendLine: input.painTrendLabel
      ? `${input.painTrendPrefix}: ${input.painTrendLabel}`
      : null,
    sideEffectsLine:
      input.sideEffectLabels.length > 0
        ? `${input.sideEffectsPrefix}: ${input.sideEffectLabels.join(", ")}`
        : null,
    commentLine: input.response.responseDetail?.trim()
      ? `${input.commentPrefix}: ${input.response.responseDetail.trim()}`
      : null,
  });
}
