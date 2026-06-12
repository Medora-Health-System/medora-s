import { isIvpbSessionDoseKind, parseMedicationDoseKind } from "./medicationDoseKind.js";
import type { MedicationDoseKind } from "./medicationDoseKind.js";
import {
  getZonedWallClockParts,
  wallClockToUtc,
} from "./medicationDoseExpansionPlanner.js";
import {
  resolveMarShiftTimelineTerminalOutcome,
  type MarShiftTimelineTerminalOutcome,
} from "./marShiftTimelineTerminalActions.js";
import {
  isTerminalMedicationDoseStatus,
  parseMedicationDoseStatus,
  type MedicationDoseStatus,
} from "./medicationDoseStatus.js";
import {
  resolveMedicationCatalogPrimaryLabel,
  type CatalogMedicationLabel,
} from "../orders/orderItemDisplayLabels.js";
import type { MedicationCatalogSnapshotJson } from "./medicationOrderScheduleSnapshot.js";

/**
 * M1.8B.7K.1 / K.7 — Facility MAR shift timeline read model (shared contracts).
 * Column labels and shift windows use facility timezone when supplied.
 */

export const MAR_SHIFT_TIMELINE_DEFAULT_TIME_ZONE = "UTC";

export function normalizeMarShiftTimelineTimeZone(raw: string | null | undefined): string {
  const tz = raw?.trim();
  if (!tz) return MAR_SHIFT_TIMELINE_DEFAULT_TIME_ZONE;
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return tz;
  } catch {
    return MAR_SHIFT_TIMELINE_DEFAULT_TIME_ZONE;
  }
}

/** UI locale for MAR medication labels (M1.8B.7K.8). Defaults to English when unknown. */
export function normalizeMarShiftTimelineLocale(raw: string | null | undefined): "en" | "fr" {
  const value = raw?.trim().toLowerCase();
  if (value === "fr" || value?.startsWith("fr-")) return "fr";
  return "en";
}

export type MarShiftTimelineMedicationLabelInput = {
  locale?: "en" | "fr" | string | null;
  orderedMedicationLabel?: string | null;
  manualLabel?: string | null;
  catalogSnapshot?: Pick<
    MedicationCatalogSnapshotJson,
    "catalogItemId" | "catalogItemCode" | "displayNameEn" | "displayNameFr" | "genericName"
  > | null;
};

/** Locale-aware medication label for MAR cells, hover, and drawer (M1.8B.7K.8). */
export function resolveMarShiftTimelineMedicationLabel(
  input: MarShiftTimelineMedicationLabelInput
): string | null {
  const locale = normalizeMarShiftTimelineLocale(input.locale);
  const catalog: CatalogMedicationLabel | null = input.catalogSnapshot
    ? {
        code: input.catalogSnapshot.catalogItemCode,
        displayNameEn: input.catalogSnapshot.displayNameEn,
        displayNameFr: input.catalogSnapshot.displayNameFr,
        genericName: input.catalogSnapshot.genericName,
      }
    : null;
  const manual =
    input.manualLabel?.trim() ||
    input.orderedMedicationLabel?.trim() ||
    null;
  if (catalog?.displayNameEn?.trim() || catalog?.displayNameFr?.trim()) {
    return resolveMedicationCatalogPrimaryLabel(locale, catalog, manual);
  }
  return manual;
}

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

/** Read-only performer / completion fields for timeline cells (M1.8B.7K.3). */
export type MarShiftTimelineAdministrationEnrichment = {
  startedAt: string | null;
  startedByDisplay: string | null;
  startedByInitials: string | null;
  stoppedAt: string | null;
  stoppedByDisplay: string | null;
  stoppedByInitials: string | null;
  administeredAt: string | null;
  administeredByDisplay: string | null;
  administeredByInitials: string | null;
  completionSummary: string | null;
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

function addCalendarDays(year: number, month: number, day: number, days: number) {
  const d = new Date(Date.UTC(year, month - 1, day + days, 12, 0, 0, 0));
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() };
}

function zonedDayParts(referenceAt: Date, facilityTimeZone: string) {
  const parts = getZonedWallClockParts(referenceAt, facilityTimeZone);
  return { year: parts.year, month: parts.month, day: parts.day, hour: parts.hour };
}

/**
 * Standard shift windows use 13 hourly columns (e.g. 7A–7P → 07A … 07P).
 * Boundaries follow facility-local wall clock when `facilityTimeZone` is set.
 */
