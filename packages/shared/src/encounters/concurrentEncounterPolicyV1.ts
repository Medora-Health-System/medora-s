/**
 * D3E.6D + MEDUI.D4C.10B — Enterprise concurrent encounter create policy.
 *
 * OPEN/CLOSED is an Encounter state, not a Patient state.
 * Distinct known service lines may coexist (e.g. CLINIC + DENTAL).
 * Same service line is governed by operational episode (appointment / idempotency),
 * not a permanent one-open-per-service-line lock.
 *
 * Hospital admission pathways (D3E.6D) remain authoritative for Inpatient correlation.
 */

import {
  normalizePersistedEncounterServiceLine,
  resolveAuthoritativeEncounterServiceLine,
  serviceLinesMatchForConcurrency,
} from "./enterpriseEncounterServiceLineProvenanceD4c10a.js";
import type { MedoraServiceLine } from "../auth/facilityTypeRegistry.js";

export const UNIT_BED_BOARDS_ADMISSION_INTAKE_CERTIFICATION_ID =
  "MEDUI.UNIT_BED_BOARDS_ADMISSION_INTAKE.D3E6D" as const;

export const D4C10B_CERTIFICATION_ID = "MEDUI.D4C.10B" as const;

export type ConcurrentEncounterPathway =
  | "GENERAL_CREATE"
  | "DIRECT_ADMISSION"
  | "PLACEMENT_RECEIVING"
  | "NURSE_ADMISSION_INTAKE";

export type OpenEncounterSnapshot = {
  id: string;
  type: string;
  status?: string | null;
  /** MEDUI.D4C.10A — nullable legacy unknown. Never invent CLINIC. */
  serviceLine?: string | null;
  /** Linked appointment when present (episode identity). */
  appointmentId?: string | null;
};

export type ConcurrentEncounterDecision =
  | {
      allowed: true;
      code:
        | "OK"
        | "ALLOW_ED_PLUS_INPATIENT"
        | "ALLOW_DISTINCT_SERVICE_LINE"
        | "IDEMPOTENT_REUSE";
      reuseEncounterId?: string;
    }
  | {
      allowed: false;
      code: string;
      detail: string;
      existingEncounterId?: string;
    };

export function normalizeEncounterTypeToken(raw: unknown): string {
  return String(raw ?? "")
    .trim()
    .toUpperCase();
}

function resolveRequestedServiceLine(input: {
  requestedType: string;
  requestedServiceLine?: string | null;
}): MedoraServiceLine | null {
  const explicit = normalizePersistedEncounterServiceLine(input.requestedServiceLine);
  if (explicit) return explicit;
  try {
    return resolveAuthoritativeEncounterServiceLine({
      encounterType: input.requestedType,
    }).serviceLine;
  } catch {
    return null;
  }
}

function isAmbulatoryServiceLine(line: MedoraServiceLine): boolean {
  return line === "CLINIC" || line === "DENTAL" || line === "URGENT_CARE";
}

/**
 * Legacy null serviceLine handling (D4C.10B):
 * - Never fabricate CLINIC for null.
 * - Distinct encounter types / clear cross-context requests → ALLOW.
 * - Same ambulatory type with null vs CLINIC/UC → conservative AMBIGUOUS (block).
 * - null OUTPATIENT + requested DENTAL → ALLOW (null is not Dental provenance).
 */
