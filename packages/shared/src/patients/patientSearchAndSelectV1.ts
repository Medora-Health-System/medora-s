/**
 * D4A.0 — Authoritative patient search & selection contracts.
 * Typed search text is never patient identity. Explicit result selection required.
 */

export const PATIENT_SEARCH_MIN_MEANINGFUL_CHARS = 3;

export const CONNECTED_INPATIENT_ADMISSION_INTAKE_CERTIFICATION_ID =
  "MEDUI.CONNECTED_INPATIENT_ADMISSION_INTAKE.D4A0" as const;

export type PatientSearchHitV1 = {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  middleName?: string | null;
  mrn?: string | null;
  dob?: string | Date | null;
  sexAtBirth?: string | null;
  sex?: string | null;
  phone?: string | null;
  email?: string | null;
  city?: string | null;
  stateProvince?: string | null;
  addressLine1?: string | null;
};

/** Count meaningful characters (letters/digits) for min-query gate. */
export function countMeaningfulSearchChars(raw: string): number {
  return String(raw ?? "").replace(/[^0-9A-Za-z\u00C0-\u024F]/g, "").length;
}

export function patientSearchQueryIsEligible(raw: string): boolean {
  return countMeaningfulSearchChars(raw) >= PATIENT_SEARCH_MIN_MEANINGFUL_CHARS;
}

/** Typed text alone never selects or creates a patient. */
export function typedPatientTextIsAuthoritativeIdentity(): false {
  return false;
}

export function admissionIntakeMayCreatePatient(): false {
  return false;
}

export function patientIdentityRequiresExplicitSelection(): true {
  return true;
}

export function resolveAuthoritativePatientId(input: {
  selectedPatientId?: string | null;
  typedQuery?: string | null;
}): string | null {
  const id = String(input.selectedPatientId ?? "").trim();
  if (!id) return null;
  // Typed query must never override or substitute for selectedPatientId.
  void input.typedQuery;
  return id;
}

export function shouldClearStalePatientSelection(input: {
  selectedPatientId: string | null | undefined;
  queryChangedAfterSelection: boolean;
}): boolean {
  if (!String(input.selectedPatientId ?? "").trim()) return false;
  return input.queryChangedAfterSelection === true;
}

export function formatPatientLegalName(hit: PatientSearchHitV1): string {
  const parts = [hit.firstName, hit.middleName, hit.lastName]
    .map((p) => String(p ?? "").trim())
    .filter(Boolean);
  if (parts.length) return parts.join(" ");
  return String(hit.lastName ?? hit.firstName ?? "").trim();
}

export function calculateAgeYearsFromDob(
  dob: string | Date | null | undefined,
  nowMs = Date.now()
): number | null {
  if (dob == null) return null;
  const birth = dob instanceof Date ? dob : new Date(dob);
  if (Number.isNaN(birth.getTime()) || birth.getTime() > nowMs) return null;
  return Math.floor((nowMs - birth.getTime()) / (1000 * 60 * 60 * 24 * 365.25));
}

export function normalizePatientSearchList(data: unknown): PatientSearchHitV1[] {
  if (Array.isArray(data)) return data as PatientSearchHitV1[];
  if (data && typeof data === "object" && Array.isArray((data as { items?: unknown }).items)) {
    return (data as { items: PatientSearchHitV1[] }).items;
  }
  return [];
}
