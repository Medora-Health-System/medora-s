/**
 * MEDUI.D4C.10A — Enterprise Encounter service-line provenance foundation.
 *
 * Persisted Encounter.serviceLine uses MedoraServiceLine tokens (shared registry).
 * Prisma stores String? — not a duplicate Prisma enum — to avoid dual authority.
 *
 * Null means unknown/legacy. Do NOT silently treat null as CLINIC for concurrency.
 */

import {
  normalizeServiceLineToken,
  normalizeFacilityType,
  type MedoraServiceLine,
} from "../auth/facilityTypeRegistry.js";
import {
  facilityHasServiceLine,
  resolveFacilityServiceLines,
} from "../auth/facilityServiceLines.js";
import { resolveFacilityModuleCapabilitiesD4c1 } from "../auth/facilityClinicCareProfileD4c1.js";
import { isDentalEncounterProjection } from "../auth/enterpriseDentalEncounterWorkspaceD5a3.js";

export const D4C10A_CERTIFICATION_ID = "MEDUI.D4C.10A" as const;

/** Prisma design: String? validated by MedoraServiceLine registry (not Prisma enum). */
export const D4C10A_PRISMA_STORAGE = "STRING_REGISTRY_VALIDATED" as const;

export type EncounterServiceLineResolveSource =
  | "REQUESTED"
  | "ENCOUNTER_TYPE"
  | "BILLING_CLASSIFICATION"
  | "DENTAL_HINT"
  | "WORKFLOW_HINT";

export type ResolveAuthoritativeEncounterServiceLineInput = {
  encounterType: string;
  /** Client/workflow hint — must pass compatibility + facility checks when used. */
  requestedServiceLine?: string | null;
  roomLabel?: string | null;
  billingClassification?: string | null;
  workflowHint?: "DENTAL" | "PLACEMENT_OBSERVATION" | "DIRECT_ADMISSION" | null;
  nursingAssessment?: unknown;
  admissionSummaryJson?: unknown;
};

export type ResolveAuthoritativeEncounterServiceLineResult = {
  serviceLine: MedoraServiceLine;
  source: EncounterServiceLineResolveSource;
};

export type EncounterServiceLineFacilityGateInput = {
  facilityType?: string | null;
  configuredServiceLines?: readonly string[] | null;
  careProfileJson?: unknown;
  facilityCountry?: string | null;
  serviceLine: MedoraServiceLine | string;
};

/** Normalize persisted or requested tokens; null if empty/unknown. */
export function normalizePersistedEncounterServiceLine(
  value: string | null | undefined
): MedoraServiceLine | null {
  return normalizeServiceLineToken(value);
}

/**
 * Compatibility: null is unknown — never invent CLINIC for concurrency decisions.
 * Explicit fallbacks belong in call sites that document why.
 */
export function encounterServiceLineIsUnknown(
  value: string | null | undefined
): boolean {
  return normalizePersistedEncounterServiceLine(value) == null;
}

/** Prep helper for D4C.10 concurrency — compare durable fields only. */
export function serviceLinesMatchForConcurrency(
  existingServiceLine: string | null | undefined,
  requestedServiceLine: string | null | undefined
): boolean {
  const a = normalizePersistedEncounterServiceLine(existingServiceLine);
  const b = normalizePersistedEncounterServiceLine(requestedServiceLine);
  if (a == null || b == null) return false;
  return a === b;
}

export function isDentalServiceLineToken(value: string | null | undefined): boolean {
  return normalizePersistedEncounterServiceLine(value) === "DENTAL";
}

function normalizeEncounterType(raw: unknown): string {
  return String(raw ?? "")
    .trim()
    .toUpperCase();
}

function hasDentalHint(input: ResolveAuthoritativeEncounterServiceLineInput): boolean {
  if (input.workflowHint === "DENTAL") return true;
  const room = String(input.roomLabel ?? "")
    .trim()
    .toUpperCase();
  if (room === "DENTAL") return true;
  if (
    isDentalEncounterProjection({
      type: input.encounterType,
      nursingAssessment: input.nursingAssessment,
      admissionSummaryJson: input.admissionSummaryJson,
    })
  ) {
    return true;
  }
  return false;
}

/**
 * Type ↔ service-line compatibility for new creates.
 * OUTPATIENT may be CLINIC or DENTAL (and future ambulatory lines when explicitly requested).
 */
export function isServiceLineCompatibleWithEncounterType(
  encounterType: string,
  serviceLine: MedoraServiceLine
): boolean {
  const type = normalizeEncounterType(encounterType);
  switch (type) {
    case "EMERGENCY":
      return serviceLine === "EMERGENCY";
    case "URGENT_CARE":
      return serviceLine === "URGENT_CARE";
    case "INPATIENT":
      return (
        serviceLine === "MEDSURG" ||
        serviceLine === "OBSERVATION" ||
        serviceLine === "ICU" ||
        serviceLine === "TELEMETRY" ||
        serviceLine === "PEDIATRICS" ||
        serviceLine === "OBGYN" ||
        serviceLine === "BEHAVIORAL_HEALTH"
      );
    case "OUTPATIENT":
      return serviceLine === "CLINIC" || serviceLine === "DENTAL" || serviceLine === "URGENT_CARE";
    case "OBSERVATION":
      return serviceLine === "OBSERVATION";
    default:
      return false;
  }
}

/**
 * Server-side authoritative resolution for NEW encounter creates.
 * Prefer requested line when valid; otherwise derive from type / dental / billing hints.
 */