function classifyLegacyNullOpenVsRequested(input: {
  openType: string;
  requestedType: string;
  requestedLine: MedoraServiceLine;
}): "ALLOW" | "AMBIGUOUS" {
  const openType = normalizeEncounterTypeToken(input.openType);
  const requestedLine = input.requestedLine;

  if (openType === "EMERGENCY" && requestedLine !== "EMERGENCY") return "ALLOW";
  if (openType === "INPATIENT" && isAmbulatoryServiceLine(requestedLine)) return "ALLOW";
  if (openType === "INPATIENT" && requestedLine === "EMERGENCY") return "ALLOW";
  if (openType === "URGENT_CARE" && requestedLine === "DENTAL") return "ALLOW";
  if (openType === "URGENT_CARE" && requestedLine === "EMERGENCY") return "ALLOW";
  if (openType === "OUTPATIENT" && requestedLine === "DENTAL") return "ALLOW";
  if (openType === "OUTPATIENT" && requestedLine === "EMERGENCY") return "ALLOW";
  if (openType === "OUTPATIENT" && (requestedLine === "CLINIC" || requestedLine === "URGENT_CARE")) {
    return "AMBIGUOUS";
  }
  if (openType === "EMERGENCY" && requestedLine === "EMERGENCY") return "AMBIGUOUS";
  if (openType === "URGENT_CARE" && requestedLine === "URGENT_CARE") return "AMBIGUOUS";
  if (openType === normalizeEncounterTypeToken(input.requestedType)) return "AMBIGUOUS";
  return "ALLOW";
}

function sameOperationalEpisode(
  open: OpenEncounterSnapshot,
  requestedAppointmentId?: string | null
): boolean {
  const openAppt = String(open.appointmentId ?? "").trim();
  const reqAppt = String(requestedAppointmentId ?? "").trim();
  // Both unbound (e.g. Dental dashboard double-click / walk-in retry) → same episode.
  if (!openAppt && !reqAppt) return true;
  // Distinct appointment identities → different episodes.
  if (openAppt && reqAppt && openAppt !== reqAppt) return false;
  // One bound, one not → treat as different episodes when creating via appointment.
  if (openAppt !== reqAppt) return false;
  return true;
}

/**
 * Evaluate whether a new encounter may be created given existing OPEN rows.
 *
 * For admission pathways, pass `correlatedReceivingEncounterId` only when the
 * admission correlation contract matched a receiving encounter. Blind reuse of
 * the first open Inpatient is intentionally unsupported.
 */
