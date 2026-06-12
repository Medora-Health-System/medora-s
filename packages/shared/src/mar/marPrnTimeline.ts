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

/** MAR shift timeline status colors (K.10B.8A PRN row governance). */
export const MAR_SHIFT_TIMELINE_STATUS_COLORS = {
  due: { backgroundColor: "#FFF3CD", borderColor: "#E8D38A", color: "#664D03" },
  overdue: { backgroundColor: "#F8D7DA", borderColor: "#F1AEB5", color: "#58151C" },
  administered: { backgroundColor: "#D1E7DD", borderColor: "#A3CFBB", color: "#0A3622" },
  held: { backgroundColor: "#E2E3E5", borderColor: "#C4C8CB", color: "#41464B" },
  prnRow: { backgroundColor: "#FFFBE6", borderColor: "#E8D38A", color: "#664D03" },
} as const;

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

  const secondaryText = doseRouteLine || prnFreq;

  const lastGiven = input.prnLastGivenAt ?? input.administeredAt ?? null;
  const nextEligible = input.prnNextEligibleAt ?? null;
  const nowMs = Date.now();
  const nextEligibleMs = nextEligible ? parseInstant(nextEligible) : null;

  if (nextEligibleMs != null && nextEligibleMs > nowMs && nextEligible) {
    const nextLabel = formatPrnTimelineTime(nextEligible, tz);
    return {
      primaryText,
      secondaryText,
      tertiaryText: `Next: ${nextLabel}`,
      availability: "next_eligible",
    };
  }

  if (lastGiven) {
    const lastLabel = formatPrnTimelineTime(lastGiven, tz);
    return {
      primaryText,
      secondaryText,
      tertiaryText: `Last: ${lastLabel}`,
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