export function resolveStandardMarShiftTimelineWindow(
  shiftCode: Exclude<MarShiftTimelineShiftCode, "CUSTOM">,
  referenceAt: Date = new Date(),
  facilityTimeZone: string = MAR_SHIFT_TIMELINE_DEFAULT_TIME_ZONE
): { startAt: Date; endAt: Date } {
  const tz = normalizeMarShiftTimelineTimeZone(facilityTimeZone);
  let { year, month, day, hour } = zonedDayParts(referenceAt, tz);

  switch (shiftCode) {
    case "6A_6P": {
      const startAt = wallClockToUtc(year, month, day, 6, 0, tz);
      return { startAt, endAt: new Date(startAt.getTime() + 13 * 3_600_000) };
    }
    case "7A_7P": {
      const startAt = wallClockToUtc(year, month, day, 7, 0, tz);
      return { startAt, endAt: new Date(startAt.getTime() + 13 * 3_600_000) };
    }
    case "7P_7A": {
      if (hour < 8) {
        const prev = addCalendarDays(year, month, day, -1);
        year = prev.year;
        month = prev.month;
        day = prev.day;
      }
      const startAt = wallClockToUtc(year, month, day, 19, 0, tz);
      return { startAt, endAt: new Date(startAt.getTime() + 13 * 3_600_000) };
    }
    case "12P_12A": {
      const startAt = wallClockToUtc(year, month, day, 12, 0, tz);
      return { startAt, endAt: new Date(startAt.getTime() + 13 * 3_600_000) };
    }
    case "3P_3A": {
      const startAt = wallClockToUtc(year, month, day, 15, 0, tz);
      return { startAt, endAt: new Date(startAt.getTime() + 13 * 3_600_000) };
    }
  }
}

export function resolveMarShiftTimelineWindow(input: {
  shiftCode?: MarShiftTimelineShiftCode | string | null;
  shiftStart?: Date | null;
  shiftEnd?: Date | null;
  referenceAt?: Date;
  facilityTimeZone?: string | null;
}): {
  code: MarShiftTimelineShiftCode;
  label: string;
  startAt: Date;
  endAt: Date;
  facilityTimeZone: string;
} {
  const referenceAt = input.referenceAt ?? new Date();
  const facilityTimeZone = normalizeMarShiftTimelineTimeZone(input.facilityTimeZone);
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
      facilityTimeZone,
    };
  }

  const code = (parsedCode ?? "7A_7P") as Exclude<MarShiftTimelineShiftCode, "CUSTOM">;

  const window = resolveStandardMarShiftTimelineWindow(code, referenceAt, facilityTimeZone);
  return {
    code,
    label: MAR_SHIFT_TIMELINE_SHIFT_LABELS[code],
    startAt: window.startAt,
    endAt: window.endAt,
    facilityTimeZone,
  };
}

/** Formats an hour bucket label (07A, 12P, 01P, 07P, 12A, 01A) in facility-local time. */
export function formatMarShiftTimelineHourLabelFromHour(hour: number): string {
  if (hour === 0) return "12A";
  if (hour === 12) return "12P";
  if (hour < 12) return `${String(hour).padStart(2, "0")}A`;
  return `${String(hour - 12).padStart(2, "0")}P`;
}

/** Formats an hour bucket label (07A, 12P, 01P, 07P, 12A, 01A). */
export function formatMarShiftTimelineHourLabel(
  instant: Date,
  facilityTimeZone: string = MAR_SHIFT_TIMELINE_DEFAULT_TIME_ZONE
): string {
  const tz = normalizeMarShiftTimelineTimeZone(facilityTimeZone);
  const parts = getZonedWallClockParts(instant, tz);
  return formatMarShiftTimelineHourLabelFromHour(parts.hour);
}

function advanceMarShiftTimelineColumnEnd(
  cursor: Date,
  facilityTimeZone: string
): Date {
  const tz = normalizeMarShiftTimelineTimeZone(facilityTimeZone);
  const parts = getZonedWallClockParts(cursor, tz);
  const nextHour = parts.hour + 1;
  if (nextHour >= 24) {
    const nextDay = addCalendarDays(parts.year, parts.month, parts.day, 1);
    return wallClockToUtc(nextDay.year, nextDay.month, nextDay.day, 0, 0, tz);
  }
  return wallClockToUtc(parts.year, parts.month, parts.day, nextHour, 0, tz);
}

