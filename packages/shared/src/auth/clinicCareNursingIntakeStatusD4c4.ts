/**
 * MEDUI.D4C.4 — presentation-only ambulatory intake completeness flags.
 * Reuses Encounter.vitals / Triage / Patient.clinicalHistoryProfileJson — no ClinicIntake* tables.
 */

export const CLINIC_CARE_INTAKE_STATUS_VALUES = [
  "DONE",
  "PARTIAL",
  "MISSING",
  "UNKNOWN",
] as const;

export type ClinicCareIntakeStatus = (typeof CLINIC_CARE_INTAKE_STATUS_VALUES)[number];

export type ClinicCareIntakeStatusProjection = {
  vitals: ClinicCareIntakeStatus;
  allergies: ClinicCareIntakeStatus;
  medRec: ClinicCareIntakeStatus;
  /** True when vitals + allergies + med-rec are all DONE (queue “intake ready” hint). */
  intakeReadyHint: boolean;
};

function hasNonEmptyJson(value: unknown): boolean {
  if (value == null) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (typeof value === "object") {
    if (Array.isArray(value)) return value.length > 0;
    return Object.keys(value as Record<string, unknown>).length > 0;
  }
  return true;
}

function profileSectionStatus(
  profile: Record<string, unknown> | null,
  keys: readonly string[]
): ClinicCareIntakeStatus {
  if (!profile) return "UNKNOWN";
  for (const key of keys) {
    const section = profile[key];
    if (section == null) continue;
    if (typeof section === "object" && !Array.isArray(section)) {
      const rec = section as Record<string, unknown>;
      if (rec.reviewed === true || rec.verified === true || rec.complete === true) return "DONE";
      if (rec.nka === true || rec.noKnownAllergies === true || rec.none === true) return "DONE";
      if (hasNonEmptyJson(section)) return "PARTIAL";
    } else if (hasNonEmptyJson(section)) {
      return "PARTIAL";
    }
  }
  // Profile exists but these sections never written — treat as missing for ambulatory intake.
  return "MISSING";
}

/**
 * Project intake / vitals / allergy / med-rec status from enterprise fields already on the encounter.
 */
export function projectClinicCareIntakeStatus(input: {
  encounterVitals?: unknown;
  triageCompleteAt?: string | Date | null;
  patientLatestVitalsAt?: string | Date | null;
  clinicalHistoryProfileJson?: unknown;
}): ClinicCareIntakeStatusProjection {
  const vitalsDone =
    hasNonEmptyJson(input.encounterVitals) ||
    Boolean(input.triageCompleteAt) ||
    Boolean(input.patientLatestVitalsAt);
  const vitals: ClinicCareIntakeStatus = vitalsDone ? "DONE" : "MISSING";

  const profile =
    input.clinicalHistoryProfileJson &&
    typeof input.clinicalHistoryProfileJson === "object" &&
    !Array.isArray(input.clinicalHistoryProfileJson)
      ? (input.clinicalHistoryProfileJson as Record<string, unknown>)
      : null;

  const allergies = profileSectionStatus(profile, [
    "allergies",
    "allergy",
    "allergyList",
    "knownAllergies",
  ]);
  const medRec = profileSectionStatus(profile, [
    "homeMedications",
    "homeMeds",
    "medicationReconciliation",
    "medRec",
  ]);

  return {
    vitals,
    allergies,
    medRec,
    intakeReadyHint: vitals === "DONE" && allergies === "DONE" && medRec === "DONE",
  };
}
