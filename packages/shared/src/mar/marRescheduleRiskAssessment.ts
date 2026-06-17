/** MEDUI.ED.MAR.H9A — schedule reschedule risk classification. */

import { getZonedWallClockParts } from "../medication/medicationDoseExpansionPlanner.js";

export const MAR_RESCHEDULE_RISK_SEVERITIES = ["LOW", "MODERATE", "HIGH"] as const;

export type MarRescheduleRiskSeverity = (typeof MAR_RESCHEDULE_RISK_SEVERITIES)[number];

export type MarRescheduleRiskAssessment = {
  severity: MarRescheduleRiskSeverity;
  movedMinutes: number;
  crossedShiftBoundary: boolean;
  crossedCalendarDay: boolean;
  reviewRecommended: boolean;
};

function parseInstant(value: Date | string): Date | null {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function facilityLocalDateKey(instant: Date, facilityTimeZone: string): string {
  const parts = getZonedWallClockParts(instant, facilityTimeZone);
  return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
}

/** Day shift bucket: 07:00–18:59 facility-local; night: otherwise (7P–7A model). */
export function resolveMarRescheduleShiftBucket(
  instant: Date | string,
  facilityTimeZone: string
): "DAY" | "NIGHT" {
  const date = parseInstant(instant);
  if (!date) return "DAY";
  const parts = getZonedWallClockParts(date, facilityTimeZone);
  const minutes = parts.hour * 60 + parts.minute;
  const dayStart = 7 * 60;
  const dayEnd = 19 * 60;
  return minutes >= dayStart && minutes < dayEnd ? "DAY" : "NIGHT";
}

export function assessMarRescheduleRisk(input: {
  previousScheduledAt: Date | string;
  newScheduledAt: Date | string;
  facilityTimeZone?: string | null;
}): MarRescheduleRiskAssessment {
  const previous = parseInstant(input.previousScheduledAt);
  const next = parseInstant(input.newScheduledAt);
  const tz = input.facilityTimeZone?.trim() || "UTC";

  if (!previous || !next) {
    return {
      severity: "LOW",
      movedMinutes: 0,
      crossedShiftBoundary: false,
      crossedCalendarDay: false,
      reviewRecommended: false,
    };
  }

  const movedMinutes = Math.max(
    1,
    Math.round(Math.abs(next.getTime() - previous.getTime()) / 60_000)
  );
  const crossedCalendarDay =
    facilityLocalDateKey(previous, tz) !== facilityLocalDateKey(next, tz);
  const crossedShiftBoundary =
    resolveMarRescheduleShiftBucket(previous, tz) !== resolveMarRescheduleShiftBucket(next, tz);

  let severity: MarRescheduleRiskSeverity = "LOW";
  if (movedMinutes > 120 || crossedCalendarDay || crossedShiftBoundary) {
    severity = "HIGH";
  } else if (movedMinutes > 30) {
    severity = "MODERATE";
  }

  const reviewRecommended = severity === "HIGH";

  return {
    severity,
    movedMinutes,
    crossedShiftBoundary,
    crossedCalendarDay,
    reviewRecommended,
  };
}
