/** MEDUI.ED.MAR.H9L.1 — non-blocking medication response follow-up window governance. */

import { parseMedicationFrequencyCode } from "../medication/medicationFrequencyCatalog.js";
import {
  classifyMarPrnReasonGroup,
  isOpioidPainMedicationLabel,
  isPrnMedicationOrder,
} from "./medicationAdministrationPrnGovernance.js";
import {
  parseMarMedicationResponseNotes,
  type ParsedMarMedicationResponse,
} from "./marMedicationResponseGovernance.js";
import {
  resolveMedicationResponseVisibilityTier,
  type MarMedicationResponseVisibilityInput,
} from "./marMedicationResponseVisibilityGovernance.js";

export type MarMedicationResponseFollowUpStatus =
  | "NOT_DUE"
  | "RECOMMENDED"
  | "OVERDUE"
  | "DOCUMENTED"
  | "NOT_APPLICABLE";

export type MarMedicationResponseFollowUpWindow = {
  category:
    | "IV_OPIOID"
    | "ORAL_OPIOID"
    | "ANTIEMETIC"
    | "RESPIRATORY"
    | "SEDATIVE"
    | "EMERGENCY"
    | "PRN_DEFAULT";
  earliestMinutes: number;
  latestMinutes: number;
};

export type MarMedicationResponseFollowUpInput = MarMedicationResponseVisibilityInput & {
  route?: string | null;
  administeredAt?: string | null;
  administrationNotes?: string | null;
  responses?: ParsedMarMedicationResponse[];
  referenceAt?: string | Date | null;
};

export type MarMedicationResponseFollowUpSummary = {
  status: MarMedicationResponseFollowUpStatus;
  window: MarMedicationResponseFollowUpWindow | null;
  earliestAt: string | null;
  latestAt: string | null;
  administeredAt: string | null;
  responseCount: number;
  minutesSinceAdministration: number | null;
  minutesUntilEarliest: number | null;
  minutesUntilLatest: number | null;
  minutesOverdue: number | null;
};

const FOLLOW_UP_WINDOWS: Record<
  MarMedicationResponseFollowUpWindow["category"],
  Pick<MarMedicationResponseFollowUpWindow, "earliestMinutes" | "latestMinutes">
> = {
  IV_OPIOID: { earliestMinutes: 15, latestMinutes: 60 },
  ORAL_OPIOID: { earliestMinutes: 30, latestMinutes: 90 },
  ANTIEMETIC: { earliestMinutes: 30, latestMinutes: 120 },
  RESPIRATORY: { earliestMinutes: 15, latestMinutes: 60 },
  SEDATIVE: { earliestMinutes: 15, latestMinutes: 60 },
  EMERGENCY: { earliestMinutes: 5, latestMinutes: 30 },
  PRN_DEFAULT: { earliestMinutes: 30, latestMinutes: 120 },
};

const IV_ROUTE_TOKENS = [" iv", " ivp", " ivpb", "intravenous", "intraveineuse", "perfusion"];
const ORAL_ROUTE_TOKENS = [" po", "oral", "orale", "per os", "by mouth"];
const RESPIRATORY_TOKENS = ["albuterol", "salbutamol", "duoneb", "ipratropium", "bronchodilator"];
const SEDATIVE_TOKENS = [
  "midazolam",
  "lorazepam",
  "diazepam",
  "alprazolam",
  "clonazepam",
  "zolpidem",
  "sedative",
  "benzodiazep",
];

