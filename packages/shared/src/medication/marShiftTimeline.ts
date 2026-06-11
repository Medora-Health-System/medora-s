import { isIvpbSessionDoseKind, parseMedicationDoseKind } from "./medicationDoseKind.js";
import type { MedicationDoseKind } from "./medicationDoseKind.js";
import {
  isTerminalMedicationDoseStatus,
  parseMedicationDoseStatus,
  type MedicationDoseStatus,
} from "./medicationDoseStatus.js";

/**
 * M1.8B.7K.1 — Facility MAR shift timeline read model (shared contracts).
 * UTC hour boundaries unless a facility timezone is supplied (future refinement).
 */

export const MAR_SHIFT_TIMELINE_SHIFT_CODES = [
  "6A_6P",
  "7A_7P",
  "7P_7A",
  "12P_12A",
  "3P_3A",
  "CUSTOM",
] as const;

export type MarShiftTimelineShiftCode = (typeof MAR_SHIFT_TIMELINE_SHIFT_CODES)[number];

export const MAR_SHIFT_TIMELINE_SHIFT_LABELS: Record<MarShiftTimelineShiftCode, string> = {
  "6A_6P": "6A–6P",
  "7A_7P": "7A–7P",
  "7P_7A": "7P–7A",
  "12P_12A": "12P–12A",
  "3P_3A": "3P–3A",
  CUSTOM: "Custom",
};

export type MarShiftTimelineColumn = {
  key: string;
  label: string;
  startAt: string;
  endAt: string;
};

export type MarShiftTimelineClinicalAction =
  | "ADMINISTER"
  | "START_INFUSION"
  | "STOP_INFUSION"
  | "VIEW_UPCOMING"
  | "VIEW_ADMINISTRATION"
  | "VIEW_HELD"
  | "VIEW_MISSED";

export const MAR_SHIFT_TIMELINE_DRAWER_ACTIONS = [
  "ADMINISTER",
  "START_INFUSION",
  "STOP_INFUSION",
  "REFUSE",
  "HOLD",
  "VIEW_ORDER",
] as const;

export type MarShiftTimelineDrawerAction = (typeof MAR_SHIFT_TIMELINE_DRAWER_ACTIONS)[number];

export type MarShiftTimelineHover = {
  title: string;
  due: string;
  dose: string | null;
  route: string | null;
  witness: string | null;
  status: string;
};

export function buildMarShiftTimelineTitle(facilityName: string): string {
  const name = facilityName.trim() || "Facility";
  return `${name} MAR SHIFT TIMELINE`;
}

export function parseMarShiftTimelineShiftCode(
  raw: string | null | undefined
): MarShiftTimelineShiftCode | null {
  if (raw == null) return null;
  const normalized = raw.trim().toUpperCase();
  return (MAR_SHIFT_TIMELINE_SHIFT_CODES as readonly string[]).includes(normalized)
    ? (normalized as MarShiftTimelineShiftCode)
    : null;
}

function startOfUtcDay(referenceAt: Date): Date {
  return new Date(
    Date.UTC(referenceAt.getUTCFullYear(), referenceAt.getUTCMonth(), referenceAt.getUTCDate())
  );
}

function addUtcHours(date: Date, hours: number): Date {
  return new Date(date.getTime() + hours * 3_600_000);
}

/**
 * Standard shift windows use 13 hourly columns (e.g. 7A–7P → 07A … 07P).
 * Boundaries are UTC; facility timezone refinement is future work.
 */
export function resolveStandardMarShiftTimelineWindow(
  shiftCode: Exclude<MarShiftTimelineShiftCode, "CUSTOM">,
  referenceAt: Date = new Date()
): { startAt: Date; endAt: Date } {
  const day = startOfUtcDay(referenceAt);

  switch (shiftCode) {
    case "6A_6P":
      return { startAt: addUtcHours(day, 6), endAt: addUtcHours(day, 19) };
    case "7A_7P":
      return { startAt: addUtcHours(day, 7), endAt: addUtcHours(day, 20) };
    case "7P_7A": {
      const hour = referenceAt.getUTCHours();
      const base = hour < 8 ? addUtcHours(day, -24) : day;
      return { startAt: addUtcHours(base, 19), endAt: addUtcHours(base, 32) };
    }
    case "12P_12A":
      return { startAt: addUtcHours(day, 12), endAt: addUtcHours(day, 25) };
    case "3P_3A":
      return { startAt: addUtcHours(day, 15), endAt: addUtcHours(day, 28) };
  }
}

