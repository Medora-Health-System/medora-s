/**
 * MEDUI.MEDICATION.MAR_PAIN_RESPONSE_AND_ENTERPRISE_SEED_ENGINE.1
 * Shared MAR timeline projection for post-administration pain reassessment / medication response.
 */

import {
  buildMarMedicationResponseTimelineBadge,
  parseMarMedicationResponseNotes,
  sortMarMedicationResponsesNewestFirst,
  type ParsedMarMedicationResponse,
} from "./marMedicationResponseGovernance.js";
import { buildMarMedicationResponseFollowUpSummary } from "./marMedicationResponseFollowUpGovernance.js";
import {
  resolveEnterprisePainReassessmentMarStatus,
  resolveEnterprisePainReassessmentTimelineSecondaryText,
} from "./enterprisePainReassessmentWorkflow.js";
import { shouldUseRespiratoryMedicationResponsePathway } from "./respiratoryMedicationResponseGovernance.js";
import { buildMarRespiratoryResponseTimelineProjection } from "./marRespiratoryResponseTimelineProjection.js";

export type MarPainResponseTimelineProjectionInput = {
  catalogCode?: string | null;
  medicationLabel?: string | null;
  genericName?: string | null;
  marAction?: string | null;
  administrationNotes?: string | null;
  administeredAt?: string | null;
  doseStatus?: string | null;
  frequencyCode?: string | null;
  directionsSig?: string | null;
  prnIndication?: string | null;
  defaultSecondaryText: string;
};

export type MarPainResponseTimelineProjection = {
  secondaryText: string;
  medicationResponses?: ParsedMarMedicationResponse[];
  respiratoryMedicationResponses?: import("./respiratoryMedicationResponseGovernance.js").ParsedRespiratoryMedicationResponse[];
  medicationResponseBadge?: ReturnType<typeof buildMarMedicationResponseTimelineBadge>;
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

export function buildMarPainResponseTimelineProjection(
  input: MarPainResponseTimelineProjectionInput
): MarPainResponseTimelineProjection {
  if (
    shouldUseRespiratoryMedicationResponsePathway({
      catalogCode: input.catalogCode,
      medicationLabel: input.medicationLabel,
      genericName: input.genericName,
    })
  ) {
    const respiratory = buildMarRespiratoryResponseTimelineProjection(input);
    return {
      secondaryText: respiratory.secondaryText,
      medicationResponses: undefined,
      respiratoryMedicationResponses: respiratory.respiratoryMedicationResponses,
      medicationResponseBadge: respiratory.medicationResponseBadge,
      medicationResponseFollowUp: respiratory.medicationResponseFollowUp,
      responseRequired: respiratory.responseRequired,
      responseCompleted: respiratory.responseCompleted,
      responseDocumentationAvailable: respiratory.responseDocumentationAvailable,
    };
  }

  const administrationNotes = input.administrationNotes?.trim() || null;
  const painStatusInput = {
    catalogCode: input.catalogCode,
    medicationLabel: input.medicationLabel,
    genericName: input.genericName,
    marAction: input.marAction,
    administrationNotes,
    administeredAt: input.administeredAt,
    doseStatus: input.doseStatus,
    prnIndication: input.prnIndication,
    directionsSig: input.directionsSig,
    frequencyCode: input.frequencyCode,
  };

  const secondaryText = resolveEnterprisePainReassessmentTimelineSecondaryText(
    painStatusInput,
    input.defaultSecondaryText
  );
  const painStatus = resolveEnterprisePainReassessmentMarStatus(painStatusInput);

  const medicationResponses = sortMarMedicationResponsesNewestFirst(
    parseMarMedicationResponseNotes(administrationNotes)
  );
  const medicationResponseBadge = buildMarMedicationResponseTimelineBadge(administrationNotes);
  const followUpSummary = buildMarMedicationResponseFollowUpSummary({
    doseStatus: input.doseStatus ?? null,
    secondaryText,
    medicationLabel: input.medicationLabel ?? "",
    frequencyCode: input.frequencyCode,
    directionsSig: input.directionsSig,
    prnIndication: input.prnIndication,
    administeredAt: input.administeredAt ?? null,
    administrationNotes,
    responses: medicationResponses,
  });

  const medicationResponseFollowUp =
    followUpSummary.status === "RECOMMENDED" || followUpSummary.status === "OVERDUE"
      ? {
          status: followUpSummary.status,
          earliestAt: followUpSummary.earliestAt,
          latestAt: followUpSummary.latestAt,
          responseCount: followUpSummary.responseCount,
          showAdverseEscalation: false,
        }
      : painStatus === "AWAITING_REASSESSMENT"
        ? {
            status: "RECOMMENDED" as const,
            earliestAt: input.administeredAt ?? null,
            latestAt: null,
            responseCount: 0,
            showAdverseEscalation: false,
          }
        : null;

  return {
    secondaryText,
    medicationResponses: medicationResponses.length > 0 ? medicationResponses : undefined,
    medicationResponseBadge,
    medicationResponseFollowUp,
    responseRequired: painStatus === "AWAITING_REASSESSMENT",
    responseCompleted: painStatus === "REASSESSMENT_COMPLETED",
    responseDocumentationAvailable:
      painStatus === "AWAITING_REASSESSMENT" || painStatus === "REASSESSMENT_COMPLETED",
  };
}