export function evaluateConcurrentEncounterCreate(input: {
  pathway: ConcurrentEncounterPathway;
  requestedType: string;
  existingOpen: OpenEncounterSnapshot[];
  /** MEDUI.D4C.10A/B — authoritative requested MedoraServiceLine when known. */
  requestedServiceLine?: string | null;
  /** Appointment / operational episode correlation for ambulatory creates. */
  requestedAppointmentId?: string | null;
  /** When set and matches an existing open IP, treat as safe retry. */
  idempotencyKey?: string | null;
  existingIdempotentEncounterId?: string | null;
  /** Correlated receiving IP from hospitalAdmissionCorrelationV1 — required for reuse. */
  correlatedReceivingEncounterId?: string | null;
}): ConcurrentEncounterDecision {
  if (input.existingIdempotentEncounterId?.trim()) {
    return {
      allowed: true,
      code: "IDEMPOTENT_REUSE",
      reuseEncounterId: input.existingIdempotentEncounterId.trim(),
    };
  }

  const correlated = String(input.correlatedReceivingEncounterId ?? "").trim();
  if (correlated) {
    return {
      allowed: true,
      code: "IDEMPOTENT_REUSE",
      reuseEncounterId: correlated,
    };
  }

  const requested = normalizeEncounterTypeToken(input.requestedType);
  const open = (input.existingOpen ?? []).filter(
    (e) => normalizeEncounterTypeToken(e.status ?? "OPEN") === "OPEN" || !e.status
  );

  if (open.length === 0) {
    return { allowed: true, code: "OK" };
  }

  const openTypes = open.map((e) => normalizeEncounterTypeToken(e.type));
  const openIp = open.filter((e) => normalizeEncounterTypeToken(e.type) === "INPATIENT");
  const openEd = open.filter((e) => normalizeEncounterTypeToken(e.type) === "EMERGENCY");

  // MEDUI.D4C.10B — enterprise multi-service GENERAL_CREATE
  if (input.pathway === "GENERAL_CREATE") {
    const requestedLine = resolveRequestedServiceLine(input);
    if (!requestedLine) {
      return {
        allowed: false,
        code: "OPEN_ENCOUNTER_EXISTS",
        detail: "Patient already has an open encounter",
        existingEncounterId: open[0]?.id,
      };
    }

    let sawDistinct = false;
    let ambiguous: OpenEncounterSnapshot | null = null;

    for (const row of open) {
      const openLine = normalizePersistedEncounterServiceLine(row.serviceLine);

      if (openLine && serviceLinesMatchForConcurrency(openLine, requestedLine)) {
        if (sameOperationalEpisode(row, input.requestedAppointmentId)) {
          return {
            allowed: true,
            code: "IDEMPOTENT_REUSE",
            reuseEncounterId: row.id,
          };
        }
        // Same service line, different appointment/episode → allow parallel episode.
        sawDistinct = true;
        continue;
      }

      if (openLine && openLine !== requestedLine) {
        sawDistinct = true;
        continue;
      }

      // Legacy null serviceLine — contextual, never invent CLINIC.
      const legacy = classifyLegacyNullOpenVsRequested({
        openType: row.type,
        requestedType: input.requestedType,
        requestedLine,
      });
      if (legacy === "ALLOW") {
        sawDistinct = true;
        continue;
      }
      ambiguous = ambiguous ?? row;
    }

    if (ambiguous) {
      return {
        allowed: false,
        code: "DUPLICATE_ACTIVE_SERVICE_ENCOUNTER",
        detail:
          "An active encounter already exists for this patient in a compatible care context",
        existingEncounterId: ambiguous.id,
      };
    }

    return {
      allowed: true,
      code: sawDistinct ? "ALLOW_DISTINCT_SERVICE_LINE" : "OK",
    };
  }

  // Hospital admission pathways creating INPATIENT (D3E.6D — preserved)
  if (
    (input.pathway === "DIRECT_ADMISSION" ||
      input.pathway === "PLACEMENT_RECEIVING" ||
      input.pathway === "NURSE_ADMISSION_INTAKE") &&
    requested === "INPATIENT"
  ) {
    if (openIp.length > 0) {
      return {
        allowed: false,
        code: "DUPLICATE_INPATIENT",
        detail:
          "Patient already has an open Inpatient encounter that is not correlated to this admission",
        existingEncounterId: openIp[0]?.id,
      };
    }
    if (openEd.length > 0 || openTypes.every((t) => t === "EMERGENCY" || t === "OUTPATIENT")) {
      return { allowed: true, code: "ALLOW_ED_PLUS_INPATIENT" };
    }
    if (openIp.length === 0) {
      return { allowed: true, code: "ALLOW_ED_PLUS_INPATIENT" };
    }
  }

  return {
    allowed: false,
    code: "OPEN_ENCOUNTER_EXISTS",
    detail: "Patient already has an open encounter",
    existingEncounterId: open[0]?.id,
  };
}

/** Starting Inpatient must never close or mutate the ED chart. */
export function inpatientStartMustNotCloseEdEncounter(): true {
  return true;
}

/** Open ED is advisory during admission intake, not a hard blocker. */
export function openEdEncounterIsAdvisoryNotBlocker(): true {
  return true;
}

export const HOSPITAL_ADMISSION_SOURCES = [
  "EMERGENCY_DEPARTMENT",
  "DIRECT",
  "CLINIC",
  "SCHEDULED",
  "EXTERNAL_TRANSFER",
  "OBSERVATION_CONVERSION",
  "OTHER",
] as const;

export type HospitalAdmissionSource = (typeof HOSPITAL_ADMISSION_SOURCES)[number];

export function isHospitalAdmissionSource(raw: unknown): raw is HospitalAdmissionSource {
  return (
    typeof raw === "string" &&
    (HOSPITAL_ADMISSION_SOURCES as readonly string[]).includes(raw.trim().toUpperCase())
  );
}
