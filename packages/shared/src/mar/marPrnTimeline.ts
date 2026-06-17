import type { MarShiftTimelineColumn } from "../medication/marShiftTimeline.js";
import {
  formatMarShiftTimelineDueTime,
  resolveMarShiftTimelineColumnKey,
} from "../medication/marShiftTimeline.js";
import { getMedicationFrequencyDefinition } from "../medication/medicationFrequencyCatalog.js";
import type { ResolveMedicationOrderItemFrequencyInput } from "../medication/medicationFrequencyNormalization.js";
import {
  isPrnMedicationOrder,
  parsePrnIndicationFromDirections,
} from "./medicationAdministrationPrnGovernance.js";

/** MAR shift timeline status colors (K.10B.8B clinical governance). */
export const MAR_SHIFT_TIMELINE_STATUS_COLORS = {
  active: { backgroundColor: "#DCFCE7", borderColor: "#16A34A", color: "#166534" },
  administered: { backgroundColor: "#E5E7EB", borderColor: "#9CA3AF", color: "#374151" },
  refused: { backgroundColor: "#F3F4F6", borderColor: "#6B7280", color: "#4B5563" },
  held: { backgroundColor: "#FEF3C7", borderColor: "#D97706", color: "#92400E" },
  overdue: {
    backgroundColor: "#FEE2E2",
    borderColor: "#DC2626",
    color: "#991B1B",
  },
  missed: {
    backgroundColor: "#FEE2E2",
    borderColor: "#DC2626",
    color: "#991B1B",
  },
  cancelled: {
    backgroundColor: "#F3F4F6",
    borderColor: "#9CA3AF",
    color: "#6B7280",
  },
  prnRow: { backgroundColor: "#FFFBE6", borderColor: "#E8D38A", color: "#664D03" },
} as const;

export type MarShiftTimelineStatusColorKey = keyof typeof MAR_SHIFT_TIMELINE_STATUS_COLORS;

const ACTIVE_SECONDARY_MARKERS = [
  "ADMIN",
  "INFUSING",
  "START",
  "RUNNING",
  "DUE",
] as const;

/** Resolve timeline/drawer status color bucket from dose status and cell labels. */
export function resolveMarShiftTimelineStatusColorKey(input: {
  doseStatus: string;
  readOnly?: boolean;
  isPrnBand?: boolean;
  secondaryText?: string | null;
}): MarShiftTimelineStatusColorKey {
  if (input.isPrnBand) {
    const terminal = resolvePrnTimelineTerminalDisplay({
      doseStatus: input.doseStatus,
      readOnly: input.readOnly,
      secondaryText: input.secondaryText,
    });
    if (terminal) return terminal.colorKey;
    return "prnRow";
  }

  const status = input.doseStatus.trim().toUpperCase();
  const secondary = input.secondaryText?.trim().toUpperCase() ?? "";

  if (secondary === "REFUSED") return "refused";
  if (status === "CANCELLED" || secondary === "CANCELED" || secondary === "ANNULÉ") {
    return "cancelled";
  }
  if (status === "HELD" || secondary === "HELD") return "held";
  if (status === "MISSED") return "missed";
  if (status === "OVERDUE") return "overdue";
  if (status === "COMPLETED" || secondary === "DONE") {
    return "administered";
  }

  if (
    status === "DUE" ||
    status === "IN_PROGRESS" ||
    status === "PLANNED" ||
    status === "STARTED" ||
    secondary === "INFUSING" ||
    secondary === "ADMIN" ||
    secondary === "START" ||
    secondary.endsWith(" BOLUS")
  ) {
    return "active";
  }

  if (ACTIVE_SECONDARY_MARKERS.some((marker) => secondary.includes(marker))) {
    return "active";
  }

  return "active";
}

export const MAR_PRN_EARLY_OVERRIDE_NOTE_PREFIX = "MAR_PRN_EARLY_OVERRIDE:";

const PRN_CLASSIFICATION_MARKERS = [
  /\bprn\b/i,
  /\bp\.r\.n\.\b/i,
  /\bas needed\b/i,
  /\bselon besoin\b/i,
  /\bpain\s+prn\b/i,
  /\bnausea\s+prn\b/i,
  /\bfever\s+prn\b/i,
  /\bcough\s+prn\b/i,
] as const;