export function resolveMarShiftTimelineWindow(input: {
  shiftCode?: MarShiftTimelineShiftCode | string | null;
  shiftStart?: Date | null;
  shiftEnd?: Date | null;
  referenceAt?: Date;
}): {
  code: MarShiftTimelineShiftCode;
  label: string;
  startAt: Date;
  endAt: Date;
} {
  const referenceAt = input.referenceAt ?? new Date();
  const parsedCode = parseMarShiftTimelineShiftCode(input.shiftCode ?? undefined);

  if (parsedCode === "CUSTOM" || (input.shiftStart && input.shiftEnd)) {
    if (!input.shiftStart || !input.shiftEnd) {
      throw new Error("CUSTOM shift requires shiftStart and shiftEnd");
    }
    return {
      code: "CUSTOM",
      label: MAR_SHIFT_TIMELINE_SHIFT_LABELS.CUSTOM,
      startAt: input.shiftStart,
      endAt: input.shiftEnd,
    };
  }

  const code = (parsedCode ?? "7A_7P") as Exclude<MarShiftTimelineShiftCode, "CUSTOM">;

  const window = resolveStandardMarShiftTimelineWindow(code, referenceAt);
  return {
    code,
    label: MAR_SHIFT_TIMELINE_SHIFT_LABELS[code],
    startAt: window.startAt,
    endAt: window.endAt,
  };
}

/** Formats an hour bucket label (07A, 12P, 01P, 07P, 12A, 01A). */
export function formatMarShiftTimelineHourLabel(instant: Date): string {
  const hour = instant.getUTCHours();
  if (hour === 0) return "12A";
  if (hour === 12) return "12P";
  if (hour < 12) return `${String(hour).padStart(2, "0")}A`;
  return `${String(hour - 12).padStart(2, "0")}P`;
}

export function buildMarShiftTimelineColumns(startAt: Date, endAt: Date): MarShiftTimelineColumn[] {
  const columns: MarShiftTimelineColumn[] = [];
  let cursor = new Date(startAt);
  while (cursor < endAt) {
    const columnEnd = addUtcHours(cursor, 1);
    columns.push({
      key: cursor.toISOString(),
      label: formatMarShiftTimelineHourLabel(cursor),
      startAt: cursor.toISOString(),
      endAt: columnEnd.toISOString(),
    });
    cursor = columnEnd;
  }
  return columns;
}

