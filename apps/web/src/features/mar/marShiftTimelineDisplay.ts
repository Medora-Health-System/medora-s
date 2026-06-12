import type { CSSProperties } from "react";
import {
  getZonedWallClockParts,
  resolveMarShiftTimelinePerformerLabel,
  toMedicationAdministrationEffectiveTimeIsoUtc,
  wallClockToUtc,
} from "@medora/shared";
import type {
  MarShiftTimelineCellItem,
  MarShiftTimelineDrawerAction,
} from "@/lib/marShiftTimelineApi";

export { resolveMarShiftTimelinePerformerLabel as marShiftTimelineDrawerPerformerValue };

export const MAR_SHIFT_TIMELINE_MUTATION_ACTIONS = new Set<MarShiftTimelineDrawerAction>([
  "ADMINISTER",
  "START_INFUSION",
  "STOP_INFUSION",
  "REFUSE",
  "HOLD",
]);

export function isMarShiftTimelineMutationAction(action: MarShiftTimelineDrawerAction): boolean {
  return MAR_SHIFT_TIMELINE_MUTATION_ACTIONS.has(action);
}

export function isMarShiftTimelineDrawerReadOnly(item: MarShiftTimelineCellItem): boolean {
  return item.readOnly === true;
}

export function marShiftTimelinePrimaryDrawerAction(
  item: MarShiftTimelineCellItem
): MarShiftTimelineDrawerAction | null {
  if (item.clinicalAction === "START_INFUSION") return "START_INFUSION";
  if (item.clinicalAction === "STOP_INFUSION") return "STOP_INFUSION";
  if (item.clinicalAction === "ADMINISTER") return "ADMINISTER";
  return null;
}

function padDateTimeLocalPart(value: number): string {
  return String(value).padStart(2, "0");
}

/** `datetime-local` value from ISO instant in facility (or browser) local wall clock. */
export function toMarShiftTimelineDateTimeLocalValue(
  iso: string | null | undefined,
  facilityTimeZone?: string | null
): string {
  if (!iso?.trim()) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";

  const tz = facilityTimeZone?.trim();
  if (tz) {
    const parts = getZonedWallClockParts(date, tz);
    return `${parts.year}-${padDateTimeLocalPart(parts.month)}-${padDateTimeLocalPart(parts.day)}T${padDateTimeLocalPart(parts.hour)}:${padDateTimeLocalPart(parts.minute)}`;
  }

  return `${date.getFullYear()}-${padDateTimeLocalPart(date.getMonth() + 1)}-${padDateTimeLocalPart(date.getDate())}T${padDateTimeLocalPart(date.getHours())}:${padDateTimeLocalPart(date.getMinutes())}`;
}

/** Parse `datetime-local` wall clock in facility TZ → UTC ISO for API storage. */
export function marShiftTimelineDateTimeLocalToUtcIso(
  localValue: string | null | undefined,
  facilityTimeZone?: string | null
): string | null {
  if (!localValue?.trim()) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(localValue.trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const tz = facilityTimeZone?.trim();
  const date = tz
    ? wallClockToUtc(year, month, day, hour, minute, tz)
    : new Date(localValue);
  if (Number.isNaN(date.getTime())) return null;
  return toMedicationAdministrationEffectiveTimeIsoUtc(date);
}

export function defaultMarShiftTimelineStartTimeValue(
  item: MarShiftTimelineCellItem,
  facilityTimeZone?: string | null
): string {
  if (item.startedAt?.trim()) {
    return toMarShiftTimelineDateTimeLocalValue(item.startedAt, facilityTimeZone);
  }
  if (item.scheduledAt?.trim()) {
    return toMarShiftTimelineDateTimeLocalValue(item.scheduledAt, facilityTimeZone);
  }
  return toMarShiftTimelineDateTimeLocalValue(new Date().toISOString(), facilityTimeZone);
}

export function defaultMarShiftTimelineStopTimeValue(
  item: MarShiftTimelineCellItem,
  facilityTimeZone?: string | null
): string {
  if (item.stoppedAt?.trim()) {
    return toMarShiftTimelineDateTimeLocalValue(item.stoppedAt, facilityTimeZone);
  }
  return toMarShiftTimelineDateTimeLocalValue(new Date().toISOString(), facilityTimeZone);
}

export function formatMarShiftTimelineHeaderClock(date: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    month: "numeric",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function formatMarShiftTimelineDueWindow(
  startIso: string,
  endIso: string,
  locale: string,
  facilityTimeZone?: string | null
): string {
  const options: Intl.DateTimeFormatOptions = {
    hour: "numeric",
    minute: "2-digit",
  };
  const tz = facilityTimeZone?.trim();
  if (tz) options.timeZone = tz;

  const formatter = new Intl.DateTimeFormat(locale, options);
  const start = formatter.format(new Date(startIso));
  const end = formatter.format(new Date(endIso));
  return `${start} – ${end}`;
}

export function buildMarShiftTimelineItemHoverTitle(item: MarShiftTimelineCellItem): string {
  const lines = [
    item.hover.title,
    item.hover.due ? `Due: ${item.hover.due}` : null,
    item.hover.dose ? `Dose: ${item.hover.dose}` : null,
    item.hover.route ? `Route: ${item.hover.route}` : null,
    item.hover.witness ? `Witness: ${item.hover.witness}` : null,
    item.hover.status ? `Status: ${item.hover.status}` : null,
    item.tertiaryText?.trim() ? item.tertiaryText.trim() : null,
  ].filter(Boolean);
  return lines.join("\n");
}

export function marShiftTimelineItemStatusStyle(
  doseStatus: string,
  readOnly = false
): CSSProperties {
  const status = doseStatus.trim().toUpperCase();
  if (status === "COMPLETED" || readOnly) {
    return {
      backgroundColor: "#e2e8f0",
      borderColor: "#cbd5e1",
      color: "#64748b",
    };
  }
  if (status === "OVERDUE") {
    return { backgroundColor: "#fff7ed", borderColor: "#fdba74", color: "#9a3412" };
  }
  if (status === "DUE" || status === "PLANNED") {
    return { backgroundColor: "#f8fafc", borderColor: "#e2e8f0", color: "#0f172a" };
  }
  if (status === "IN_PROGRESS") {
    return { backgroundColor: "#eff6ff", borderColor: "#93c5fd", color: "#1e40af" };
  }
  if (status === "HELD" || status === "MISSED") {
    return { backgroundColor: "#fafafa", borderColor: "#d4d4d4", color: "#525252" };
  }
  return { backgroundColor: "#ffffff", borderColor: "#e2e8f0", color: "#0f172a" };
}