/** Detect PRN orders including interval+PRN and clinical PRN markers (K.10B.8A). */
export function isPrnMedicationOrderClassification(
  input: ResolveMedicationOrderItemFrequencyInput
): boolean {
  if (isPrnMedicationOrder(input)) return true;
  const hay = `${input.frequencyCode ?? ""} ${input.directionsSig ?? ""}`.trim();
  if (!hay) return false;
  return PRN_CLASSIFICATION_MARKERS.some((marker) => marker.test(hay));
}

/** Frequency label for PRN drawer/cells — drawer: "Q6H PRN"; cell band: "PRN Q6H". */
export function formatMarPrnFrequencyLabel(input: {
  frequencyCode?: string | null;
  directionsSig?: string | null;
  presentation?: "drawer" | "cell";
}): string {
  const presentation = input.presentation ?? "drawer";
  const code = input.frequencyCode?.trim().toUpperCase();
  if (code && code !== "PRN") {
    return presentation === "cell" ? `PRN ${code}` : `${code} PRN`;
  }
  const indication = parsePrnIndicationFromDirections(input.directionsSig);
  if (indication) {
    const short =
      indication.length > 18 ? `${indication.slice(0, 18).trim()}…` : indication.trim();
    return short ? `PRN ${short}` : "PRN";
  }
  return "PRN";
}

export function resolvePrnNextEligibleAt(input: {
  lastAdministeredAt: Date | string | null | undefined;
  frequencyCode?: string | null;
}): Date | null {
  const lastMs = parseInstant(input.lastAdministeredAt);
  if (lastMs == null) return null;
  const def = getMedicationFrequencyDefinition(input.frequencyCode ?? null);
  const intervalMinutes = def?.intervalMinutes;
  if (intervalMinutes == null || intervalMinutes <= 0) return null;
  return new Date(lastMs + intervalMinutes * 60_000);
}

/** H9J — canonical alias for PRN next-eligible resolution. */
export const resolveMarPrnNextEligibleAt = resolvePrnNextEligibleAt;

/** H9J — PRN is eligible at/after next interval; never classified as late. */
export function isMarPrnCurrentlyEligible(input: {
  now?: Date | string;
  lastAdministeredAt?: Date | string | null;
  frequencyCode?: string | null;
}): boolean {
  const nextEligible = resolveMarPrnNextEligibleAt({
    lastAdministeredAt: input.lastAdministeredAt,
    frequencyCode: input.frequencyCode,
  });
  if (!nextEligible) return true;
  const nowMs = parseInstant(input.now ?? new Date());
  if (nowMs == null) return false;
  return nowMs >= nextEligible.getTime();
}

export function isPrnAdministrationBeforeNextEligible(input: {
  proposedAdministeredAt: Date | string;
  lastAdministeredAt?: Date | string | null;
  frequencyCode?: string | null;
}): boolean {
  const nextEligible = resolvePrnNextEligibleAt({
    lastAdministeredAt: input.lastAdministeredAt,
    frequencyCode: input.frequencyCode,
  });
  if (!nextEligible) return false;
  const proposedMs = parseInstant(input.proposedAdministeredAt);
  if (proposedMs == null) return false;
  return proposedMs < nextEligible.getTime();
}

function parseInstant(value: Date | string | null | undefined): number | null {
  if (value == null) return null;
  const d = value instanceof Date ? value : new Date(value);
  const t = d.getTime();
  return Number.isNaN(t) ? null : t;
}

function formatPrnTimelineTime(instant: Date | string, facilityTimeZone: string): string {
  const date = instant instanceof Date ? instant : new Date(instant);
  if (Number.isNaN(date.getTime())) return "";
  return formatMarShiftTimelineDueTime(date, facilityTimeZone);
}

function abbreviateRoute(route: string | null | undefined): string {
  const r = route?.trim().toUpperCase() ?? "";
  if (!r) return "";
  if (r === "INTRAVENOUS" || r === "IV") return "IV";
  if (r === "INTRAVENOUS PUSH" || r === "IV PUSH") return "IVP";
  if (r === "INTRAVENOUS PIGGYBACK" || r === "IVPB") return "IVPB";
  if (r === "ORAL" || r === "PO") return "PO";
  if (r === "INTRAMUSCULAR" || r === "IM") return "IM";
  if (r === "SUBCUTANEOUS" || r === "SC" || r === "SQ") return "SQ";
  return r.length <= 6 ? r : r.slice(0, 6);
}

