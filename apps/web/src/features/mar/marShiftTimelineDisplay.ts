import type { CSSProperties } from "react";
import {
  MAR_SHIFT_TIMELINE_STATUS_COLORS,
  resolveMarShiftTimelineStatusColorKey,
  resolveMarShiftTimelinePerformerLabel,
  resolveMarMedicationTimingOverrideReasonLabel,
  toMedicationAdministrationEffectiveTimeIsoUtc,
  clinicalDatetimeLocalFromInstant,
  clinicalDatetimeLocalToUtcIso,
  isMarShiftTimelineItemActionable,
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
  return !isMarShiftTimelineItemActionable(item);
}

export function isMarShiftTimelineDrawerScheduledActionable(
  item: MarShiftTimelineCellItem
): boolean {
  if (!isMarShiftTimelineItemActionable(item)) return false;
  const status = item.doseStatus.trim().toUpperCase();
  return status === "PLANNED" || item.clinicalAction === "VIEW_UPCOMING";
}

/** Locate a timeline cell item after refresh (K.10B.2 drawer resync). */
export function findMarShiftTimelineCellItem(
  timeline: {
    rows: {
      encounterId?: string;
      patientDisplay: string;
      roomLabel: string | null;
      governedRoomDisplay?: string | null;
      cells: { items: MarShiftTimelineCellItem[] }[];
    }[];
  },
  target: Pick<MarShiftTimelineCellItem, "orderItemId" | "medicationDoseInstanceId" | "scheduledAt">
): {
  item: MarShiftTimelineCellItem;
  patientDisplay: string;
  roomLabel: string | null;
  governedRoomDisplay?: string | null;
  encounterId?: string;
} | null {
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
          governedRoomDisplay: row.governedRoomDisplay ?? null,
          encounterId: row.encounterId,
        };
      }
    }
  }

  return findMarShiftTimelinePrnCellItemFallback(timeline, orderItemId);
}

function parseMarShiftTimelineInstantMs(iso: string | null | undefined): number {
  if (!iso?.trim()) return 0;
  const ms = new Date(iso).getTime();
  return Number.isNaN(ms) ? 0 : ms;
}

/** PRN cells relocate after administration — resolve by orderItemId (MEDUI.ED.MAR.H2). */
export function findMarShiftTimelinePrnCellItemFallback(
  timeline: {
    rows: {
      patientDisplay: string;
      roomLabel: string | null;
      governedRoomDisplay?: string | null;
      cells: { items: MarShiftTimelineCellItem[] }[];
    }[];
  },
  orderItemId: string
): {
  item: MarShiftTimelineCellItem;
  patientDisplay: string;
  roomLabel: string | null;
  governedRoomDisplay?: string | null;
} | null {
  let bestTerminal: {
    item: MarShiftTimelineCellItem;
    patientDisplay: string;
    roomLabel: string | null;
    governedRoomDisplay?: string | null;
    score: number;
  } | null = null;
  let bestAvailable: {
    item: MarShiftTimelineCellItem;
    patientDisplay: string;
    roomLabel: string | null;
    governedRoomDisplay?: string | null;
  } | null = null;

  for (const row of timeline.rows) {
    for (const cell of row.cells) {
      for (const item of cell.items) {
        if (item.orderItemId !== orderItemId || item.isPrnBand !== true) continue;
        const candidate = {
          item,
          patientDisplay: row.patientDisplay,
          roomLabel: row.roomLabel,
          governedRoomDisplay: row.governedRoomDisplay ?? null,
        };
        const status = item.doseStatus.trim().toUpperCase();
        const terminal =
          status === "COMPLETED" ||
          item.readOnly === true ||
          item.clinicalAction === "VIEW_ADMINISTRATION";
        if (terminal) {
          const score = parseMarShiftTimelineInstantMs(item.administeredAt ?? item.scheduledAt);
          if (!bestTerminal || score >= bestTerminal.score) {
            bestTerminal = { ...candidate, score };
          }
          continue;
        }
        bestAvailable = candidate;
      }
    }
  }

  if (bestTerminal) {
    const { score: _score, ...found } = bestTerminal;
    return found;
  }
  return bestAvailable;
}

export type MarShiftTimelineDrawerSelection = {
  item: MarShiftTimelineCellItem;
  patientDisplay: string;
  roomLabel: string | null;
  governedRoomDisplay?: string | null;
  encounterId?: string;
};