export function resolveAuthoritativeEncounterServiceLine(
  input: ResolveAuthoritativeEncounterServiceLineInput
): ResolveAuthoritativeEncounterServiceLineResult {
  const type = normalizeEncounterType(input.encounterType);
  const requested = normalizePersistedEncounterServiceLine(input.requestedServiceLine);

  if (requested) {
    if (!isServiceLineCompatibleWithEncounterType(type, requested)) {
      throw new EncounterServiceLineResolutionError(
        "SERVICE_LINE_TYPE_MISMATCH",
        `Service line ${requested} is not compatible with encounter type ${type}`
      );
    }
    return { serviceLine: requested, source: "REQUESTED" };
  }

  if (type === "EMERGENCY") {
    return { serviceLine: "EMERGENCY", source: "ENCOUNTER_TYPE" };
  }
  if (type === "URGENT_CARE") {
    return { serviceLine: "URGENT_CARE", source: "ENCOUNTER_TYPE" };
  }
  if (type === "OBSERVATION") {
    return { serviceLine: "OBSERVATION", source: "ENCOUNTER_TYPE" };
  }
  if (type === "INPATIENT") {
    if (
      input.workflowHint === "PLACEMENT_OBSERVATION" ||
      String(input.billingClassification ?? "")
        .trim()
        .toUpperCase() === "OBSERVATION"
    ) {
      return { serviceLine: "OBSERVATION", source: "BILLING_CLASSIFICATION" };
    }
    if (input.workflowHint === "DIRECT_ADMISSION") {
      return { serviceLine: "MEDSURG", source: "WORKFLOW_HINT" };
    }
    return { serviceLine: "MEDSURG", source: "ENCOUNTER_TYPE" };
  }

  // OUTPATIENT (and unknown ambulatory)
  if (hasDentalHint(input)) {
    return { serviceLine: "DENTAL", source: "DENTAL_HINT" };
  }
  return { serviceLine: "CLINIC", source: "ENCOUNTER_TYPE" };
}

export class EncounterServiceLineResolutionError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = "EncounterServiceLineResolutionError";
    this.code = code;
  }
}

/** Gate new creates when facility does not enable the service line. */
export function assertEncounterServiceLineEnabledForFacility(
  input: EncounterServiceLineFacilityGateInput
): void {
  const normalized = normalizePersistedEncounterServiceLine(
    typeof input.serviceLine === "string" ? input.serviceLine : String(input.serviceLine)
  );
  if (!normalized) {
    throw new EncounterServiceLineResolutionError(
      "SERVICE_LINE_INVALID",
      "Unknown encounter service line"
    );
  }

  if (
    facilityHasServiceLine({
      facilityType: input.facilityType,
      configuredServiceLines: input.configuredServiceLines,
      serviceLine: normalized,
    })
  ) {
    return;
  }

  const lines = resolveFacilityServiceLines({
    facilityType: input.facilityType,
    configuredServiceLines: input.configuredServiceLines,
  });
  const caps = resolveFacilityModuleCapabilitiesD4c1({
    facilityType: input.facilityType,
    careProfileJson: input.careProfileJson,
    serviceLines: lines,
    facilityCountry: input.facilityCountry,
  });
  const facilityType = normalizeFacilityType(input.facilityType);

  // Module / facility-type bridges for legacy incomplete serviceLinesJson (seed drift).
  if (normalized === "CLINIC" && (caps.clinicCareEnabled || caps.registrationEnabled)) {
    return;
  }
  if (normalized === "URGENT_CARE" && caps.urgentCareEnabled) {
    return;
  }
  if (normalized === "DENTAL" && caps.dentalCareEnabled) {
    return;
  }
  if (
    normalized === "EMERGENCY" &&
    (facilityType === "HOSPITAL" || facilityType === "FREESTANDING_ER")
  ) {
    return;
  }
  if (
    (normalized === "MEDSURG" ||
      normalized === "OBSERVATION" ||
      normalized === "ICU" ||
      normalized === "TELEMETRY" ||
      normalized === "PEDIATRICS" ||
      normalized === "OBGYN" ||
      normalized === "BEHAVIORAL_HEALTH") &&
    (facilityType === "HOSPITAL" || facilityType === "FREESTANDING_ER")
  ) {
    return;
  }

  throw new EncounterServiceLineResolutionError(
    "SERVICE_LINE_NOT_ENABLED",
    `Service line ${normalized} is not enabled for this facility`
  );
}

/**
 * Deterministic historical inference for backfill / audit docs only.
 * Returns null when not deterministic — callers must not fabricate CLINIC for all OUTPATIENT.
 */
export function inferDeterministicHistoricalServiceLine(input: {
  type?: string | null;
  roomLabel?: string | null;
  billingClassification?: string | null;
  nursingAssessment?: unknown;
  admissionSummaryJson?: unknown;
}): MedoraServiceLine | null {
  const type = normalizeEncounterType(input.type);
  if (type === "EMERGENCY") return "EMERGENCY";
  if (type === "URGENT_CARE") return "URGENT_CARE";
  if (type === "INPATIENT") {
    if (
      String(input.billingClassification ?? "")
        .trim()
        .toUpperCase() === "OBSERVATION"
    ) {
      return "OBSERVATION";
    }
    return "MEDSURG";
  }
  if (
    isDentalEncounterProjection({
      type: input.type,
      nursingAssessment: input.nursingAssessment,
      admissionSummaryJson: input.admissionSummaryJson,
    }) ||
    String(input.roomLabel ?? "")
      .trim()
      .toUpperCase() === "DENTAL"
  ) {
    return "DENTAL";
  }
  // OUTPATIENT without dental provenance → leave null (do not invent CLINIC)
  return null;
}
