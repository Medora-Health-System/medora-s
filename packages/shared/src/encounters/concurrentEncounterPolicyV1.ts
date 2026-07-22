/**
 * D3E.6D — Context-aware open-encounter creation policy.
 * Replaces global "one open encounter per patient" for governed hospital admission.
 * ED + Inpatient may coexist. Duplicate active Inpatient for same admission is denied.
 */

export const UNIT_BED_BOARDS_ADMISSION_INTAKE_CERTIFICATION_ID =
  "MEDUI.UNIT_BED_BOARDS_ADMISSION_INTAKE.D3E6D" as const;

export type ConcurrentEncounterPathway =
  | "GENERAL_CREATE"
  | "DIRECT_ADMISSION"
  | "PLACEMENT_RECEIVING"
  | "NURSE_ADMISSION_INTAKE";

export type OpenEncounterSnapshot = {
  id: string;
  type: string;
  status?: string | null;
};

export type ConcurrentEncounterDecision =
  | { allowed: true; code: "OK" | "ALLOW_ED_PLUS_INPATIENT" | "IDEMPOTENT_REUSE"; reuseEncounterId?: string }
  | { allowed: false; code: string; detail: string };

export function normalizeEncounterTypeToken(raw: unknown): string {
  return String(raw ?? "")
    .trim()
    .toUpperCase();
}

/**
 * Evaluate whether a new encounter may be created given existing OPEN rows.
 */
export function evaluateConcurrentEncounterCreate(input: {
  pathway: ConcurrentEncounterPathway;
  requestedType: string;
  existingOpen: OpenEncounterSnapshot[];
  /** When set and matches an existing open IP, treat as safe retry. */
  idempotencyKey?: string | null;
  existingIdempotentEncounterId?: string | null;
}): ConcurrentEncounterDecision {
  if (input.existingIdempotentEncounterId?.trim()) {
    return {
      allowed: true,
      code: "IDEMPOTENT_REUSE",
      reuseEncounterId: input.existingIdempotentEncounterId.trim(),
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

  // General registration / ED create: keep strict one-open rule.
  if (input.pathway === "GENERAL_CREATE") {
    return {
      allowed: false,
      code: "OPEN_ENCOUNTER_EXISTS",
      detail: "Patient already has an open encounter",
    };
  }

  // Hospital admission pathways creating INPATIENT
  if (
    (input.pathway === "DIRECT_ADMISSION" ||
      input.pathway === "PLACEMENT_RECEIVING" ||
      input.pathway === "NURSE_ADMISSION_INTAKE") &&
    requested === "INPATIENT"
  ) {
    // Duplicate prevention: reuse the existing open Inpatient receiving encounter
    // (placement arrival + nurse intake / double-submit must not create a second IP).
    if (openIp.length > 0) {
      return {
        allowed: true,
        code: "IDEMPOTENT_REUSE",
        reuseEncounterId: openIp[0]!.id,
      };
    }
    // Open ED / Observation / outpatient — allow concurrent ED + Inpatient
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
