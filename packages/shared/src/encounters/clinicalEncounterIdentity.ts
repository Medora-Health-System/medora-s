/**
 * D3E.5 — Canonical clinical encounter identity (server-owned, deterministic).
 *
 * Observation vs Inpatient must NEVER be inferred from admittedAt, length of stay,
 * unit/bed naming, or route pathnames.
 *
 * Durable signals (zero schema change):
 * 1. Encounter.type (EMERGENCY → EMERGENCY)
 * 2. Canonical destination intent (explicit requestedEncounterType > placement dest > careLevel)
 * 3. Explicit billingClassification OBSERVATION | INPATIENT (never overrides explicit dest)
 * 4. Otherwise INPATIENT for type=INPATIENT (direct admission is first-class)
 * 5. UNKNOWN when type is absent/unrecognized
 *
 * Encounter.type = INPATIENT does not mean the provider chose inpatient admission.
 *
 * Short-stay / utilization helpers must not feed this resolver.
 */

import { resolveHospitalDestinationIntent } from "./hospitalDestinationIntent.js";

export const CLINICAL_ENCOUNTER_CONTEXTS = [
  "EMERGENCY",
  "OBSERVATION",
  "INPATIENT",
  "UNKNOWN",
] as const;

export type ClinicalEncounterContext = (typeof CLINICAL_ENCOUNTER_CONTEXTS)[number];

export type ClinicalEncounterIdentityInput = {
  type?: string | null;
  status?: string | null;
  billingClassification?: string | null;
  admissionSummaryJson?: unknown;
  /** Accepted for API compatibility only — never used for identity. */
  admittedAt?: unknown;
  /** Optional placement destination when caller already loaded it (authoritative). */
  placementRequestedEncounterType?: string | null;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

/** Explicit destination written at D3C receiving-encounter creation. */
export function readRequestedEncounterTypeFromAdmissionSummary(
  admissionSummaryJson: unknown
): "OBSERVATION" | "INPATIENT" | null {
  const o = asRecord(admissionSummaryJson);
  if (!o) return null;
  const raw = String(o.requestedEncounterType ?? "")
    .trim()
    .toUpperCase();
  if (raw === "OBSERVATION" || raw === "INPATIENT") return raw;
  return null;
}

export function isD3cReceivingAdmissionSummary(admissionSummaryJson: unknown): boolean {
  const o = asRecord(admissionSummaryJson);
  return o?.d3cReceiving === true;
}

/**
 * Canonical clinical context resolver.
 * Prohibited inputs for branching: elapsed hours, admittedAt presence, bed/unit names, routes.
 */
export function resolveClinicalEncounterContext(
  input: ClinicalEncounterIdentityInput
): ClinicalEncounterContext {
  const type = String(input.type ?? "")
    .trim()
    .toUpperCase();

  if (type === "EMERGENCY") return "EMERGENCY";
  if (!type) return "UNKNOWN";
  if (type === "OUTPATIENT" || type === "URGENT_CARE") return "UNKNOWN";

  if (type !== "INPATIENT") return "UNKNOWN";

  // 1–2) Canonical dest intent (explicit requestedEncounterType > placement > legacy LOC).
  // Billing must not override explicit clinical destination.
  const dest = resolveHospitalDestinationIntent({
    placementRequestedEncounterType: input.placementRequestedEncounterType,
    admissionSummaryJson: input.admissionSummaryJson,
  });
  if (dest === "OBSERVATION" || dest === "INPATIENT") return dest;

  // 3) Explicit billing markers only when dest intent is unknown (never infer from admittedAt)
  const billing = String(input.billingClassification ?? "")
    .trim()
    .toUpperCase();
  if (billing === "OBSERVATION") return "OBSERVATION";
  if (billing === "INPATIENT") return "INPATIENT";

  // 4) Direct Inpatient is first-class: bare INPATIENT type → INPATIENT
  //    (Observation requires an explicit marker above.)
  return "INPATIENT";
}

/** Map canonical identity to departmental worklist badge vocabulary. */
export function clinicalContextToWorklistBadge(
  context: ClinicalEncounterContext
): "ED" | "OBSERVATION" | "INPATIENT" | "UNKNOWN" {
  switch (context) {
    case "EMERGENCY":
      return "ED";
    case "OBSERVATION":
      return "OBSERVATION";
    case "INPATIENT":
      return "INPATIENT";
    default:
      return "UNKNOWN";
  }
}

export function clinicalEncounterContextIsObservation(
  input: ClinicalEncounterIdentityInput
): boolean {
  return resolveClinicalEncounterContext(input) === "OBSERVATION";
}

export function clinicalEncounterContextIsInpatient(
  input: ClinicalEncounterIdentityInput
): boolean {
  return resolveClinicalEncounterContext(input) === "INPATIENT";
}

/**
 * Identity deficiency for chart certification when context cannot be resolved safely.
 * Never apply Observation rules to UNKNOWN.
 */
export function clinicalIdentityDeficiencyForUnknown(): {
  code: "UNKNOWN_CLINICAL_ENCOUNTER_IDENTITY";
  message: string;
  remediation: string;
} {
  return {
    code: "UNKNOWN_CLINICAL_ENCOUNTER_IDENTITY",
    message: "Clinical encounter identity is UNKNOWN; Observation and Inpatient rules were not applied.",
    remediation:
      "Correct identity via audited placement destination or explicit admissionSummary.requestedEncounterType / billingClassification.",
  };
}
