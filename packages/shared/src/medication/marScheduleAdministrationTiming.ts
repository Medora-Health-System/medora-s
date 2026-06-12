import { formatClinicalDateTimeInZone } from "../clinical/clinicalTimeZone.js";

export type MarScheduleAdministrationTimingKind = "on_time" | "early" | "late";

export type MarScheduleAdministrationTimingResult = {
  kind: MarScheduleAdministrationTimingKind;
  /** Facility-local display of scheduled anchor time. */
  scheduledTimeDisplay: string;
  requiresReason: boolean;
};

function parseInstant(value: Date | string | null | undefined): Date | null {
  if (value == null) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Early/late administration governance relative to scheduled/due window (K.10B.5).
 * Uses administered/effective time vs scheduledAt and due window bounds.
 */
export function evaluateMarScheduleAdministrationTiming(input: {
  administeredAt: Date | string;
  scheduledAt: Date | string;
  dueWindowStartAt?: Date | string | null;
  dueWindowEndAt?: Date | string | null;
  facilityTimeZone: string;
  locale?: string;
}): MarScheduleAdministrationTimingResult {
  const administered = parseInstant(input.administeredAt);
  const scheduled = parseInstant(input.scheduledAt);
  const locale = input.locale ?? "en-US";
  const tz = input.facilityTimeZone;

  if (!administered || !scheduled) {
    return { kind: "on_time", scheduledTimeDisplay: "", requiresReason: false };
  }

  const scheduledDisplay = formatClinicalDateTimeInZone(scheduled, locale, tz);
  const dueStart = parseInstant(input.dueWindowStartAt) ?? scheduled;
  const dueEnd = parseInstant(input.dueWindowEndAt) ?? scheduled;

  const adminMs = administered.getTime();
  if (adminMs < dueStart.getTime()) {
    return { kind: "early", scheduledTimeDisplay: scheduledDisplay, requiresReason: true };
  }
  if (adminMs > dueEnd.getTime()) {
    return { kind: "late", scheduledTimeDisplay: scheduledDisplay, requiresReason: true };
  }
  return { kind: "on_time", scheduledTimeDisplay: scheduledDisplay, requiresReason: false };
}
