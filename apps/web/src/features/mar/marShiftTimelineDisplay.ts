import type { CSSProperties } from "react";
import {
  resolveMarShiftTimelinePerformerLabel,
  toMedicationAdministrationEffectiveTimeIsoUtc,
  clinicalDatetimeLocalFromInstant,
  clinicalDatetimeLocalToUtcIso,
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

/** Locate a timeline cell item after refresh (K.10B.2 drawer resync). */
export function findMarShiftTimelineCellItem(
  timeline: { rows: { patientDisplay: string; roomLabel: string | null; cells: { items: MarShiftTimelineCellItem[] }[] }[] },
  target: Pick<MarShiftTimelineCellItem, "orderItemId" | "medicationDoseInstanceId" | "scheduledAt">
): { item: MarShiftTimelineCellItem; patientDisplay: string; roomLabel: string | null } | null {
  const orderItemId = target.orderItemId.trim();
  if (!orderItemId) return null;
  const doseId = target.medicationDoseInstanceId?.trim() || "";
  const scheduledAt = target.scheduledAt?.trim() || "";

  for (const row of timeline.rows) {
    for (const cell of row.cells) {
      for (const item of cell.items) {
        if (item.orderItemId !== orderItemId) continue;
        if (doseId && item.medicationDoseInstanceId?.trim() !== doseId) continue;
        if (!doseId && scheduledAt && item.scheduledAt?.trim() !== scheduledAt) continue;
        return {
          item,
          patientDisplay: row.patientDisplay,
          roomLabel: row.roomLabel,
        };
      }
    }
  }
  return null;
}

export type MarShiftTimelineDrawerSelection = {
  item: MarShiftTimelineCellItem;
  patientDisplay: string;
  roomLabel: string | null;
};

/** Reconcile open drawer with refreshed timeline; close when item no longer present (K.10B.2). */
export function reconcileMarShiftTimelineDrawerSelection(
  prev: MarShiftTimelineDrawerSelection | null,
  timeline: { rows: { patientDisplay: string; roomLabel: string | null; cells: { items: MarShiftTimelineCellItem[] }[] }[] }
): MarShiftTimelineDrawerSelection | null {
  if (!prev) return null;
  const found = findMarShiftTimelineCellItem(timeline, prev.item);
  if (!found) return null;
  return {
    item: found.item,
    patientDisplay: found.patientDisplay,
    roomLabel: found.roomLabel,
  };
}

export function marShiftTimelinePrimaryDrawerAction(
  item: MarShiftTimelineCellItem
): MarShiftTimelineDrawerAction | null {
  if (item.clinicalAction === "START_INFUSION") return "START_INFUSION";
  if (item.clinicalAction === "STOP_INFUSION") return "STOP_INFUSION";
  if (item.clinicalAction === "START_FLUID") return "START_FLUID";
  if (item.clinicalAction === "START_BOLUS") return "START_BOLUS";
  if (item.clinicalAction === "COMPLETE_BOLUS") return "COMPLETE_BOLUS";
  if (item.clinicalAction === "RESUME_FLUID") return "RESUME_FLUID";
  if (item.clinicalAction === "STOP_FLUID") return "STOP_FLUID";
  if (item.clinicalAction === "PAUSE_FLUID") return "PAUSE_FLUID";
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
  if (tz) return clinicalDatetimeLocalFromInstant(date, tz);
  return `${date.getFullYear()}-${padDateTimeLocalPart(date.getMonth() + 1)}-${padDateTimeLocalPart(date.getDate())}T${padDateTimeLocalPart(date.getHours())}:${padDateTimeLocalPart(date.getMinutes())}`;
}

/** Parse `datetime-local` wall clock in facility TZ → UTC ISO for API storage. */
export function marShiftTimelineDateTimeLocalToUtcIso(
  localValue: string | null | undefined,
  facilityTimeZone?: string | null
): string | null {
  const tz = facilityTimeZone?.trim();
  if (tz) return clinicalDatetimeLocalToUtcIso(localValue, tz);
  if (!localValue?.trim()) return null;
  const date = new Date(localValue);
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
