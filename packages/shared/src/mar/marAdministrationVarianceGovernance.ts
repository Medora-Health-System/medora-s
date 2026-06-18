/** MEDUI.ED.MAR.H9B — administration variance governance (effective schedule vs actual). */

export const MAR_ADMINISTRATION_VARIANCE_CLASSIFICATIONS = [
  "ON_TIME_ADMINISTRATION",
  "EARLY_ADMINISTRATION",
  "LATE_ADMINISTRATION",
] as const;

export type MarAdministrationVarianceClassification =
  (typeof MAR_ADMINISTRATION_VARIANCE_CLASSIFICATIONS)[number];

export const MAR_ADMINISTRATION_VARIANCE_SEVERITIES = ["LOW", "MODERATE", "HIGH"] as const;

export type MarAdministrationVarianceSeverity =
  (typeof MAR_ADMINISTRATION_VARIANCE_SEVERITIES)[number];

export const MAR_ADMINISTRATION_VARIANCE_ON_TIME_THRESHOLD_MINUTES = 60;

export type MarAdministrationVarianceAssessment = {
  classification: MarAdministrationVarianceClassification;
  varianceMinutes: number;
  severity: MarAdministrationVarianceSeverity;
  reviewRecommended: boolean;
  effectiveScheduledAt: string;
  actualAdministrationAt: string;
};

function parseInstant(value: Date | string): Date | null {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Effective scheduled time for variance = current dose scheduledAt after H9A adjustments.
 * Never use original pre-reschedule time.
 */
export function resolveEffectiveVarianceScheduledTime(input: {
  scheduledAt: Date | string;
  orderedDoseSnapshotJson?: unknown;
}): string {
  const scheduled = parseInstant(input.scheduledAt);
  return scheduled ? scheduled.toISOString() : String(input.scheduledAt);
}

export function classifyMarAdministrationVariance(
  varianceMinutes: number
): MarAdministrationVarianceClassification {
  if (varianceMinutes < -MAR_ADMINISTRATION_VARIANCE_ON_TIME_THRESHOLD_MINUTES) {
    return "EARLY_ADMINISTRATION";
  }
  if (varianceMinutes > MAR_ADMINISTRATION_VARIANCE_ON_TIME_THRESHOLD_MINUTES) {
    return "LATE_ADMINISTRATION";
  }
  return "ON_TIME_ADMINISTRATION";
}

export function assessMarAdministrationVarianceSeverity(
  varianceMinutes: number,
  classification: MarAdministrationVarianceClassification
): MarAdministrationVarianceSeverity {
  if (classification === "ON_TIME_ADMINISTRATION") return "LOW";
  const abs = Math.abs(varianceMinutes);
  if (abs > 120) return "HIGH";
  if (abs > 60) return "MODERATE";
  if (abs > MAR_ADMINISTRATION_VARIANCE_ON_TIME_THRESHOLD_MINUTES) return "LOW";
  return "LOW";
}

export function assessMarAdministrationVariance(input: {
  actualAdministrationTime: Date | string;
  effectiveScheduledTime: Date | string;
}): MarAdministrationVarianceAssessment {
  const actual = parseInstant(input.actualAdministrationTime);
  const effective = parseInstant(input.effectiveScheduledTime);
  const effectiveScheduledAt = effective
    ? effective.toISOString()
    : String(input.effectiveScheduledTime);
  const actualAdministrationAt = actual
    ? actual.toISOString()
    : String(input.actualAdministrationTime);

  if (!actual || !effective) {
    return {
      classification: "ON_TIME_ADMINISTRATION",
      varianceMinutes: 0,
      severity: "LOW",
      reviewRecommended: false,
      effectiveScheduledAt,
      actualAdministrationAt,
    };
  }

  const varianceMinutes = Math.round((actual.getTime() - effective.getTime()) / 60_000);
  const classification = classifyMarAdministrationVariance(varianceMinutes);
  const severity = assessMarAdministrationVarianceSeverity(varianceMinutes, classification);
  const reviewRecommended = severity === "HIGH";

  return {
    classification,
    varianceMinutes,
    severity,
    reviewRecommended,
    effectiveScheduledAt,
    actualAdministrationAt,
  };
}

export function resolveMarAdministrationVarianceHistoryEventType(
  classification: MarAdministrationVarianceClassification,
  isPrn: boolean
): "ADMINISTERED" | "PRN_ADMINISTERED" | "EARLY_ADMINISTRATION" | "LATE_ADMINISTRATION" {
  if (isPrn) return "PRN_ADMINISTERED";
  if (classification === "EARLY_ADMINISTRATION") return "EARLY_ADMINISTRATION";
  if (classification === "LATE_ADMINISTRATION") return "LATE_ADMINISTRATION";
  return "ADMINISTERED";
}

export function resolveMarAdministrationVarianceBadgeLabel(
  classification: MarAdministrationVarianceClassification
): "ON_TIME" | "EARLY" | "LATE" | null {
  if (classification === "ON_TIME_ADMINISTRATION") return "ON_TIME";
  if (classification === "EARLY_ADMINISTRATION") return "EARLY";
  if (classification === "LATE_ADMINISTRATION") return "LATE";
  return null;
}

export function resolveMarAdministrationVarianceLabelKey(
  classification: MarAdministrationVarianceClassification
): string {
  return `marAdministrationVariance.classification.${classification}`;
}

export function resolveMarAdministrationVarianceSeverityLabelKey(
  severity: MarAdministrationVarianceSeverity
): string {
  return `marAdministrationVariance.severity.${severity}`;
}

export function formatMarAdministrationVarianceMinutesLabel(varianceMinutes: number): string {
  const sign = varianceMinutes > 0 ? "+" : "";
  return `${sign}${varianceMinutes} min`;
}
