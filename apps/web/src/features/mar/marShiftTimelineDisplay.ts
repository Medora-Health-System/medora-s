import type { CSSProperties } from "react";
import type {
  MarShiftTimelineCellItem,
  MarShiftTimelineDrawerAction,
} from "@/lib/marShiftTimelineApi";

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

/** `datetime-local` value from ISO instant (browser local). */
export function toMarShiftTimelineDateTimeLocalValue(iso: string | null | undefined): string {
  if (!iso?.trim()) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${padDateTimeLocalPart(date.getMonth() + 1)}-${padDateTimeLocalPart(date.getDate())}T${padDateTimeLocalPart(date.getHours())}:${padDateTimeLocalPart(date.getMinutes())}`;
}

export function defaultMarShiftTimelineStartTimeValue(item: MarShiftTimelineCellItem): string {
  if (item.startedAt?.trim()) {
    return toMarShiftTimelineDateTimeLocalValue(item.startedAt);
  }
  if (item.scheduledAt?.trim()) {
    return toMarShiftTimelineDateTimeLocalValue(item.scheduledAt);
  }
  return toMarShiftTimelineDateTimeLocalValue(new Date().toISOString());
}

export function defaultMarShiftTimelineStopTimeValue(item: MarShiftTimelineCellItem): string {
  if (item.stoppedAt?.trim()) {
    return toMarShiftTimelineDateTimeLocalValue(item.stoppedAt);
  }
  return toMarShiftTimelineDateTimeLocalValue(new Date().toISOString());
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
  locale: string
): string {
  const formatter = new Intl.DateTimeFormat(locale, {
    hour: "numeric",
    minute: "2-digit",
  });
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
