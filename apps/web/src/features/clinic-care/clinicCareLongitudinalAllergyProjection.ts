import {
  activeAllergiesSummary,
  patientClinicalHistoryProfileFromJson,
} from "@medora/shared";

/**
 * Patient.clinicalHistoryProfileJson is the longitudinal allergy authority.
 * Encounter triage remains a fallback for older records.
 */
export function clinicCareLongitudinalAllergySummary(profileRaw: unknown): string | null {
  const profile = patientClinicalHistoryProfileFromJson(profileRaw);
  return activeAllergiesSummary(profile?.allergies ?? null).summary;
}

/**
 * Shared summary/MAR adapters still consume the encounter triage shape. Project the
 * longitudinal allergy summary into a copy of that shape without mutating or
 * persisting encounter triage.
 */
export function projectClinicCareAllergyIntoTriageSnapshot(
  triageSnapshot: Record<string, unknown> | null,
  allergySummary: string | null | undefined
): Record<string, unknown> | null {
  const summary = allergySummary?.trim();
  if (!summary) return triageSnapshot;

  const currentVitals =
    triageSnapshot?.vitalsJson &&
    typeof triageSnapshot.vitalsJson === "object" &&
    !Array.isArray(triageSnapshot.vitalsJson)
      ? (triageSnapshot.vitalsJson as Record<string, unknown>)
      : {};

  return {
    ...(triageSnapshot ?? {}),
    vitalsJson: {
      ...currentVitals,
      allergyNote: summary,
    },
  };
}
