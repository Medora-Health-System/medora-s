/** MEDUI.MAR.MEDICATION_RESPONSE_UI_STANDARDIZATION.1 */

export const MAR_MEDICATION_RESPONSE_INTERNAL_SECONDARY_TEXT = new Set([
  "AWAITING_REASSESSMENT",
  "REASSESSMENT_COMPLETED",
  "RESPONSE_COMPLETED",
  "RESPONSE_RECOMMENDED",
  "RESPONSE_REQUIRED",
  "RESPONSE_OVERDUE",
]);

export type MarMedicationResponseTimelineLabelInput = {
  secondaryText?: string | null;
  medicationResponseFollowUp?: {
    status: "RECOMMENDED" | "OVERDUE";
    responseCount?: number;
  } | null;
  responseCount?: number;
  responseRequired?: boolean;
};

export function isMarMedicationResponseInternalSecondaryText(
  secondaryText: string | null | undefined
): boolean {
  const normalized = secondaryText?.trim().toUpperCase() ?? "";
  return MAR_MEDICATION_RESPONSE_INTERNAL_SECONDARY_TEXT.has(normalized);
}

/** i18n key for nurse-friendly MAR timeline response status (never raw enum text). */
export function resolveMarMedicationResponseTimelineLabelKey(
  input: MarMedicationResponseTimelineLabelInput
): string | null {
  const secondary = input.secondaryText?.trim().toUpperCase() ?? "";
  const count = Math.max(
    input.responseCount ?? 0,
    input.medicationResponseFollowUp?.responseCount ?? 0
  );

  if (secondary === "RESPONSE_COMPLETED" || secondary === "REASSESSMENT_COMPLETED") {
    const effectiveCount = Math.max(count, 1);
    return effectiveCount > 1
      ? "marMedicationResponse.timeline.completedCount"
      : "marMedicationResponse.timeline.completed";
  }

  if (secondary === "RESPONSE_OVERDUE") {
    return "marMedicationResponse.timeline.overdue";
  }

  if (secondary === "RESPONSE_REQUIRED") {
    return "marMedicationResponse.timeline.required";
  }

  if (secondary === "RESPONSE_RECOMMENDED") {
    return "marMedicationResponse.timeline.recommended";
  }

  if (count > 0 && secondary !== "AWAITING_REASSESSMENT") {
    return count > 1
      ? "marMedicationResponse.timeline.completedCount"
      : "marMedicationResponse.timeline.completed";
  }

  if (secondary === "AWAITING_REASSESSMENT") {
    if (input.medicationResponseFollowUp?.status === "OVERDUE") {
      return "marMedicationResponse.timeline.overdue";
    }
    if (input.responseRequired) {
      return "marMedicationResponse.timeline.required";
    }
    return "marMedicationResponse.timeline.recommended";
  }

  return null;
}

export function resolveMarMedicationResponseBadgeLabelKey(count: number): string {
  if (count <= 1) return "marMedicationResponse.timeline.badgeCompleted";
  return "marMedicationResponse.timeline.badgeCompletedCount";
}

export function resolveMarShiftTimelineLatestResponsePainScores(
  responses: ReadonlyArray<{ painBefore: number | null; painAfter: number | null }> | null | undefined
): { before: number; after: number } | null {
  if (!responses?.length) return null;
  for (const response of responses) {
    if (response.painBefore != null && response.painAfter != null) {
      return { before: response.painBefore, after: response.painAfter };
    }
  }
  return null;
}