function normalizeText(raw: string | null | undefined): string {
  return (raw ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function combinedMedicationText(input: MarMedicationResponseFollowUpInput): string {
  return normalizeText(
    [
      input.medicationLabel,
      input.genericName,
      input.manualLabel,
      input.manualSecondaryText,
      input.prnIndication,
      input.directionsSig,
      input.route,
    ]
      .filter(Boolean)
      .join(" ")
  );
}

function isIvRoute(route: string | null | undefined, text: string): boolean {
  const routeText = normalizeText(route);
  if (routeText.includes("iv") || routeText.includes("intravenous")) return true;
  return IV_ROUTE_TOKENS.some((token) => text.includes(token));
}

function isOralRoute(route: string | null | undefined, text: string): boolean {
  const routeText = normalizeText(route);
  if (routeText.includes("oral") || routeText === "po") return true;
  return ORAL_ROUTE_TOKENS.some((token) => text.includes(token.trim()));
}

function isRespiratoryMedication(input: MarMedicationResponseFollowUpInput): boolean {
  if (classifyMarPrnReasonGroup(input) === "respiratory") return true;
  const text = combinedMedicationText(input);
  return RESPIRATORY_TOKENS.some((token) => text.includes(token));
}

function isSedativeMedication(input: MarMedicationResponseFollowUpInput): boolean {
  if (classifyMarPrnReasonGroup(input) === "anxiety_sleep") return true;
  const text = combinedMedicationText(input);
  return SEDATIVE_TOKENS.some((token) => text.includes(token));
}

function isPainOpioidMedication(input: MarMedicationResponseFollowUpInput): boolean {
  if (classifyMarPrnReasonGroup(input) === "pain") return true;
  return isOpioidPainMedicationLabel(
    input.medicationLabel ?? input.manualLabel,
    input.genericName ?? input.manualSecondaryText
  );
}

const EMERGENCY_FREQUENCY_CODES = new Set(["STAT", "NOW"]);
const EMERGENCY_TOKENS = [
  "epinephrine",
  "adrenaline",
  "atropine",
  "naloxone",
  "narcan",
  "dextrose",
  "glucagon",
  "nitroglycerin",
  "nitroglycerine",
  "emergency",
  "urgence",
] as const;

function isEmergencyMedication(input: MarMedicationResponseFollowUpInput): boolean {
  const parsed = parseMedicationFrequencyCode(input.frequencyCode ?? null);
  if (parsed && EMERGENCY_FREQUENCY_CODES.has(parsed)) return true;
  const text = combinedMedicationText(input);
  if (/\b(stat|now|asap)\b/.test(text)) return true;
  return EMERGENCY_TOKENS.some((token) => text.includes(token));
}

function isOptionalMaintenanceOnly(input: MarMedicationResponseFollowUpInput): boolean {
  return resolveMedicationResponseVisibilityTier(input) === "OPTIONAL";
}

/** Resolve suggested non-blocking follow-up window for an administered medication. */
export function resolveMarMedicationResponseFollowUpWindow(
  input: MarMedicationResponseFollowUpInput
): MarMedicationResponseFollowUpWindow | null {
  if (resolveMedicationResponseVisibilityTier(input) === "HIDDEN") return null;
  if (isOptionalMaintenanceOnly(input)) return null;

  const text = combinedMedicationText(input);
  const route = input.route;

  if (isEmergencyMedication(input)) {
    return { category: "EMERGENCY", ...FOLLOW_UP_WINDOWS.EMERGENCY };
  }

  if (isPainOpioidMedication(input)) {
    if (isIvRoute(route, text)) {
      return { category: "IV_OPIOID", ...FOLLOW_UP_WINDOWS.IV_OPIOID };
    }
    if (isOralRoute(route, text)) {
      return { category: "ORAL_OPIOID", ...FOLLOW_UP_WINDOWS.ORAL_OPIOID };
    }
    return { category: "IV_OPIOID", ...FOLLOW_UP_WINDOWS.IV_OPIOID };
  }

  if (classifyMarPrnReasonGroup(input) === "antiemetic") {
    return { category: "ANTIEMETIC", ...FOLLOW_UP_WINDOWS.ANTIEMETIC };
  }

  if (isRespiratoryMedication(input)) {
    return { category: "RESPIRATORY", ...FOLLOW_UP_WINDOWS.RESPIRATORY };
  }

  if (isSedativeMedication(input)) {
    return { category: "SEDATIVE", ...FOLLOW_UP_WINDOWS.SEDATIVE };
  }

  if (isPrnMedicationOrder(input)) {
    return { category: "PRN_DEFAULT", ...FOLLOW_UP_WINDOWS.PRN_DEFAULT };
  }

  const parsed = parseMedicationFrequencyCode(input.frequencyCode ?? null);
  if (parsed === "PRN") {
    return { category: "PRN_DEFAULT", ...FOLLOW_UP_WINDOWS.PRN_DEFAULT };
  }

  return null;
}

function toDate(value: string | Date | null | undefined): Date | null {
  if (value == null) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
}

function minutesBetween(start: Date, end: Date): number {
  return Math.round((end.getTime() - start.getTime()) / 60_000);
}

/** Non-blocking follow-up status relative to administration and documented responses. */
export function resolveMarMedicationResponseFollowUpStatus(
  input: MarMedicationResponseFollowUpInput
): MarMedicationResponseFollowUpStatus {
  const responses =
    input.responses ?? parseMarMedicationResponseNotes(input.administrationNotes);
  if (responses.length > 0) return "DOCUMENTED";

  const window = resolveMarMedicationResponseFollowUpWindow(input);
  if (!window) return "NOT_APPLICABLE";

  const administeredAt = toDate(input.administeredAt);
  const now = toDate(input.referenceAt) ?? new Date();
  if (!administeredAt) return "NOT_APPLICABLE";

  const elapsedMinutes = minutesBetween(administeredAt, now);
  if (elapsedMinutes < window.earliestMinutes) return "NOT_DUE";
  if (elapsedMinutes <= window.latestMinutes) return "RECOMMENDED";
  return "OVERDUE";
}

export function buildMarMedicationResponseFollowUpSummary(
  input: MarMedicationResponseFollowUpInput
): MarMedicationResponseFollowUpSummary {
  const responses =
    input.responses ?? parseMarMedicationResponseNotes(input.administrationNotes);
  const window = resolveMarMedicationResponseFollowUpWindow(input);
  const administeredAt = toDate(input.administeredAt);
  const now = toDate(input.referenceAt) ?? new Date();
  const status = resolveMarMedicationResponseFollowUpStatus({
    ...input,
    responses,
  });

  const earliestAt =
    administeredAt && window
      ? new Date(administeredAt.getTime() + window.earliestMinutes * 60_000).toISOString()
      : null;
  const latestAt =
    administeredAt && window
      ? new Date(administeredAt.getTime() + window.latestMinutes * 60_000).toISOString()
      : null;

  const minutesSinceAdministration =
    administeredAt && now ? minutesBetween(administeredAt, now) : null;
  const minutesUntilEarliest =
    window && minutesSinceAdministration != null
      ? Math.max(0, window.earliestMinutes - minutesSinceAdministration)
      : null;
  const minutesUntilLatest =
    window && minutesSinceAdministration != null
      ? Math.max(0, window.latestMinutes - minutesSinceAdministration)
      : null;
  const minutesOverdue =
    window && minutesSinceAdministration != null && minutesSinceAdministration > window.latestMinutes
      ? minutesSinceAdministration - window.latestMinutes
      : null;

  return {
    status,
    window,
    earliestAt,
    latestAt,
    administeredAt: administeredAt?.toISOString() ?? null,
    responseCount: responses.length,
    minutesSinceAdministration,
    minutesUntilEarliest,
    minutesUntilLatest,
    minutesOverdue,
  };
}

/** Non-blocking adverse reaction escalation hint (display only). */
export function resolveMarMedicationResponseAdverseEscalationHint(
  responses: ParsedMarMedicationResponse[]
): boolean {
  return responses.some((response) => response.responseCode === "ADVERSE_REACTION_REPORTED");
}