export function formatMarShiftTimelineDueTime(instant: Date): string {
  const hours = String(instant.getUTCHours()).padStart(2, "0");
  const minutes = String(instant.getUTCMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

export function doseStatusMarShiftTimelineHoverLabel(status: MedicationDoseStatus): string {
  switch (status) {
    case "DUE":
      return "Due";
    case "OVERDUE":
      return "Overdue";
    case "PLANNED":
      return "Planned";
    case "IN_PROGRESS":
      return "In progress";
    case "HELD":
      return "Held";
    case "COMPLETED":
      return "Completed";
    case "MISSED":
      return "Missed";
    default:
      return status;
  }
}

export function resolveMarShiftTimelineClinicalAction(
  doseKind: MedicationDoseKind | string | null | undefined,
  doseStatus: MedicationDoseStatus
): MarShiftTimelineClinicalAction | null {
  if (isIvpbSessionDoseKind(doseKind)) {
    switch (doseStatus) {
      case "DUE":
      case "OVERDUE":
        return "START_INFUSION";
      case "IN_PROGRESS":
        return "STOP_INFUSION";
      case "PLANNED":
        return "VIEW_UPCOMING";
      case "COMPLETED":
        return "VIEW_ADMINISTRATION";
      case "HELD":
        return "VIEW_HELD";
      case "MISSED":
        return "VIEW_MISSED";
      default:
        return null;
    }
  }

  switch (doseStatus) {
    case "DUE":
    case "OVERDUE":
      return "ADMINISTER";
    case "PLANNED":
      return "VIEW_UPCOMING";
    case "COMPLETED":
      return "VIEW_ADMINISTRATION";
    case "HELD":
      return "VIEW_HELD";
    case "MISSED":
      return "VIEW_MISSED";
    default:
      return null;
  }
}

export function resolveMarShiftTimelineDrawerActions(
  clinicalAction: MarShiftTimelineClinicalAction | null
): MarShiftTimelineDrawerAction[] {
  if (!clinicalAction) return ["VIEW_ORDER"];

  switch (clinicalAction) {
    case "ADMINISTER":
      return ["ADMINISTER", "REFUSE", "HOLD", "VIEW_ORDER"];
    case "START_INFUSION":
      return ["ADMINISTER", "START_INFUSION", "REFUSE", "HOLD", "VIEW_ORDER"];
    case "STOP_INFUSION":
      return ["START_INFUSION", "STOP_INFUSION", "REFUSE", "HOLD", "VIEW_ORDER"];
    case "VIEW_UPCOMING":
    case "VIEW_ADMINISTRATION":
    case "VIEW_HELD":
    case "VIEW_MISSED":
      return ["VIEW_ORDER"];
  }
}

function abbreviateMedicationLabelForTimeline(medicationLabel: string): string {
  const trimmed = medicationLabel.trim();
  if (!trimmed) return "Med";

  const lower = trimmed.toLowerCase();
  if (lower.includes("vancomycin") || lower.includes("vancomycine")) return "Vanco";
  if (lower.includes("insulin")) return "INS";
  if (lower.includes("heparin") || lower.includes("héparine")) return "Heparin";
  if (lower.includes("potassium") || /\bkcl\b/i.test(trimmed)) return "KCl";
  if (lower.includes("ceftriaxone") || lower.includes("rocephin")) return "Rocephin";
  if (lower.includes("cefepime")) return "Cefepime";
  if (lower.includes("morphine")) return "Morphine";
  if (lower.includes("furosemide") || lower.includes("lasix")) return "Lasix";
  if (lower.includes("piperacillin")) return "Piperacillin-tazobactam";

  const firstWord = trimmed.split(/\s+/)[0] ?? trimmed;
  return firstWord.length > 20 ? `${firstWord.slice(0, 20)}…` : firstWord;
}

export function buildMarShiftTimelineCellDisplay(input: {
  medicationLabel: string | null;
  doseKind: string | null | undefined;
  doseStatus: MedicationDoseStatus;
  route: string | null;
  frequencyCode: string | null;
  requiresWitness: boolean;
  responseDueAt?: Date | string | null;
}): { primaryText: string; secondaryText: string } {
  const baseLabel = abbreviateMedicationLabelForTimeline(input.medicationLabel ?? "");
  const route = input.route?.trim().toUpperCase() ?? "";
  const isIvpb =
    isIvpbSessionDoseKind(input.doseKind) || route === "IVPB" || baseLabel.includes("IVPB");
  const isPrn = input.frequencyCode?.trim().toUpperCase() === "PRN" || input.responseDueAt != null;

  let primaryText = baseLabel;
  if (isIvpb && !primaryText.toUpperCase().includes("IVPB") && route === "IVPB") {
    primaryText = `${baseLabel} IVPB`;
  }

  if (input.requiresWitness) {
    return {
      primaryText,
      secondaryText: baseLabel === "INS" ? "Wit" : "Witness",
    };
  }

  if (isIvpbSessionDoseKind(input.doseKind)) {
    if (input.doseStatus === "DUE" || input.doseStatus === "OVERDUE") {
      return { primaryText, secondaryText: "START" };
    }
    if (input.doseStatus === "IN_PROGRESS") {
      return { primaryText, secondaryText: "IVPB" };
    }
    return { primaryText, secondaryText: "IVPB" };
  }

  if (isPrn) {
    return { primaryText, secondaryText: "PRN Resp" };
  }

  if (route === "PO") {
    return { primaryText, secondaryText: "PO" };
  }
  if (route === "IVP") {
    return { primaryText, secondaryText: "IVP" };
  }
  if (route === "IVPB") {
    return { primaryText, secondaryText: "IVPB" };
  }
  if (route === "IM") {
    return { primaryText, secondaryText: "IM" };
  }
  if (route === "SQ") {
    return { primaryText, secondaryText: "SQ" };
  }

  return { primaryText, secondaryText: "" };
}

export function buildMarShiftTimelineHover(input: {
  medicationLabel: string | null;
  scheduledAt: Date;
  doseAmount: string | null;
  route: string | null;
  requiresWitness: boolean;
  doseStatus: MedicationDoseStatus;
}): MarShiftTimelineHover {
  const title = input.medicationLabel?.trim() || "Medication";
  return {
    title,
    due: formatMarShiftTimelineDueTime(input.scheduledAt),
    dose: input.doseAmount,
    route: input.route,
    witness: input.requiresWitness ? "Required" : null,
    status: doseStatusMarShiftTimelineHoverLabel(input.doseStatus),
  };
}

/**
 * Column placement (M1.8B.7K.1):
 * Prefer `scheduledAt` hour bucket; fall back to `dueWindowStartAt`.
 * IN_PROGRESS IVPB doses use the same rule (scheduled hour, not “now”).
 */
export function resolveMarShiftTimelineColumnKey(input: {
  scheduledAt: Date;
  dueWindowStartAt: Date;
  columns: readonly MarShiftTimelineColumn[];
}): string | null {
  const candidates = [input.scheduledAt, input.dueWindowStartAt];
  for (const instant of candidates) {
    const key = findMarShiftTimelineColumnKeyForInstant(instant, input.columns);
    if (key) return key;
  }
  return null;
}

export function findMarShiftTimelineColumnKeyForInstant(
  instant: Date,
  columns: readonly MarShiftTimelineColumn[]
): string | null {
  const time = instant.getTime();
  for (const column of columns) {
    const start = new Date(column.startAt).getTime();
    const end = new Date(column.endAt).getTime();
    if (time >= start && time < end) return column.key;
  }
  return null;
}

export function doseOverlapsMarShiftTimelineWindow(input: {
  shiftStart: Date;
  shiftEnd: Date;
  scheduledAt: Date;
  dueWindowStartAt: Date;
  dueWindowEndAt: Date;
  doseStatus: string;
  infusionSessionId?: string | null;
}): boolean {
  const status = parseMedicationDoseStatus(input.doseStatus);
  if (status && isTerminalMedicationDoseStatus(status)) {
    if (status !== "COMPLETED" && status !== "MISSED") return false;
  }

  if (
    input.dueWindowStartAt < input.shiftEnd &&
    input.dueWindowEndAt > input.shiftStart
  ) {
    return true;
  }

  if (input.scheduledAt >= input.shiftStart && input.scheduledAt < input.shiftEnd) {
    return true;
  }

  if (input.doseStatus === "IN_PROGRESS" && input.infusionSessionId?.trim()) {
    return true;
  }

  return false;
}

export function shouldIncludeMarShiftTimelineDose(input: {
  doseKind: string | null | undefined;
  doseStatus: string;
  ivpbSchedulingEnabled: boolean;
  includeCompleted: boolean;
  includeUpcoming: boolean;
}): boolean {
  const status = parseMedicationDoseStatus(input.doseStatus);
  if (!status) return false;
  if (status === "CANCELLED" || status === "SUPERSEDED") return false;
  if (status === "COMPLETED" && !input.includeCompleted) return false;
  if (status === "PLANNED" && !input.includeUpcoming) return false;
  if (isIvpbSessionDoseKind(input.doseKind) && !input.ivpbSchedulingEnabled) return false;
  return true;
}

export function parseMarShiftTimelineDoseKind(
  raw: string | null | undefined
): MedicationDoseKind | null {
  return parseMedicationDoseKind(raw == null ? null : String(raw));
}
