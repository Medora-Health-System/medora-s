/**
 * Phase 14A / D3E.5 — Observation / short-stay **utilization** helpers.
 *
 * IMPORTANT (D3E.5): These helpers must NOT determine clinical encounter identity,
 * worklist badges, chart-certification domain, order routing, MAR ownership,
 * census placement, or admission eligibility.
 *
 * Use `resolveClinicalEncounterContext` for clinical identity.
 * These remain only for length-of-stay / operational analytics chrome that is
 * explicitly gated by clinical identity first.
 */

import { isObservationShortStayCareLevel } from "./observationAdmissionCareLevel.js";

/** Same string keys as `parseAdmissionSummaryForChart` (web) / `admissionSummaryFieldsSchema`. */
const ADMISSION_SUMMARY_STRING_KEYS = [
  "admissionReason",
  "serviceUnit",
  "admissionDiagnosis",
  "careLevel",
  "conditionAtAdmission",
  "initialPlan",
  "responsiblePhysicianName",
] as const;

function hasNonEmptyAdmittedAt(admittedAt: unknown): boolean {
  if (admittedAt == null) return false;
  if (admittedAt instanceof Date) return !Number.isNaN(admittedAt.getTime());
  const s = String(admittedAt).trim();
  if (!s) return false;
  const ms = Date.parse(s);
  return !Number.isNaN(ms);
}

/** True if any known admission packet string field is non-empty (structured packet present). */
export function hasAdmissionSummaryAnyPopulatedField(raw: unknown): boolean {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return false;
  const o = raw as Record<string, unknown>;
  for (const k of ADMISSION_SUMMARY_STRING_KEYS) {
    const v = o[k];
    if (typeof v === "string" && v.trim()) return true;
  }
  return false;
}

/** True if any populated admission field text matches observation / short-stay heuristics. */
export function admissionSummaryJsonSuggestsObservationShortStay(raw: unknown): boolean {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return false;
  const o = raw as Record<string, unknown>;
  for (const k of ADMISSION_SUMMARY_STRING_KEYS) {
    const v = o[k];
    if (typeof v === "string" && isObservationShortStayCareLevel(v)) return true;
  }
  return false;
}

export type ObservationShortStayEncounterInput = {
  type?: string | null;
  status?: string | null;
  admittedAt?: unknown;
  admissionSummaryJson?: unknown;
};

/**
 * Utilization candidate for short-stay analytics — NOT clinical identity.
 * Prefer `clinicalEncounterContextIsObservation` before using this for any UI chrome.
 */
export function isObservationShortStayEncounter(input: ObservationShortStayEncounterInput): boolean {
  if (input.type !== "INPATIENT") return false;
  if (input.status !== "OPEN") return false;
  if (hasNonEmptyAdmittedAt(input.admittedAt)) return true;
  if (hasAdmissionSummaryAnyPopulatedField(input.admissionSummaryJson)) return true;
  if (admissionSummaryJsonSuggestsObservationShortStay(input.admissionSummaryJson)) return true;
  return false;
}

/** Alias clarifying utilization-only role (D3E.5). */
export function isObservationShortStayUtilizationCandidate(
  input: ObservationShortStayEncounterInput
): boolean {
  return isObservationShortStayEncounter(input);
}
