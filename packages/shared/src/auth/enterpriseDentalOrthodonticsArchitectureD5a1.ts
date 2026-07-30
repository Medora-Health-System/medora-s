/**
 * MEDUI.D5A.1 — Enterprise Dental Care & Orthodontics architecture audit guards.
 *
 * Audit-only: documents forbidden forks, reuse boundaries, and D5A sequencing.
 * Does NOT implement odontogram, periodontal chart, OrthodonticCase persistence,
 * roles, navigation, or migrations.
 */

export const ENTERPRISE_DENTAL_ORTHODONTICS_ARCHITECTURE_CERTIFICATION_ID =
  "MEDUI.D5A.1" as const;

/** Forbidden product forks — never introduce these authorities. */
export const D5A1_FORBIDDEN_AUTHORITIES = [
  "DentalPatient",
  "OrthodonticPatient",
  "DentalAppointment",
  "DentalOrder",
  "DentalImagingRepository",
  "DentalPrescription",
  "DentalBillingEngine",
  "DentalGuardian",
  "DentalFacilityAddress",
  "ClinicDentalPatient",
] as const;

export type D5a1ForbiddenAuthority = (typeof D5A1_FORBIDDEN_AUTHORITIES)[number];

/** Shared Medora authorities Dental MUST reuse (conceptual; not new tables). */
export const D5A1_REQUIRED_SHARED_AUTHORITIES = [
  "Patient",
  "Encounter",
  "Appointment",
  "Order",
  "OrderItem",
  "EnterpriseDocument",
  "FollowUp",
  "BillingEvent",
  "AuditLog",
  "Facility",
  "Diagnosis",
] as const;

/**
 * Proposed dental-specific authorities for later milestones (names conceptual).
 * Persistence is NOT authorized in D5A.1.
 */
export const D5A1_PROPOSED_DENTAL_AUTHORITIES = [
  "DentitionState",
  "ToothFinding",
  "ToothSurfaceFinding",
  "DentalTreatmentPlan",
  "DentalTreatmentPlanItem",
  "DentalProcedureEvent",
  "PeriodontalAssessment",
  "PeriodontalSiteMeasurement",
  "OrthodonticCase",
  "OrthodonticAssessment",
  "OrthodonticTreatmentPlan",
  "OrthodonticAppliance",
  "OrthodonticProgressRecord",
  "DentalImageAssociation",
] as const;

/** Service-line tokens reserved from D4C.7I — not yet in MedoraServiceLine registry. */
export const D5A1_DENTAL_SERVICE_LINE_TOKENS = [
  "DENTAL",
  "GENERAL_DENTISTRY",
  "ORTHODONTICS",
] as const;

/** Specialty capability tokens (config; not RoleCode enum additions in D5A.1). */
export const D5A1_PROPOSED_DENTAL_SPECIALTY_CAPABILITIES = [
  "PEDIATRIC_DENTISTRY",
  "ORAL_SURGERY",
  "PERIODONTICS",
  "ENDODONTICS",
  "PROSTHODONTICS",
  "ORAL_MEDICINE",
] as const;

/** Canonical tooth identity is independent of display notation. */
export const D5A1_TOOTH_NUMBERING_SYSTEMS = ["UNIVERSAL", "FDI", "PALMER"] as const;

export type D5a1ToothNumberingSystem = (typeof D5A1_TOOTH_NUMBERING_SYSTEMS)[number];

/** OrthodonticCase lifecycle is longitudinal — never equal to EncounterStatus. */
export const D5A1_PROPOSED_ORTHODONTIC_CASE_STATES = [
  "CONSULTATION",
  "RECORDS_PENDING",
  "ASSESSMENT_IN_PROGRESS",
  "TREATMENT_PLAN_PROPOSED",
  "TREATMENT_PLAN_ACCEPTED",
  "ACTIVE_TREATMENT",
  "TREATMENT_PAUSED",
  "DEBONDING_READY",
  "RETENTION",
  "COMPLETED",
  "DISCONTINUED",
  "TRANSFERRED",
] as const;

/** Recommended D5A milestone sequence (dependency-ordered). */
export const D5A_ROADMAP_MILESTONES = [
  "D5A.1",
  "D5A.2",
  "D5A.3",
  "D5A.4",
  "D5A.5",
  "D5A.6",
  "D5A.7",
  "D5A.8",
  "D5A.9",
  "D5A.10",
  "D5A.11",
  "D5A.12",
] as const;

export const D5A1_INPATIENT_SEMANTICS_FORBIDDEN_IN_DENTAL = [
  "bedAvailability",
  "inpatientAdmission",
  "hospitalCensus",
  "roomOccupancyAsAdmissionAuthority",
  "inpatientUnitTransfer",
  "inpatientDischarge",
  "nursingUnitOwnership",
] as const;

export function isForbiddenDentalAuthorityName(name: string): boolean {
  return (D5A1_FORBIDDEN_AUTHORITIES as readonly string[]).includes(name);
}

export function assertOrthodonticCaseDistinctFromEncounter(input: {
  orthodonticCaseId: string | null | undefined;
  encounterId: string | null | undefined;
}): { ok: true } | { ok: false; reason: "CASE_EQUALS_ENCOUNTER" | "CASE_MISSING" } {
  const caseId = String(input.orthodonticCaseId ?? "").trim();
  const encounterId = String(input.encounterId ?? "").trim();
  if (!caseId) return { ok: false, reason: "CASE_MISSING" };
  if (caseId === encounterId) return { ok: false, reason: "CASE_EQUALS_ENCOUNTER" };
  return { ok: true };
}

/** Display notation must not be the only stored tooth identity. */
export function buildCanonicalToothIdentityKey(input: {
  patientId: string;
  /** Stable internal code, e.g. PERM_11 or PRIM_A — not display-only. */
  canonicalToothCode: string;
}): string {
  return `${input.patientId.trim()}:${input.canonicalToothCode.trim().toUpperCase()}`;
}

export function describeD5a2EntryCriteria(): readonly string[] {
  return [
    "Dental is a configurable enterprise service line (not a separate product)",
    "Reuse Patient, Encounter, Appointment, Orders, Imaging, Prescription, Consent, Billing, Follow-up, Medical Record",
    "OrthodonticCase is longitudinal and distinct from Encounter",
    "Tooth identity is notation-independent",
    "Odontogram persistence retains history",
    "Treatment-plan versioning is defined",
    "Role/capability boundaries are defined",
    "Facility onboarding integration is defined",
    "Migration scope is documented",
    "No facility-specific product fork",
  ] as const;
}