function buildPrnMedPrimaryLabel(medicationLabel: string | null, route: string | null): string {
  const med = medicationLabel?.trim() || "Medication";
  const routeAbbrev = abbreviateRoute(route);
  if (!routeAbbrev || med.toUpperCase().includes(routeAbbrev)) return med;
  if (routeAbbrev === "IVP" || routeAbbrev === "IVPB" || routeAbbrev === "PO") {
    return `${med} ${routeAbbrev}`;
  }
  return med;
}

function buildPrnDoseRouteLine(doseAmount: string | null, route: string | null): string {
  const dose = doseAmount?.trim() ?? "";
  const routeAbbrev = abbreviateRoute(route);
  if (dose && routeAbbrev) return `${dose} ${routeAbbrev}`;
  return dose || routeAbbrev || "";
}

export type MarPrnTimelineCellAvailability = "available" | "last_given" | "next_eligible" | "given";

/** Dedicated PRN band cell display (K.10B.8A). */
export function buildMarPrnTimelineCellDisplay(input: {
  medicationLabel: string | null;
  doseAmount?: string | null;
  route?: string | null;
  frequencyCode?: string | null;
  directionsSig?: string | null;
  doseStatus: string;
  administeredAt?: string | null;
  administeredByInitials?: string | null;
  prnLastGivenAt?: string | null;
  prnNextEligibleAt?: string | null;
  facilityTimeZone?: string;
  secondaryTextOverride?: string | null;
  projectedEligibleAt?: string | null;
}): {
  primaryText: string;
  secondaryText: string;
  tertiaryText: string;
  availability: MarPrnTimelineCellAvailability;
} {
  const status = input.doseStatus.trim().toUpperCase();
  const tz = input.facilityTimeZone ?? "UTC";
  const prnFreq = formatMarPrnFrequencyLabel({
    frequencyCode: input.frequencyCode,
    directionsSig: input.directionsSig,
    presentation: "cell",
  });

  const primaryText = buildPrnMedPrimaryLabel(input.medicationLabel, input.route ?? null);
  const doseRouteLine = buildPrnDoseRouteLine(input.doseAmount ?? null, input.route ?? null);

  const terminal = resolvePrnTimelineTerminalDisplay({
    doseStatus: input.doseStatus,
    secondaryText: input.secondaryTextOverride,
  });

  if (status === "COMPLETED" && input.administeredAt) {
    const timeLabel = formatPrnTimelineTime(input.administeredAt, tz);
    const initials = input.administeredByInitials?.trim();
    return {
      primaryText,
      secondaryText: doseRouteLine,
      tertiaryText: initials ? `GIVEN ${timeLabel} ${initials}` : `GIVEN ${timeLabel}`,
      availability: "given",
    };
  }

  if (terminal?.colorKey === "refused" && input.administeredAt) {
    const timeLabel = formatPrnTimelineTime(input.administeredAt, tz);
    return {
      primaryText,
      secondaryText: "REFUSED",
      tertiaryText: timeLabel ? `REFUSED ${timeLabel}` : "REFUSED",
      availability: "given",
    };
  }

  if (terminal?.colorKey === "held") {
    const actedAt = input.administeredAt ?? input.prnLastGivenAt;
    const timeLabel = actedAt ? formatPrnTimelineTime(actedAt, tz) : "";
    return {
      primaryText,
      secondaryText: "HELD",
      tertiaryText: timeLabel ? `HELD ${timeLabel}` : "HELD",
      availability: "given",
    };
  }

  const secondaryText = doseRouteLine || prnFreq;
  const nowMs = Date.now();

  const projectedEligibleMs = parseInstant(input.projectedEligibleAt);
  if (projectedEligibleMs != null && status === "DUE") {
    const trueNextEligibleMs =
      parseInstant(input.prnNextEligibleAt) ?? projectedEligibleMs;
    if (trueNextEligibleMs > nowMs) {
      const nextLabel = formatPrnTimelineTime(new Date(trueNextEligibleMs), tz);
      return {
        primaryText,
        secondaryText,
        tertiaryText: `Next eligible ${nextLabel}`,
        availability: "next_eligible",
      };
    }
    return {
      primaryText,
      secondaryText,
      tertiaryText: prnFreq,
      availability: "available",
    };
  }

  const lastGiven = input.prnLastGivenAt ?? input.administeredAt ?? null;
  const nextEligible = input.prnNextEligibleAt ?? null;
  const nextEligibleMs = nextEligible ? parseInstant(nextEligible) : null;

  if (nextEligibleMs != null && nextEligibleMs > nowMs && nextEligible) {
    const nextLabel = formatPrnTimelineTime(nextEligible, tz);
    const lastLabel = lastGiven ? formatPrnTimelineTime(lastGiven, tz) : null;
    return {
      primaryText,
      secondaryText,
      tertiaryText: lastLabel
        ? `Last given ${lastLabel} · Next eligible ${nextLabel}`
        : `Next eligible ${nextLabel}`,
      availability: "next_eligible",
    };
  }

  if (lastGiven) {
    const lastLabel = formatPrnTimelineTime(lastGiven, tz);
    if (nextEligible && nextEligibleMs != null && nextEligibleMs <= nowMs) {
      const nextLabel = formatPrnTimelineTime(nextEligible, tz);
      return {
        primaryText,
        secondaryText,
        tertiaryText: `Last given ${lastLabel} · Next eligible ${nextLabel}`,
        availability: "available",
      };
    }
    return {
      primaryText,
      secondaryText,
      tertiaryText: `Last given ${lastLabel}`,
      availability: "last_given",
    };
  }

  return {
    primaryText,
    secondaryText,
    tertiaryText: prnFreq,
    availability: "available",
  };
}

