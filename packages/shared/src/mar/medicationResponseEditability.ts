/**
 * MEDUI.MEDICATION.MAR_MEDICATION_RESPONSE_FINALIZATION.1
 * Single shared rule: nurses may document medication response after administration
 * with no time lockout and no completed-cell read-only blocker.
 */

import { requiresEnterprisePainReassessment } from "./enterprisePainReassessmentWorkflow.js";
import {
  isMarMedicationResponseDocumentationEligible,
  resolveMedicationResponseVisibilityTier,
  type MarMedicationResponseVisibilityInput,
} from "./marMedicationResponseVisibilityGovernance.js";

export type MedicationResponseEditabilityInput = MarMedicationResponseVisibilityInput & {
  medicationAdministrationId?: string | null;
  administeredAt?: string | null;
  medicationResponseFollowUp?: { status: "RECOMMENDED" | "OVERDUE" } | null;
  medicationResponses?: readonly unknown[] | null;
};

const NON_ADMINISTERED_DOSE_STATUSES = new Set([
  "PLANNED",
  "DUE",
  "UPCOMING",
  "PENDING",
  "REFUSED",
  "HELD",
  "MISSED",
  "NOT_AVAILABLE",
  "NOT AVAILABLE",
  "CANCELED",
  "CANCELLED",
]);

const ADMINISTERED_DOSE_STATUSES = new Set(["COMPLETED", "DONE", "ADMINISTERED", "GIVEN"]);

const REASSESSMENT_SECONDARY_TEXT = new Set([
  "AWAITING_REASSESSMENT",
  "REASSESSMENT_COMPLETED",
]);

function isBlockedNonAdministeredDose(input: MedicationResponseEditabilityInput): boolean {
  const status = input.doseStatus?.trim().toUpperCase() ?? "";
  if (NON_ADMINISTERED_DOSE_STATUSES.has(status)) return true;
  const secondary = input.secondaryText?.trim().toUpperCase() ?? "";
  return (
    secondary === "REFUSED" ||
    secondary === "HELD" ||
    secondary === "MISSED" ||
    secondary === "NOT AVAILABLE" ||
    secondary === "CANCELED" ||
    secondary === "CANCELLED"
  );
}

/** Dose was actually given (completed administration). */
export function isMedicationAdministrationCompleted(
  input: Pick<MedicationResponseEditabilityInput, "doseStatus" | "administeredAt" | "secondaryText">
): boolean {
  if (isBlockedNonAdministeredDose(input as MedicationResponseEditabilityInput)) return false;
  const status = input.doseStatus?.trim().toUpperCase() ?? "";
  if (ADMINISTERED_DOSE_STATUSES.has(status)) return true;
  if (Boolean(input.administeredAt?.trim())) return true;
  const secondary = input.secondaryText?.trim().toUpperCase() ?? "";
  return REASSESSMENT_SECONDARY_TEXT.has(secondary);
}

/** Response recommended, required, awaiting, or overdue. */
export function isMedicationResponseRecommendedOrRequired(
  input: MedicationResponseEditabilityInput
): boolean {
  const secondary = input.secondaryText?.trim().toUpperCase() ?? "";
  if (secondary === "AWAITING_REASSESSMENT") return true;
  if (input.medicationResponseFollowUp?.status === "RECOMMENDED") return true;
  if (input.medicationResponseFollowUp?.status === "OVERDUE") return true;
  if (resolveMedicationResponseVisibilityTier(input) === "RECOMMENDED") return true;
  return requiresEnterprisePainReassessment({
    medicationLabel: input.medicationLabel,
    genericName: input.genericName,
    prnIndication: input.prnIndication,
    directionsSig: input.directionsSig,
    frequencyCode: input.frequencyCode,
  });
}

export function isMedicationResponseRequired(input: MedicationResponseEditabilityInput): boolean {
  return input.secondaryText?.trim().toUpperCase() === "AWAITING_REASSESSMENT";
}

/** Whether the response panel should render at all. */
export function canShowMedicationResponsePanel(input: MedicationResponseEditabilityInput): boolean {
  if (isBlockedNonAdministeredDose(input)) return false;

  const hasSavedResponses = (input.medicationResponses?.length ?? 0) > 0;
  const administered = isMedicationAdministrationCompleted(input);
  const recommendedOrRequired = isMedicationResponseRecommendedOrRequired(input);
  const tier = resolveMedicationResponseVisibilityTier(input);

  if (tier === "HIDDEN" && !recommendedOrRequired && !hasSavedResponses) return false;
  if (!administered && !hasSavedResponses) return false;

  return tier !== "HIDDEN" || recommendedOrRequired || hasSavedResponses;
}

/**
 * Whether the nurse may edit and submit a medication response.
 * Completed MAR cells and overdue follow-up must NOT block documentation.
 */
export function canDocumentMedicationResponse(input: MedicationResponseEditabilityInput): boolean {
  if (!input.medicationAdministrationId?.trim()) return false;
  if (isBlockedNonAdministeredDose(input)) return false;
  if (!isMedicationAdministrationCompleted(input)) return false;
  if (!isMarMedicationResponseDocumentationEligible(input)) return false;

  const tier = resolveMedicationResponseVisibilityTier(input);
  if (tier === "HIDDEN") {
    return isMedicationResponseRecommendedOrRequired(input);
  }

  return (
    tier === "RECOMMENDED" ||
    tier === "OPTIONAL" ||
    isMedicationResponseRecommendedOrRequired(input)
  );
}

/** Map MAR shift timeline cell fields to editability input. */
export function toMedicationResponseEditabilityInput(item: {
  doseStatus?: string | null;
  secondaryText?: string | null;
  medicationLabel?: string | null;
  primaryText?: string | null;
  frequencyCode?: string | null;
  orderPrnIndication?: string | null;
  isFluidBolus?: boolean | null;
  continuousFluidStatus?: string | null;
  administeredAt?: string | null;
  medicationAdministrationId?: string | null;
  medicationResponseFollowUp?: { status: "RECOMMENDED" | "OVERDUE" } | null;
  medicationResponses?: readonly unknown[] | null;
}): MedicationResponseEditabilityInput {
  const label = item.medicationLabel ?? item.primaryText ?? null;
  return {
    doseStatus: item.doseStatus,
    secondaryText: item.secondaryText,
    medicationLabel: label,
    genericName: label,
    frequencyCode: item.frequencyCode,
    prnIndication: item.orderPrnIndication,
    isFluidBolus: item.isFluidBolus,
    isContinuousFluid: Boolean(item.continuousFluidStatus),
    administeredAt: item.administeredAt,
    medicationAdministrationId: item.medicationAdministrationId,
    medicationResponseFollowUp: item.medicationResponseFollowUp,
    medicationResponses: item.medicationResponses,
  };
}
