import { formatClinicalDateTimeInZone } from "../clinical/clinicalTimeZone.js";
import { CONTROLLED_SUBSTANCE_GOVERNANCE_MANIFEST } from "../medication/controlledSubstanceGovernanceManifest.js";
import type { MarScheduleAdministrationTimingKind } from "../medication/marScheduleAdministrationTiming.js";
import {
  isMarUniversalAdministrationOverrideReasonCode,
  MAR_UNIVERSAL_ADMINISTRATION_OVERRIDE_REASON_CODES,
} from "./marUniversalAdministrationTimingGovernance.js";
import {
  assessMarMedicationTimingOverrideRequirement,
  normalizeMarMedicationTimingOverrideReasonCode,
} from "./marMedicationTimingOverrideGovernance.js";
import {
  MAR_STANDARD_ADMINISTRATION_WINDOW_MINUTES,
  resolveMarAdministrationWindowStatus,
} from "./marMedicationAdministrationWindow.js";
import {
  resolveMarMedicationTimingAdvisory,
  type MarMedicationTimingAdvisory,
} from "./marMedicationTimingAdvisory.js";

/** Persisted prefix for early/late schedule timing documentation (K.10B.9). */
export const MAR_SCHEDULE_TIMING_NOTE_PREFIX = "MAR_SCHEDULE_TIMING:";

/** Persisted prefix for missed-dose documentation (K.10B.9). */
export const MAR_MISSED_DOSE_NOTE_PREFIX = "Missed:";

export const MAR_SCHEDULE_EARLY_REASON_CODES = [
  "PATIENT_LEAVING_UNIT",
  "PROVIDER_REQUESTED_EARLY",
  "PROCEDURE_SCHEDULED",
  "PAIN_CRISIS",
  "NAUSEA_VOMITING",
  "OTHER",
] as const;

export type MarScheduleEarlyReasonCode = (typeof MAR_SCHEDULE_EARLY_REASON_CODES)[number];

export const MAR_SCHEDULE_LATE_REASON_CODES = [
  "PATIENT_UNAVAILABLE",
  "MEDICATION_UNAVAILABLE",
  "CLINICAL_DELAY",
  "PROCEDURE",
  "PROVIDER_REQUEST",
  "OTHER",
] as const;

export type MarScheduleLateReasonCode = (typeof MAR_SCHEDULE_LATE_REASON_CODES)[number];

export const MAR_MISSED_DOSE_REASON_CODES = [
  "PATIENT_UNAVAILABLE",
  "MEDICATION_UNAVAILABLE",
  "TRANSFERRED",
  "PROCEDURE",
  "CLINICAL_HOLD",
  "OTHER",
] as const;

export type MarMissedDoseReasonCode = (typeof MAR_MISSED_DOSE_REASON_CODES)[number];

/** Enterprise controlled substances requiring verifier readiness (K.10B.9 Part 4). */
export const MAR_ENTERPRISE_CONTROLLED_SUBSTANCE_GENERIC_NAMES = [
  "Morphine",
  "Hydromorphone",
  "Fentanyl",
  "Lorazepam",
  "Diazepam",
  "Midazolam",
] as const;

export type MarEnterpriseControlledSubstanceGenericName =
  (typeof MAR_ENTERPRISE_CONTROLLED_SUBSTANCE_GENERIC_NAMES)[number];

/** Future-ready verifier slot — no dual-sign enforcement yet (K.10B.9). */
export type MarControlledSubstanceVerifierReadiness = {
  verifierUserId: string | null;
  verifierDisplayName: string | null;
  verifierInitials: string | null;
  verifiedAtIso: string | null;
  /** When true, UI should collect verifier before save (future phase). */
  verificationRequired: boolean;
  /** Controlled substance on enterprise manifest. */
  enterpriseControlled: boolean;
  genericName: string | null;
};

export type MarScheduleTimingGovernanceResult = {
  kind: MarScheduleAdministrationTimingKind;
  scheduledTimeDisplay: string;
  actualTimeDisplay: string;
  minutesDelta: number;
  directionLabel: "early" | "late" | "on_time";
  requiresReason: boolean;
};

