/** MEDUI.MEDICATION.ENTERPRISE_MEDICATION_ADMINISTRATION_SAFETY.1 — unified follow-up engine. */

import { buildMarPainResponseTimelineProjection } from "./marPainResponseTimelineProjection.js";
import { buildMarMedicationResponseFollowUpSummary } from "./marMedicationResponseFollowUpGovernance.js";
import { shouldUseRespiratoryMedicationResponsePathway } from "./respiratoryMedicationResponseGovernance.js";
import {
  parseRespiratoryMedicationResponseNotes,
  sortRespiratoryMedicationResponsesNewestFirst,
} from "./respiratoryMedicationResponseNotes.js";
import {
  parseMarMedicationResponseNotes,
  sortMarMedicationResponsesNewestFirst,
} from "./marMedicationResponseGovernance.js";
import {
  resolveMedicationAdministrationLifecycleState,
  type MedicationAdministrationLifecycleInput,
} from "./medicationAdministrationEnterpriseLifecycle.js";
import { resolveMedicationFollowUpType } from "./medicationFollowUpRegistry.js";
import {
  resolveMedicationFollowUpPathwayFromType,
  type MedicationFollowUpPathway,
  type MedicationFollowUpType,
  type MedicationAdministrationLifecycleState,
} from "./medicationFollowUpTypes.js";
import type { MarPainResponseTimelineProjectionInput } from "./marPainResponseTimelineProjection.js";
import type { ParsedMarMedicationResponse } from "./marMedicationResponseGovernance.js";
import type { ParsedRespiratoryMedicationResponse } from "./respiratoryMedicationResponseGovernance.js";

export type MedicationFollowUpEngineInput = MarPainResponseTimelineProjectionInput &
  Omit<MedicationAdministrationLifecycleInput, "followUpType"> & {
    catalogCode?: string | null;
    route?: string | null;
    doseKind?: string | null;
    clinicalAction?: string | null;
    manualLabel?: string | null;
    manualSecondaryText?: string | null;
    prnIndication?: string | null;
    pharmacyVerified?: boolean | null;
    orderStatus?: string | null;
    referenceAt?: string | Date | null;
    followUpType?: MedicationFollowUpType;
  };

export type MedicationFollowUpEngineResult = {
  followUpType: MedicationFollowUpType;
  pathway: MedicationFollowUpPathway;
  lifecycleState: MedicationAdministrationLifecycleState;
  secondaryText: string;
  medicationResponses?: ParsedMarMedicationResponse[];
  respiratoryMedicationResponses?: ParsedRespiratoryMedicationResponse[];
  medicationResponseBadge?: ReturnType<typeof buildMarPainResponseTimelineProjection>["medicationResponseBadge"];
  medicationResponseFollowUp?: ReturnType<typeof buildMarPainResponseTimelineProjection>["medicationResponseFollowUp"];
  responseRequired: boolean;
  responseCompleted: boolean;
  responseDocumentationAvailable: boolean;
  responseCount: number;
};

export function resolveMedicationFollowUpTypeFromInput(
  input: MedicationFollowUpEngineInput
): MedicationFollowUpType {
  if (shouldUseRespiratoryMedicationResponsePathway(input)) return "RESPIRATORY";
  return resolveMedicationFollowUpType(input);
}

/** Single engine entry — all medication types plug into one workflow. */
export function buildMedicationFollowUpProjection(
  input: MedicationFollowUpEngineInput
): MedicationFollowUpEngineResult {
  const followUpType = resolveMedicationFollowUpTypeFromInput(input);
  const pathway = resolveMedicationFollowUpPathwayFromType(followUpType);

  const timelineProjection = buildMarPainResponseTimelineProjection(input);

  const administrationNotes = input.administrationNotes?.trim() || null;
  const painResponses = sortMarMedicationResponsesNewestFirst(
    parseMarMedicationResponseNotes(administrationNotes)
  );
  const respiratoryResponses = sortRespiratoryMedicationResponsesNewestFirst(
    parseRespiratoryMedicationResponseNotes(administrationNotes)
  );
  const responseCount = Math.max(painResponses.length, respiratoryResponses.length);

  const followUpSummary =
    followUpType !== "NONE"
      ? buildMarMedicationResponseFollowUpSummary({
          doseStatus: input.doseStatus ?? null,
          secondaryText: timelineProjection.secondaryText,
          medicationLabel: input.medicationLabel ?? "",
          frequencyCode: input.frequencyCode,
          directionsSig: input.directionsSig,
          prnIndication: input.prnIndication,
          route: input.route,
          administeredAt: input.administeredAt,
          administrationNotes,
          responses: pathway === "pain" ? painResponses : [],
          referenceAt: input.referenceAt,
        })
      : null;

  const responseCompleted =
    pathway === "respiratory"
      ? respiratoryResponses.length > 0
      : pathway === "pain"
        ? painResponses.length > 0
        : false;

  const lifecycleState = resolveMedicationAdministrationLifecycleState({
    ...input,
    followUpType,
    followUpStatus: followUpSummary?.status ?? null,
    responseCompleted,
  });

  const responseRequired =
    followUpType !== "NONE" &&
    pathway !== "none" &&
    (timelineProjection.responseRequired ||
      timelineProjection.secondaryText === "AWAITING_REASSESSMENT" ||
      followUpSummary?.status === "OVERDUE");

  return {
    followUpType,
    pathway,
    lifecycleState,
    secondaryText: timelineProjection.secondaryText,
    medicationResponses: timelineProjection.medicationResponses,
    respiratoryMedicationResponses: timelineProjection.respiratoryMedicationResponses,
    medicationResponseBadge: timelineProjection.medicationResponseBadge,
    medicationResponseFollowUp:
      timelineProjection.medicationResponseFollowUp ??
      (followUpSummary?.status === "RECOMMENDED" || followUpSummary?.status === "OVERDUE"
        ? {
            status: followUpSummary.status,
            earliestAt: followUpSummary.earliestAt,
            latestAt: followUpSummary.latestAt,
            responseCount,
            showAdverseEscalation: false,
          }
        : null),
    responseRequired,
    responseCompleted,
    responseDocumentationAvailable: timelineProjection.responseDocumentationAvailable,
    responseCount,
  };
}
