/** MEDUI.ED.MAR.TIME.CERTIFICATION.1 — non-blocking medication timing advisory tiers. */

export const MAR_STANDARD_WINDOW_MINUTES = 60 as const;
export const MAR_SIGNIFICANT_DIFFERENCE_MINUTES = 240 as const;
/** Upper bound for yellow standard-window advisory (61–120 min from scheduled). */
export const MAR_STANDARD_WINDOW_ADVISORY_MAX_MINUTES = 120 as const;

export type MarMedicationTimingAdvisorySeverity =
  | "NONE"
  | "STANDARD_WINDOW"
  | "SIGNIFICANT_DIFFERENCE";

export const MAR_MEDICATION_TIMING_ADVISORY_MESSAGE_KEYS = {
  NONE: null,
  STANDARD_WINDOW: "marScheduleTiming.outsideWindowAdvisory",
  SIGNIFICANT_DIFFERENCE: "marScheduleTiming.significantDifferenceAdvisory",
} as const;

export type MarMedicationTimingAdvisory = {
  severity: MarMedicationTimingAdvisorySeverity;
  messageKey: string | null;
  deltaMinutes: number;
};

function parseInstant(value: Date | string | null | undefined): Date | null {
  if (value == null) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function absMinutes(a: Date, b: Date): number {
  return Math.round(Math.abs(a.getTime() - b.getTime()) / 60_000);
}

function advisoryForSeverity(
  severity: MarMedicationTimingAdvisorySeverity,
  deltaMinutes: number
): MarMedicationTimingAdvisory {
  return {
    severity,
    messageKey: MAR_MEDICATION_TIMING_ADVISORY_MESSAGE_KEYS[severity],
    deltaMinutes,
  };
}

/**
 * Classifies timing variance for advisory UI only — never blocks save or requires reason.
 */
export function resolveMarMedicationTimingAdvisory(input: {
  scheduledAt?: Date | string | null;
  clinicalEventAt: Date | string;
  documentedAt?: Date | string | null;
  isPrn?: boolean;
}): MarMedicationTimingAdvisory {
  const clinical = parseInstant(input.clinicalEventAt);
  if (!clinical) {
    return advisoryForSeverity("NONE", 0);
  }

  const documented = parseInstant(input.documentedAt);
  const scheduled = parseInstant(input.scheduledAt);
  const isPrn = input.isPrn === true;

  const documentedDelta = documented ? absMinutes(clinical, documented) : 0;
  const scheduledDelta =
    !isPrn && scheduled ? absMinutes(clinical, scheduled) : 0;

  if (
    documentedDelta > MAR_SIGNIFICANT_DIFFERENCE_MINUTES ||
    scheduledDelta > MAR_SIGNIFICANT_DIFFERENCE_MINUTES
  ) {
    return advisoryForSeverity(
      "SIGNIFICANT_DIFFERENCE",
      Math.max(documentedDelta, scheduledDelta)
    );
  }

  if (!isPrn && scheduled && scheduledDelta > MAR_STANDARD_WINDOW_MINUTES) {
    return advisoryForSeverity("STANDARD_WINDOW", scheduledDelta);
  }

  if (isPrn && documentedDelta > MAR_STANDARD_WINDOW_MINUTES) {
    return advisoryForSeverity("NONE", documentedDelta);
  }

  return advisoryForSeverity("NONE", Math.max(documentedDelta, scheduledDelta));
}

export function marMedicationTimingAdvisoryIsBlocking(
  advisory: MarMedicationTimingAdvisory | null | undefined
): boolean {
  void advisory;
  return false;
}