function parseInstant(value: Date | string | null | undefined): Date | null {
  if (value == null) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Single early/late administration governance evaluator (K.10B.9 Part 1–2).
 * Scheduled time = planning anchor; administered time = clinical truth input.
 */
export function evaluateMarScheduleTimingGovernance(input: {
  administeredAt: Date | string;
  scheduledAt: Date | string;
  dueWindowStartAt?: Date | string | null;
  dueWindowEndAt?: Date | string | null;
  facilityTimeZone: string;
  locale?: string;
}): MarScheduleTimingGovernanceResult {
  const administered = parseInstant(input.administeredAt);
  const scheduled = parseInstant(input.scheduledAt);
  const locale = input.locale ?? "en-US";
  const tz = input.facilityTimeZone;

  if (!administered || !scheduled) {
    return {
      kind: "on_time",
      scheduledTimeDisplay: "",
      actualTimeDisplay: "",
      minutesDelta: 0,
      directionLabel: "on_time",
      requiresReason: false,
    };
  }

  const scheduledDisplay = formatClinicalDateTimeInZone(scheduled, locale, tz);
  const actualDisplay = formatClinicalDateTimeInZone(administered, locale, tz);

  const windowStatus = resolveMarAdministrationWindowStatus({
    scheduledAt: scheduled,
    administeredAt: administered,
    windowMinutes: MAR_STANDARD_ADMINISTRATION_WINDOW_MINUTES,
  });

  if (windowStatus.status === "EARLY") {
    const minutesEarly = Math.max(1, Math.abs(windowStatus.minutesDelta));
    return {
      kind: "early",
      scheduledTimeDisplay: scheduledDisplay,
      actualTimeDisplay: actualDisplay,
      minutesDelta: minutesEarly,
      directionLabel: "early",
      requiresReason: false,
    };
  }

  if (windowStatus.status === "LATE") {
    const minutesLate = Math.max(1, Math.abs(windowStatus.minutesDelta));
    return {
      kind: "late",
      scheduledTimeDisplay: scheduledDisplay,
      actualTimeDisplay: actualDisplay,
      minutesDelta: minutesLate,
      directionLabel: "late",
      requiresReason: false,
    };
  }

  return {
    kind: "on_time",
    scheduledTimeDisplay: scheduledDisplay,
    actualTimeDisplay: actualDisplay,
    minutesDelta: 0,
    directionLabel: "on_time",
    requiresReason: false,
  };
}

export function buildMarScheduleTimingDocumentation(input: {
  kind: "early" | "late";
  reasonCode: MarScheduleEarlyReasonCode | MarScheduleLateReasonCode | string;
  otherText?: string | null;
  minutesDelta: number;
}): string {
  const code = String(input.reasonCode).trim().toUpperCase();
  const detail =
    code === "OTHER"
      ? input.otherText?.trim() || ""
      : code.replace(/_/g, " ").toLowerCase();
  if (code === "OTHER" && !detail) {
    throw new Error("Schedule timing reason detail required for OTHER");
  }
  const direction = input.kind === "early" ? "EARLY" : "LATE";
  const suffix = code === "OTHER" ? `OTHER — ${detail}` : code;
  return `${MAR_SCHEDULE_TIMING_NOTE_PREFIX} ${direction} ${input.minutesDelta}m — ${suffix}`;
}

export function validateMarScheduleTimingGovernance(input: {
  timing: Pick<MarScheduleTimingGovernanceResult, "requiresReason" | "kind"> & {
    minutesDelta?: number;
  };
  administeredAt?: Date | string;
  scheduledAt?: Date | string;
  documentedAt?: Date | string;
  isPrn?: boolean;
  reasonCode?: string | null;
  otherText?: string | null;
}): { ok: true; advisory?: MarMedicationTimingAdvisory } {
  void input.timing;
  void input.reasonCode;
  void input.otherText;

  if (!input.administeredAt) {
    return { ok: true };
  }

  const advisory = resolveMarMedicationTimingAdvisory({
    scheduledAt: input.scheduledAt,
    clinicalEventAt: input.administeredAt,
    documentedAt: input.documentedAt,
    isPrn: input.isPrn,
  });

  if (advisory.severity === "NONE") {
    return { ok: true };
  }
  return { ok: true, advisory };
}

export function buildMarMissedDoseDocumentation(
  reasonCode: MarMissedDoseReasonCode | string,
  otherText?: string | null
): string {
  const code = String(reasonCode).trim().toUpperCase();
  if (code === "OTHER") {
    const detail = otherText?.trim();
    if (!detail) throw new Error("Missed dose reason detail required for OTHER");
    return `${MAR_MISSED_DOSE_NOTE_PREFIX} OTHER — ${detail}`;
  }
  return `${MAR_MISSED_DOSE_NOTE_PREFIX} ${code}`;
}

export function validateMarMissedDoseGovernance(input: {
  reasonCode?: string | null;
  otherText?: string | null;
}): { ok: true } | { ok: false; code: "REASON_REQUIRED" | "OTHER_DETAIL_REQUIRED" } {
  const code = input.reasonCode?.trim().toUpperCase() ?? "";
  if (!code || !(MAR_MISSED_DOSE_REASON_CODES as readonly string[]).includes(code)) {
    return { ok: false, code: "REASON_REQUIRED" };
  }
  if (code === "OTHER" && !input.otherText?.trim()) {
    return { ok: false, code: "OTHER_DETAIL_REQUIRED" };
  }
  return { ok: true };
}

export function isMarMissedDoseNotes(notes: string | null | undefined): boolean {
  return notes?.trim().toLowerCase().startsWith(MAR_MISSED_DOSE_NOTE_PREFIX.toLowerCase()) === true;
}

export type MarGovernanceReasonFromNotes = {
  reasonCode: string;
  otherText: string | null;
};

/** Parses structured early/late reason from persisted MAR notes (K.10B.9A). */
export function parseMarScheduleTimingReasonFromNotes(
  notes: string | null | undefined
): MarGovernanceReasonFromNotes | null {
  const trimmed = notes?.trim();
  if (!trimmed?.startsWith(MAR_SCHEDULE_TIMING_NOTE_PREFIX)) return null;
  const afterPrefix = trimmed.slice(MAR_SCHEDULE_TIMING_NOTE_PREFIX.length).trim();
  const separator = " — ";
  const dashIdx = afterPrefix.indexOf(separator);
  if (dashIdx < 0) return null;
  const suffix = afterPrefix.slice(dashIdx + separator.length).trim();
  if (!suffix) return null;
  if (suffix.startsWith("OTHER — ")) {
    return { reasonCode: "OTHER", otherText: suffix.slice("OTHER — ".length).trim() || null };
  }
  if (suffix.startsWith("OTHER - ")) {
    return { reasonCode: "OTHER", otherText: suffix.slice("OTHER - ".length).trim() || null };
  }
  return { reasonCode: suffix.trim().toUpperCase(), otherText: null };
}

/** Parses structured missed-dose reason from persisted MAR notes (K.10B.9A). */
export function parseMarMissedDoseReasonFromNotes(
  notes: string | null | undefined
): MarGovernanceReasonFromNotes | null {
  if (!isMarMissedDoseNotes(notes)) return null;
  const body = notes!.trim().slice(MAR_MISSED_DOSE_NOTE_PREFIX.length).trim();
  if (!body) return null;
  if (body.startsWith("OTHER — ")) {
    return { reasonCode: "OTHER", otherText: body.slice("OTHER — ".length).trim() || null };
  }
  if (body.startsWith("OTHER - ")) {
    return { reasonCode: "OTHER", otherText: body.slice("OTHER - ".length).trim() || null };
  }
  return { reasonCode: body.trim().toUpperCase(), otherText: null };
}

/** True when MAR create represents a missed dose (not legacy not_available refuse). */
export function isMarMissedDoseMarCreate(input: {
  marAction: string;
  notes?: string | null;
  missedReasonCode?: string | null;
}): boolean {
  if (input.marAction.trim().toLowerCase() !== "not_available") return false;
  if (input.missedReasonCode?.trim()) return true;
  return isMarMissedDoseNotes(input.notes);
}

export function isEnterpriseControlledSubstanceMedication(input: {
  genericName?: string | null;
  displayName?: string | null;
  catalogCode?: string | null;
}): boolean {
  const hay = `${input.genericName ?? ""} ${input.displayName ?? ""} ${input.catalogCode ?? ""}`.toLowerCase();
  return MAR_ENTERPRISE_CONTROLLED_SUBSTANCE_GENERIC_NAMES.some((name) =>
    hay.includes(name.toLowerCase())
  );
}

export function resolveMarControlledSubstanceVerifierReadiness(input: {
  genericName?: string | null;
  displayName?: string | null;
  catalogCode?: string | null;
  isControlled?: boolean | null;
  requiresDoubleSign?: boolean | null;
  witnessUserId?: string | null;
  witnessDisplayName?: string | null;
  witnessInitials?: string | null;
  verifiedAtIso?: string | null;
}): MarControlledSubstanceVerifierReadiness {
  const enterpriseControlled = isEnterpriseControlledSubstanceMedication(input);
  const manifestMatch = CONTROLLED_SUBSTANCE_GOVERNANCE_MANIFEST.find(
    (entry) =>
      entry.governanceStatus === "APPLY" &&
      (input.catalogCode?.trim() === entry.catalogCode?.trim() ||
        input.genericName?.trim().toLowerCase() === entry.genericName.toLowerCase())
  );
  const verificationRequired =
    Boolean(input.isControlled || manifestMatch || enterpriseControlled) &&
    Boolean(manifestMatch?.requiresDoubleSign ?? input.requiresDoubleSign);
  return {
    verifierUserId: input.witnessUserId?.trim() || null,
    verifierDisplayName: input.witnessDisplayName?.trim() || null,
    verifierInitials: input.witnessInitials?.trim() || null,
    verifiedAtIso: input.verifiedAtIso?.trim() || null,
    verificationRequired,
    enterpriseControlled,
    genericName: input.genericName?.trim() || manifestMatch?.genericName || null,
  };
}
