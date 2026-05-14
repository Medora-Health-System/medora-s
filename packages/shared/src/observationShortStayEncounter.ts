/**
 * Phase 14A — Central gate for observation / short-stay workflow UI on encounter detail.
 * Medora presents `EncounterType.INPATIENT` as observation & short stay; workflow must not
 * depend solely on admission `careLevel` string matching (production data may omit or vary).
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
 * Encounter should show observation / short-stay workflow chrome (INPATIENT lane, OPEN only).
 * - `admittedAt` set ⇒ active (matches promoted / admitted observation stays).
 * - Any populated admission summary field ⇒ active (packet exists even if careLevel omitted).
 * - Any admission field text matches observation heuristics ⇒ active (legacy / free-text paths).
 */
export function isObservationShortStayEncounter(input: ObservationShortStayEncounterInput): boolean {
  if (input.type !== "INPATIENT") return false;
  if (input.status !== "OPEN") return false;
  if (hasNonEmptyAdmittedAt(input.admittedAt)) return true;
  if (hasAdmissionSummaryAnyPopulatedField(input.admissionSummaryJson)) return true;
  if (admissionSummaryJsonSuggestsObservationShortStay(input.admissionSummaryJson)) return true;
  return false;
}