/** Reconcile open drawer with refreshed timeline; close when item no longer present (K.10B.2). */
export function reconcileMarShiftTimelineDrawerSelection(
  prev: MarShiftTimelineDrawerSelection | null,
  timeline: {
    rows: {
      patientDisplay: string;
      roomLabel: string | null;
      governedRoomDisplay?: string | null;
      cells: { items: MarShiftTimelineCellItem[] }[];
    }[];
  }
): MarShiftTimelineDrawerSelection | null {
  if (!prev) return null;
  const found = findMarShiftTimelineCellItem(timeline, prev.item);
  if (!found) return null;
  return {
    item: found.item,
    patientDisplay: found.patientDisplay,
    roomLabel: found.roomLabel,
    governedRoomDisplay: found.governedRoomDisplay,
    encounterId: prev.encounterId,
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
  if (item.clinicalAction === "VIEW_UPCOMING") {
    const route = item.route?.trim().toUpperCase() ?? "";
    if (item.doseKind === "IVPB_SESSION" || route === "IVPB") return "START_INFUSION";
    return "ADMINISTER";
  }
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

  const adj = item.scheduleAdjustment;
  if (adj?.isRescheduled) {
    lines.push("---");
    if (adj.lastChangedByDisplay?.trim()) {
      lines.push(`Rescheduled by: ${adj.lastChangedByDisplay.trim()}`);
    }
    if (adj.lastReasonCode?.trim() || adj.lastReasonDetail?.trim()) {
      const reason = adj.lastReasonDetail?.trim() || adj.lastReasonCode?.trim();
      lines.push(`Reason: ${reason}`);
    }
    if (adj.lastChangedAt?.trim()) {
      lines.push(`Changed: ${adj.lastChangedAt.trim()}`);
    }
    if (adj.reviewRecommended) {
      lines.push("Review recommended");
    }
  }

  const variance = item.administrationVariance;
  if (variance?.hasVariance && variance.badgeLabel) {
    lines.push("---");
    const scheduledIso = variance.scheduledAt ?? variance.effectiveScheduledAt;
    const actualIso = variance.administeredAt ?? variance.actualAdministrationAt;
    if (scheduledIso) {
      lines.push(`Scheduled: ${scheduledIso}`);
    }
    if (actualIso) {
      lines.push(`Actual: ${actualIso}`);
    }
    if (variance.varianceMinutes != null) {
      const sign = variance.varianceMinutes > 0 ? "+" : "";
      lines.push(`Variance: ${sign}${variance.varianceMinutes} min`);
    }
    if (variance.reasonCode?.trim()) {
      const reasonLabel =
        resolveMarMedicationTimingOverrideReasonLabel(variance.reasonCode, "en") ??
        variance.reasonCode.trim();
      lines.push(`Reason: ${reasonLabel}`);
    }
    if (variance.reasonDetail?.trim()) {
      lines.push(`Detail: ${variance.reasonDetail.trim()}`);
    }
    if (variance.performedByDisplay?.trim()) {
      lines.push(`Administered by: ${variance.performedByDisplay.trim()}`);
    }
    if (variance.severity?.trim()) {
      lines.push(`Risk: ${variance.severity.trim()}`);
    }
    if (variance.reviewRecommended) {
      lines.push("Review recommended");
    }
  }

  return lines.join("\n");
}

/** H9B administration variance timeline cell styling — green / blue / amber only. */
export function marShiftTimelineAdministrationVarianceCellStyle(
  badgeLabel: "ON_TIME" | "EARLY" | "LATE" | null | undefined
): CSSProperties {
  if (badgeLabel === "EARLY") {
    return { backgroundColor: "#eff6ff", borderColor: "#bfdbfe", color: "#1e40af" };
  }
  if (badgeLabel === "LATE") {
    return { backgroundColor: "#fffbeb", borderColor: "#fde68a", color: "#92400e" };
  }
  return { backgroundColor: "#ecfdf5", borderColor: "#a7f3d0", color: "#047857" };
}

/** H9L medication response badge — routine green / neutral gray / safety amber (no red). */
export function marShiftTimelineMedicationResponseBadgeStyle(
  severity: "routine" | "neutral" | "safety"
): CSSProperties {
  if (severity === "safety") {
    return { backgroundColor: "#fffbeb", borderColor: "#fde68a", color: "#b45309" };
  }
  if (severity === "neutral") {
    return { backgroundColor: "#f1f5f9", borderColor: "#cbd5e1", color: "#475569" };
  }
  return { backgroundColor: "#ecfdf5", borderColor: "#a7f3d0", color: "#047857" };
}

/** H9L.1 follow-up indicator — recommended blue / overdue amber (non-blocking). */
export function marShiftTimelineMedicationResponseFollowUpStyle(
  status: "RECOMMENDED" | "OVERDUE"
): CSSProperties {
  if (status === "OVERDUE") {
    return { color: "#b45309" };
  }
  return { color: "#1d4ed8" };
}

/** Neutral blue governance styling for rescheduled MAR timeline cells (H9A). */
export function marShiftTimelineRescheduleCellStyle(): CSSProperties {
  return {
    backgroundColor: "#eff6ff",
    borderColor: "#bfdbfe",
    color: "#1e40af",
  };
}

export function marShiftTimelineItemStatusStyle(
  doseStatus: string,
  readOnly = false,
  isPrnBand = false,
  secondaryText?: string | null
): CSSProperties {
  const colorKey = resolveMarShiftTimelineStatusColorKey({
    doseStatus,
    readOnly,
    isPrnBand,
    secondaryText,
  });
  const palette = MAR_SHIFT_TIMELINE_STATUS_COLORS[colorKey];
  return {
    backgroundColor: palette.backgroundColor,
    borderColor: palette.borderColor,
    color: palette.color,
  };
}

export function marShiftTimelinePrnRowStyle(): CSSProperties {
  return {
    backgroundColor: MAR_SHIFT_TIMELINE_STATUS_COLORS.prnRow.backgroundColor,
    borderColor: MAR_SHIFT_TIMELINE_STATUS_COLORS.prnRow.borderColor,
  };
}