export function buildMarShiftTimelineColumns(
  startAt: Date,
  endAt: Date,
  facilityTimeZone: string = MAR_SHIFT_TIMELINE_DEFAULT_TIME_ZONE
): MarShiftTimelineColumn[] {
  const tz = normalizeMarShiftTimelineTimeZone(facilityTimeZone);
  const columns: MarShiftTimelineColumn[] = [];
  let cursor = new Date(startAt);
  while (cursor < endAt) {
    const parts = getZonedWallClockParts(cursor, tz);
    const columnEnd = advanceMarShiftTimelineColumnEnd(cursor, tz);
    columns.push({
      key: cursor.toISOString(),
      label: formatMarShiftTimelineHourLabelFromHour(parts.hour),
      startAt: cursor.toISOString(),
      endAt: columnEnd.toISOString(),
    });
    cursor = columnEnd;
  }
  return columns;
}

export function formatMarShiftTimelineDueTime(
  instant: Date,
  facilityTimeZone: string = MAR_SHIFT_TIMELINE_DEFAULT_TIME_ZONE
): string {
  const tz = normalizeMarShiftTimelineTimeZone(facilityTimeZone);
  const parts = getZonedWallClockParts(instant, tz);
  return `${String(parts.hour).padStart(2, "0")}:${String(parts.minute).padStart(2, "0")}`;
}