/** Column placement for PRN band items — admin hour, next eligible, or reference hour. */
export function resolveMarPrnTimelinePlacementInstant(input: {
  doseStatus: string;
  administeredAt?: Date | string | null;
  prnLastGivenAt?: Date | string | null;
  prnNextEligibleAt?: Date | string | null;
  referenceAt: Date;
}): Date {
  const status = input.doseStatus.trim().toUpperCase();
  if (status === "COMPLETED" && input.administeredAt) {
    const admin = new Date(input.administeredAt);
    if (!Number.isNaN(admin.getTime())) return admin;
  }

  if (status === "HELD" || status === "REFUSED") {
    const acted = input.administeredAt ?? input.prnLastGivenAt;
    if (acted) {
      const actedDate = new Date(acted);
      if (!Number.isNaN(actedDate.getTime())) return actedDate;
    }
  }

  const nextEligibleMs = parseInstant(input.prnNextEligibleAt);
  if (nextEligibleMs != null && nextEligibleMs > input.referenceAt.getTime()) {
    return new Date(nextEligibleMs);
  }

  const lastGivenMs = parseInstant(input.prnLastGivenAt ?? input.administeredAt);
  if (lastGivenMs != null) {
    return new Date(lastGivenMs);
  }

  return input.referenceAt;
}

export type PrnTimelineTerminalDisplay = {
  colorKey: Exclude<MarShiftTimelineStatusColorKey, "prnRow">;
  availability: MarPrnTimelineCellAvailability;
};

/** Terminal PRN cell palette inside the yellow PRN band (K.10B.11). */
export function resolvePrnTimelineTerminalDisplay(input: {
  doseStatus: string;
  readOnly?: boolean;
  secondaryText?: string | null;
}): PrnTimelineTerminalDisplay | null {
  const status = input.doseStatus.trim().toUpperCase();
  const secondary = input.secondaryText?.trim().toUpperCase() ?? "";

  if (secondary === "REFUSED") {
    return { colorKey: "refused", availability: "given" };
  }
  if (status === "HELD" || secondary === "HELD") {
    return { colorKey: "held", availability: "given" };
  }
  if (status === "COMPLETED" || secondary === "DONE") {
    return { colorKey: "administered", availability: "given" };
  }
  if (status === "CANCELLED" || secondary === "CANCELED" || secondary === "ANNULÉ") {
    return { colorKey: "cancelled", availability: "given" };
  }
  return null;
}

/** PRN items remain on the timeline after terminal MAR even when includeCompleted=false. */
export function shouldRetainPrnTimelineItem(input: {
  isPrnBand: boolean;
  doseStatus: string;
  includeCompleted: boolean;
  secondaryText?: string | null;
}): boolean {
  if (!input.isPrnBand) return false;
  if (input.includeCompleted) return false;
  return resolvePrnTimelineTerminalDisplay({
    doseStatus: input.doseStatus,
    secondaryText: input.secondaryText,
  }) != null;
}

