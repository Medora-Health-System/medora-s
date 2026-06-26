/** MEDUI.MEDICATION.PULMONARY_RUNTIME_UI_AND_INFUSION_COMPLETION.1 */

import type { ParsedRespiratoryMedicationResponse } from "./respiratoryMedicationResponseGovernance.js";
import {
  hasMedicationResponseDocumentedByIdentity,
  resolveMedicationResponseDocumentedByLabel,
} from "./medicationResponseDocumentedByDisplay.js";

export type RespiratoryMedicationResponseSummaryField = {
  testId?: string;
  text: string;
};

export function buildRespiratoryMedicationResponseSummaryFields(input: {
  response: ParsedRespiratoryMedicationResponse;
  outcomeLabel: string;
  responseTimePrefix: string;
  documentedAtPrefix: string;
  documentedByPrefix: string;
  documentedByUnknownLabel: string;
  respiratoryRatePrefix: string;
  oxygenPrefix: string;
  wheezingPrefix: string;
  workOfBreathingPrefix: string;
  nebulizerPrefix: string;
  spacerPrefix: string;
  commentPrefix: string;
  yesLabel: string;
  noLabel: string;
  formatInstant: (iso: string | null | undefined) => string | null;
}): RespiratoryMedicationResponseSummaryField[] {
  const fields: RespiratoryMedicationResponseSummaryField[] = [
    { testId: "mar-respiratory-response-outcome", text: input.outcomeLabel },
  ];

  if (input.response.responseTime) {
    fields.push({
      testId: "mar-respiratory-response-response-time",
      text: `${input.responseTimePrefix}: ${input.formatInstant(input.response.responseTime)}`,
    });
  }
  if (input.response.documentedAt) {
    fields.push({
      testId: "mar-respiratory-response-documented-at",
      text: `${input.documentedAtPrefix}: ${input.formatInstant(input.response.documentedAt)}`,
    });
  }

  const documentedBy = resolveMedicationResponseDocumentedByLabel({
    documentedBy: input.response.documentedBy ?? null,
    documentedByDisplayName: input.response.documentedByDisplayName ?? null,
    documentedByInitials: input.response.documentedByInitials ?? null,
    documentedByName: input.response.documentedByName ?? null,
    documentedByUserId: input.response.documentedByUserId ?? null,
  });
  if (documentedBy) {
    fields.push({
      testId: "mar-respiratory-response-documented-by",
      text: `${input.documentedByPrefix}: ${documentedBy}`,
    });
  } else if (!hasMedicationResponseDocumentedByIdentity({
    documentedBy: input.response.documentedBy ?? null,
    documentedByDisplayName: input.response.documentedByDisplayName ?? null,
    documentedByInitials: input.response.documentedByInitials ?? null,
    documentedByName: input.response.documentedByName ?? null,
    documentedByUserId: input.response.documentedByUserId ?? null,
  })) {
    fields.push({
      testId: "mar-respiratory-response-documented-by",
      text: input.documentedByUnknownLabel,
    });
  }

  if (input.response.respiratoryRateBefore != null && input.response.respiratoryRateAfter != null) {
    fields.push({
      testId: "mar-respiratory-response-rr",
      text: `${input.respiratoryRatePrefix}: ${input.response.respiratoryRateBefore} → ${input.response.respiratoryRateAfter}`,
    });
  }
  if (
    input.response.oxygenSaturationBefore != null &&
    input.response.oxygenSaturationAfter != null
  ) {
    fields.push({
      testId: "mar-respiratory-response-spo2",
      text: `${input.oxygenPrefix}: ${input.response.oxygenSaturationBefore}% → ${input.response.oxygenSaturationAfter}%`,
    });
  }
  if (input.response.wheezingBefore != null && input.response.wheezingAfter != null) {
    fields.push({
      testId: "mar-respiratory-response-wheezing",
      text: `${input.wheezingPrefix}: ${input.response.wheezingBefore ? input.yesLabel : input.noLabel} → ${input.response.wheezingAfter ? input.yesLabel : input.noLabel}`,
    });
  }
  if (input.response.workOfBreathing?.trim()) {
    fields.push({
      testId: "mar-respiratory-response-work-of-breathing",
      text: `${input.workOfBreathingPrefix}: ${input.response.workOfBreathing.trim()}`,
    });
  }
  if (input.response.nebulizerCompletion === true) {
    fields.push({
      testId: "mar-respiratory-response-nebulizer",
      text: `${input.nebulizerPrefix}: ${input.yesLabel}`,
    });
  }
  if (input.response.mdiSpacerUsed === true) {
    fields.push({
      testId: "mar-respiratory-response-spacer",
      text: `${input.spacerPrefix}: ${input.yesLabel}`,
    });
  }
  if (input.response.responseDetail?.trim()) {
    fields.push({
      testId: "mar-respiratory-response-comment",
      text: `${input.commentPrefix}: ${input.response.responseDetail.trim()}`,
    });
  }

  return fields;
}
