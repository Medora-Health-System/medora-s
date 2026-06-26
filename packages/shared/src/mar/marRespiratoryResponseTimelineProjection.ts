/** MEDUI.MEDICATION.PULMONARY_RUNTIME_UI_AND_INFUSION_COMPLETION.1 */

import { buildMarMedicationResponseFollowUpSummary } from "./marMedicationResponseFollowUpGovernance.js";
import {
  parseRespiratoryMedicationResponseNotes,
  sortRespiratoryMedicationResponsesNewestFirst,
} from "./respiratoryMedicationResponseNotes.js";
import type { ParsedRespiratoryMedicationResponse } from "./respiratoryMedicationResponseGovernance.js";
import type { MarPainResponseTimelineProjectionInput } from "./marPainResponseTimelineProjection.js";

export type MarRespiratoryResponseTimelineProjection = {
  secondaryText: string;
  respiratoryMedicationResponses?: ParsedRespiratoryMedicationResponse[];
  medicationResponseBadge?: {
    label: "RESPONSE";
    displayLabel: string;
    count: number;
    severity: "routine" | "neutral" | "safety";
  } | null;
  medicationResponseFollowUp?: {
    status: "RECOMMENDED" | "OVERDUE";
    earliestAt: string | null;
    latestAt: string | null;
    responseCount: number;
    showAdverseEscalation: boolean;
  } | null;
  responseRequired: boolean;
  responseCompleted: boolean;
  responseDocumentationAvailable: boolean;
};

export function buildMarRespiratoryResponseTimelineProjection(
  input: MarPainResponseTimelineProjectionInput
): MarRespiratoryResponseTimelineProjection {
  const administrationNotes = input.administrationNotes?.trim() || null;
  const respiratoryMedicationResponses = sortRespiratoryMedicationResponsesNewestFirst(
    parseRespiratoryMedicationResponseNotes(administrationNotes)
  );
  const responseCompleted = respiratoryMedicationResponses.length > 0;
  const administered =
    Boolean(input.administeredAt?.trim()) ||
    input.doseStatus?.trim().toUpperCase() === "COMPLETED" ||
    input.doseStatus?.trim().toUpperCase() === "DONE" ||
    input.doseStatus?.trim().toUpperCase() === "ADMINISTERED" ||
    input.marAction === "administered";

  const followUpSummary = buildMarMedicationResponseFollowUpSummary({
    doseStatus: input.doseStatus ?? null,
    secondaryText: input.defaultSecondaryText,
    medicationLabel: input.medicationLabel ?? "",
    frequencyCode: input.frequencyCode,
    directionsSig: input.directionsSig,
    prnIndication: input.prnIndication,
    route: null,
    administeredAt: input.administeredAt,
    responses: [],
  });

  let secondaryText = input.defaultSecondaryText;
  if (responseCompleted) {
    secondaryText = "RESPONSE_COMPLETED";
  } else if (administered && followUpSummary.status === "OVERDUE") {
    secondaryText = "RESPONSE_OVERDUE";
  } else if (administered) {
    secondaryText = "RESPONSE_RECOMMENDED";
  }

  const medicationResponseBadge = responseCompleted
    ? {
        label: "RESPONSE" as const,
        displayLabel: "RESPONSE",
        count: respiratoryMedicationResponses.length,
        severity:
          respiratoryMedicationResponses.some((r) => r.responseCode === "BRONCHOSPASM")
            ? ("safety" as const)
            : ("routine" as const),
      }
    : null;

  return {
    secondaryText,
    respiratoryMedicationResponses:
      respiratoryMedicationResponses.length > 0 ? respiratoryMedicationResponses : undefined,
    medicationResponseBadge,
    medicationResponseFollowUp:
      followUpSummary.status === "RECOMMENDED" || followUpSummary.status === "OVERDUE"
        ? {
            status: followUpSummary.status,
            earliestAt: followUpSummary.earliestAt,
            latestAt: followUpSummary.latestAt,
            responseCount: respiratoryMedicationResponses.length,
            showAdverseEscalation: respiratoryMedicationResponses.some(
              (r) => r.responseCode === "BRONCHOSPASM"
            ),
          }
        : null,
    responseRequired: false,
    responseCompleted,
    responseDocumentationAvailable: administered,
  };
}