/** Alias for placement helper used by K.10B.11 specs. */
export const resolvePrnTimelinePlacementInstant = resolveMarPrnTimelinePlacementInstant;

export function prnTimelineCellPriority(input: {
  doseStatus: string;
  readOnly?: boolean;
  secondaryText?: string | null;
  hasMedicationDoseInstanceId?: boolean;
  prnProjectionKey?: string | null;
}): number {
  const terminal = resolvePrnTimelineTerminalDisplay(input);
  if (terminal) return 300;
  if (input.prnProjectionKey?.startsWith("terminal:")) return 300;
  if (input.prnProjectionKey?.trim()) return 175;
  const status = input.doseStatus.trim().toUpperCase();
  if (status === "DUE" || status === "IN_PROGRESS" || status === "PLANNED") return 200;
  if (input.hasMedicationDoseInstanceId) return 100;
  return 50;
}

export function resolveMarPrnTimelineColumnKey(input: {
  doseStatus: string;
  administeredAt?: Date | string | null;
  prnLastGivenAt?: Date | string | null;
  prnNextEligibleAt?: Date | string | null;
  referenceAt: Date;
  columns: readonly MarShiftTimelineColumn[];
  facilityTimeZone?: string | null;
}): string | null {
  const placement = resolveMarPrnTimelinePlacementInstant(input);
  return resolveMarShiftTimelineColumnKey({
    scheduledAt: placement,
    columns: input.columns,
    facilityTimeZone: input.facilityTimeZone,
  });
}

export type PrnTimelineAvailabilityProjection = {
  projectionKey: string;
  orderItemId: string;
  eligibleAt: string;
  doseStatus: "DUE";
  prnNextEligibleAt: string | null;
};

const PRN_PROJECTABLE_INTERVAL_CODES = new Set(["Q4H", "Q6H", "Q8H", "Q12H"]);

function resolvePrnProjectionIntervalMinutes(
  frequencyCode: string | null | undefined
): number | null {
  const code = frequencyCode?.trim().toUpperCase() ?? "";
  if (!code || !PRN_PROJECTABLE_INTERVAL_CODES.has(code)) return null;
  const def = getMedicationFrequencyDefinition(code);
  if (def?.intervalMinutes == null || def.intervalMinutes <= 0) return null;
  return def.intervalMinutes;
}

function resolvePrnAvailabilityAnchorMs(input: {
  firstEligibleAt?: Date | string | null;
  plannedAt?: Date | string | null;
  createdAt?: Date | string | null;
}): number | null {
  return (
    parseInstant(input.firstEligibleAt) ??
    parseInstant(input.plannedAt) ??
    parseInstant(input.createdAt)
  );
}