/** User-facing clinical date/time for drawer display (M1.8B.7K.7). */
export function formatMarShiftTimelineClinicalDateTime(
  instant: Date | string,
  locale: string,
  facilityTimeZone: string = MAR_SHIFT_TIMELINE_DEFAULT_TIME_ZONE
): string {
  const date = instant instanceof Date ? instant : new Date(instant);
  if (Number.isNaN(date.getTime())) return "";
  const tz = normalizeMarShiftTimelineTimeZone(facilityTimeZone);
  return new Intl.DateTimeFormat(locale, {
    timeZone: tz,
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
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

function abbreviateNormalSalineForTimeline(trimmed: string): string | null {
  const lower = trimmed.toLowerCase();
  const isNormalSaline =
    lower.includes("normal saline") ||
    lower.includes("chlorure de sodium") ||
    lower.includes("sodium chloride") ||
    /\bnacl\b/.test(lower) ||
    (/\b0\.9\s*%/.test(lower) &&
      (lower.includes("saline") || lower.includes("sodium") || lower.includes("chlorure")));
  if (!isNormalSaline) return null;

  const volumeMatch = trimmed.match(/\b(\d+(?:[.,]\d+)?)\s*(l|ml|mL)\b/i);
  if (volumeMatch) {
    const amount = volumeMatch[1]!.replace(",", ".");
    const unit = volumeMatch[2]!.toLowerCase() === "l" ? "L" : "mL";
    return `NS 0.9% ${amount} ${unit}`;
  }
  return "NS 0.9%";
}

function abbreviateMedicationLabelForTimeline(medicationLabel: string): string {
  const trimmed = medicationLabel.trim();
  if (!trimmed) return "Med";

  const normalSaline = abbreviateNormalSalineForTimeline(trimmed);
  if (normalSaline) return normalSaline;

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

export function formatMarShiftTimelineClinicianInitials(
  firstName: string | null | undefined,
  lastName: string | null | undefined
): string | null {
  const first = firstName?.trim()?.[0];
  const last = lastName?.trim()?.[0];
  if (!first && !last) return null;
  return `${(first ?? "").toUpperCase()}${(last ?? "").toUpperCase()}` || null;
}

export function formatMarShiftTimelineClinicianDisplay(
  firstName: string | null | undefined,
  lastName: string | null | undefined
): string | null {
  const parts = [firstName?.trim(), lastName?.trim()].filter(Boolean);
  return parts.length > 0 ? parts.join(" ") : null;
}

/** Full name with optional facility role suffix (e.g. "Elizabeth Posada RN"). */
export function formatMarShiftTimelineClinicianDisplayWithRole(
  firstName: string | null | undefined,
  lastName: string | null | undefined,
  roleCode: string | null | undefined
): string | null {
  const base = formatMarShiftTimelineClinicianDisplay(firstName, lastName);
  const role = roleCode?.trim();
  if (base && role) return `${base} ${role}`;
  return base ?? role ?? null;
}

/** Drawer/cell performer line — never blank when initials exist. */
export function resolveMarShiftTimelinePerformerLabel(
  display: string | null | undefined,
  initials: string | null | undefined
): string | null {
  const name = display?.trim();
  if (name) return name;
  const init = initials?.trim();
  return init || null;
}

export function buildMarShiftTimelineCompletionSummary(input: {
  doseKind: MedicationDoseKind | string | null | undefined;
  doseStatus: MedicationDoseStatus;
  startedAt: string | null;
  startedByInitials: string | null;
  stoppedAt: string | null;
  stoppedByInitials: string | null;
  administeredAt: string | null;
  administeredByInitials: string | null;
  facilityTimeZone?: string | null;
}): string | null {
  const tz = normalizeMarShiftTimelineTimeZone(input.facilityTimeZone);
  if (isIvpbSessionDoseKind(input.doseKind)) {
    if (input.doseStatus === "IN_PROGRESS" && input.startedAt) {
      const startTime = formatMarShiftTimelineDueTime(new Date(input.startedAt), tz);
      const initials = input.startedByInitials?.trim();
      return initials ? `${initials} ${startTime} ▶` : `${startTime} ▶`;
    }
    if (input.doseStatus === "COMPLETED" && input.startedAt && input.stoppedAt) {
      const startTime = formatMarShiftTimelineDueTime(new Date(input.startedAt), tz);
      const stopTime = formatMarShiftTimelineDueTime(new Date(input.stoppedAt), tz);
      const startInitials = input.startedByInitials?.trim();
      const stopInitials = input.stoppedByInitials?.trim();
      if (startInitials && stopInitials) {
        return `${startInitials} ${startTime}–${stopInitials} ${stopTime}`;
      }
      return `${startTime}–${stopTime}`;
    }
    return null;
  }

  if (input.doseStatus === "COMPLETED" && input.administeredAt) {
    const time = formatMarShiftTimelineDueTime(new Date(input.administeredAt), tz);
    const initials = input.administeredByInitials?.trim();
    return initials ? `${initials} ${time}` : time;
  }

  return null;
}

export function buildMarShiftTimelineTertiaryText(input: {
  doseKind: MedicationDoseKind | string | null | undefined;
  doseStatus: MedicationDoseStatus;
  enrichment?: MarShiftTimelineAdministrationEnrichment | null;
  facilityTimeZone?: string | null;
}): string {
  const enrichment = input.enrichment;
  if (enrichment?.completionSummary?.trim()) {
    return enrichment.completionSummary.trim();
  }

  if (input.doseStatus === "HELD" && enrichment?.administeredByInitials?.trim()) {
    return enrichment.administeredByInitials.trim();
  }

  return buildMarShiftTimelineCompletionSummary({
    doseKind: input.doseKind,
    doseStatus: input.doseStatus,
    startedAt: enrichment?.startedAt ?? null,
    startedByInitials: enrichment?.startedByInitials ?? null,
    stoppedAt: enrichment?.stoppedAt ?? null,
    stoppedByInitials: enrichment?.stoppedByInitials ?? null,
    administeredAt: enrichment?.administeredAt ?? null,
    administeredByInitials: enrichment?.administeredByInitials ?? null,
    facilityTimeZone: input.facilityTimeZone,
  }) ?? "";
}

export function isMarShiftTimelineItemReadOnly(
  clinicalAction: MarShiftTimelineClinicalAction | null
): boolean {
  return (
    clinicalAction === "VIEW_ADMINISTRATION" ||
    clinicalAction === "VIEW_UPCOMING" ||
    clinicalAction === "VIEW_HELD" ||
    clinicalAction === "VIEW_MISSED"
  );
}

export function buildMarShiftTimelineCellDisplay(input: {
  medicationLabel: string | null;
  doseKind: string | null | undefined;
  doseStatus: MedicationDoseStatus;
  route: string | null;
  frequencyCode: string | null;
  requiresWitness: boolean;
  responseDueAt?: Date | string | null;
  enrichment?: MarShiftTimelineAdministrationEnrichment | null;
  facilityTimeZone?: string | null;
  terminalOutcome?: MarShiftTimelineTerminalOutcome | null;
  marAction?: string | null;
  marNotes?: string | null;
}): { primaryText: string; secondaryText: string; tertiaryText: string } {
  const baseLabel = abbreviateMedicationLabelForTimeline(input.medicationLabel ?? "");
  const terminalOutcome =
    input.terminalOutcome ??
    resolveMarShiftTimelineTerminalOutcome({
      marAction: input.marAction,
      notes: input.marNotes,
    });
  const route = input.route?.trim().toUpperCase() ?? "";
  const isIvpb =
    isIvpbSessionDoseKind(input.doseKind) || route === "IVPB" || baseLabel.includes("IVPB");
  const isPrn = input.frequencyCode?.trim().toUpperCase() === "PRN" || input.responseDueAt != null;

  let primaryText = baseLabel;
  const primaryAlreadyAbbreviatedNs = primaryText.startsWith("NS 0.9%");
  if (
    isIvpb &&
    !primaryAlreadyAbbreviatedNs &&
    !primaryText.toUpperCase().includes("IVPB") &&
    route === "IVPB"
  ) {
    primaryText = `${baseLabel} IVPB`;
  }

  const tertiaryText = buildMarShiftTimelineTertiaryText({
    doseKind: input.doseKind,
    doseStatus: input.doseStatus,
    enrichment: input.enrichment,
    facilityTimeZone: input.facilityTimeZone,
  });

  if (terminalOutcome === "REFUSED") {
    return { primaryText, secondaryText: "REFUSED", tertiaryText };
  }

  if (input.requiresWitness) {
    return {
      primaryText,
      secondaryText: baseLabel === "INS" ? "Wit" : "Witness",
      tertiaryText,
    };
  }

  if (input.doseStatus === "HELD" || terminalOutcome === "HELD") {
    return { primaryText, secondaryText: "HELD", tertiaryText };
  }
  if (input.doseStatus === "MISSED") {
    return { primaryText, secondaryText: "MISSED", tertiaryText };
  }
  if (input.doseStatus === "COMPLETED") {
    return { primaryText, secondaryText: "DONE", tertiaryText };
  }

  const freq = input.frequencyCode?.trim().toUpperCase() ?? "";
  if (
    (input.doseStatus === "DUE" || input.doseStatus === "OVERDUE") &&
    freq === "STAT"
  ) {
    return { primaryText, secondaryText: "STAT", tertiaryText: "ADMIN" };
  }

  if (isIvpbSessionDoseKind(input.doseKind)) {
    if (input.doseStatus === "DUE" || input.doseStatus === "OVERDUE") {
      return { primaryText, secondaryText: "START", tertiaryText };
    }
    if (input.doseStatus === "IN_PROGRESS") {
      return { primaryText, secondaryText: "INFUSING", tertiaryText };
    }
    return { primaryText, secondaryText: "IVPB", tertiaryText };
  }

  if (isPrn) {
    const adminTertiary =
      input.doseStatus === "DUE" || input.doseStatus === "OVERDUE" ? "ADMIN" : tertiaryText;
    return { primaryText, secondaryText: "PRN Resp", tertiaryText: adminTertiary };
  }

  const routeSecondary =
    route === "PO"
      ? "PO"
      : route === "IV"
        ? "IV"
        : route === "IVP"
          ? "IVP"
          : route === "IVPB"
            ? "IVPB"
            : route === "IM"
              ? "IM"
              : route === "SQ"
                ? "SQ"
                : route === "SC"
                  ? "SC"
                  : route === "IO"
                    ? "IO"
                    : "";

  if (routeSecondary) {
    const adminTertiary =
      input.doseStatus === "DUE" || input.doseStatus === "OVERDUE" ? "ADMIN" : tertiaryText;
    return { primaryText, secondaryText: routeSecondary, tertiaryText: adminTertiary };
  }

  if (input.doseStatus === "DUE" || input.doseStatus === "OVERDUE") {
    return { primaryText, secondaryText: "ADMIN", tertiaryText };
  }

  return { primaryText, secondaryText: "", tertiaryText };
}

export function buildMarShiftTimelineHover(input: {
  medicationLabel: string | null;
  scheduledAt: Date;
  doseAmount: string | null;
  route: string | null;
  requiresWitness: boolean;
  doseStatus: MedicationDoseStatus;
  facilityTimeZone?: string | null;
}): MarShiftTimelineHover {
  const title = input.medicationLabel?.trim() || "Medication";
  const tz = normalizeMarShiftTimelineTimeZone(input.facilityTimeZone);
  return {
    title,
    due: formatMarShiftTimelineDueTime(input.scheduledAt, tz),
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
  facilityTimeZone?: string | null;
}): string | null {
  const candidates = [input.scheduledAt, input.dueWindowStartAt];
  for (const instant of candidates) {
    const key = findMarShiftTimelineColumnKeyForInstant(
      instant,
      input.columns,
      input.facilityTimeZone
    );
    if (key) return key;
  }
  return null;
}

export function findMarShiftTimelineColumnKeyForInstant(
  instant: Date,
  columns: readonly MarShiftTimelineColumn[],
  facilityTimeZone?: string | null
): string | null {
  const tz = normalizeMarShiftTimelineTimeZone(facilityTimeZone);
  const targetLabel = formatMarShiftTimelineHourLabel(instant, tz);
  const time = instant.getTime();

  for (const column of columns) {
    if (column.label !== targetLabel) continue;
    const start = new Date(column.startAt).getTime();
    const end = new Date(column.endAt).getTime();
    if (time >= start && time < end) return column.key;
  }

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