/** Project the next PRN availability slot inside a shift (H9J — one per order). */
export function buildPrnTimelineAvailabilityProjections(input: {
  orderItemId: string;
  frequencyCode?: string | null;
  firstEligibleAt?: Date | string | null;
  plannedAt?: Date | string | null;
  createdAt?: Date | string | null;
  lastAdministeredAt?: Date | string | null;
  shiftStartAt: Date | string;
  shiftEndAt: Date | string;
  maxProjectionsPerShift?: number;
  terminalAdministeredAt?: Date | string | null;
}): PrnTimelineAvailabilityProjection[] {
  const shiftStartMs = parseInstant(input.shiftStartAt);
  const shiftEndMs = parseInstant(input.shiftEndAt);
  if (shiftStartMs == null || shiftEndMs == null || shiftEndMs <= shiftStartMs) {
    return [];
  }

  const max = Math.min(input.maxProjectionsPerShift ?? 1, 1);
  const terminalMs = parseInstant(input.terminalAdministeredAt);
  const lastAdminMs = parseInstant(input.lastAdministeredAt);
  const intervalMinutes = resolvePrnProjectionIntervalMinutes(input.frequencyCode);
  const intervalMs =
    intervalMinutes != null ? intervalMinutes * 60_000 : null;

  const isOncePrn = input.frequencyCode?.trim().toUpperCase() === "ONCE";

  const isSlotVisible = (ms: number): boolean => {
    if (ms < shiftStartMs || ms >= shiftEndMs) return false;
    if (terminalMs != null && ms === terminalMs) return false;
    return true;
  };

  let nextSlotMs: number | null = null;

  if (intervalMs == null || isOncePrn) {
    const anchorMs = lastAdminMs ?? resolvePrnAvailabilityAnchorMs(input);
    if (anchorMs != null && isSlotVisible(anchorMs)) {
      nextSlotMs = anchorMs;
    }
  } else if (lastAdminMs != null) {
    let cursor = lastAdminMs + intervalMs;
    while (cursor < shiftEndMs && nextSlotMs == null) {
      if (isSlotVisible(cursor)) {
        nextSlotMs = cursor;
        break;
      }
      cursor += intervalMs;
    }
  } else {
    const anchorMs = resolvePrnAvailabilityAnchorMs(input);
    if (anchorMs == null) return [];
    let cursor = anchorMs;
    if (cursor < shiftStartMs) {
      while (cursor < shiftStartMs) {
        cursor += intervalMs;
      }
    }
    while (cursor < shiftEndMs && nextSlotMs == null) {
      if (isSlotVisible(cursor)) {
        nextSlotMs = cursor;
        break;
      }
      cursor += intervalMs;
    }
  }

  if (nextSlotMs == null) return [];

  const eligibleAt = new Date(nextSlotMs).toISOString();
  const trueNextEligible = resolveMarPrnNextEligibleAt({
    lastAdministeredAt: input.lastAdministeredAt,
    frequencyCode: input.frequencyCode,
  });

  return [
    {
      projectionKey: `${input.orderItemId}:${eligibleAt}`,
      orderItemId: input.orderItemId,
      eligibleAt,
      doseStatus: "DUE" as const,
      prnNextEligibleAt: trueNextEligible?.toISOString() ?? eligibleAt,
    },
  ].slice(0, max);
}

export type MarPrnTimelineDedupeItem = {
  orderItemId: string;
  isPrnBand?: boolean;
  prnProjectionKey?: string | null;
  medicationDoseInstanceId?: string | null;
  doseStatus: string;
  readOnly?: boolean;
  secondaryText?: string | null;
  scheduledAt?: string | null;
};

/** H9J — keep at most one PRN projection per orderItemId (earliest next eligible). */
export function dedupeMarPrnTimelineCells<T extends MarPrnTimelineDedupeItem>(
  items: readonly T[]
): T[] {
  const prnByOrder = new Map<string, T[]>();
  const result: T[] = [];

  for (const item of items) {
    if (item.isPrnBand !== true) {
      result.push(item);
      continue;
    }
    const list = prnByOrder.get(item.orderItemId) ?? [];
    list.push(item);
    prnByOrder.set(item.orderItemId, list);
  }

  for (const [, group] of prnByOrder) {
    const nonProjections = group.filter((g) => !g.prnProjectionKey?.trim());
    const projections = group.filter((g) => g.prnProjectionKey?.trim());

    result.push(...nonProjections);

    if (projections.length <= 1) {
      result.push(...projections);
      continue;
    }

    const sorted = [...projections].sort((a, b) => {
      const aMs = parseInstant(a.scheduledAt) ?? Number.POSITIVE_INFINITY;
      const bMs = parseInstant(b.scheduledAt) ?? Number.POSITIVE_INFINITY;
      return aMs - bMs;
    });
    result.push(sorted[0]!);
  }

  return result;
}

/** H9J — cross-column dedupe: one PRN projection per orderItemId on a timeline row. */
export function dedupeMarPrnTimelineRowCells<
  T extends MarPrnTimelineDedupeItem & { columnKey?: string },
>(cells: { columnKey: string; items: T[] }[]): { columnKey: string; items: T[] }[] {
  const seenProjectionOrderItems = new Set<string>();
  const nextCells: { columnKey: string; items: T[] }[] = [];

  for (const cell of cells) {
    const dedupedItems = dedupeMarPrnTimelineCells(cell.items).filter((item) => {
      if (item.isPrnBand !== true || !item.prnProjectionKey?.trim()) return true;
      if (seenProjectionOrderItems.has(item.orderItemId)) return false;
      seenProjectionOrderItems.add(item.orderItemId);
      return true;
    });
    if (dedupedItems.length > 0) {
      nextCells.push({ columnKey: cell.columnKey, items: dedupedItems });
    }
  }

  return nextCells;
}
