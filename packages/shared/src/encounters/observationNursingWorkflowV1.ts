/**
 * D3D — Observation nursing workflow surfaces (destination encounter only).
 */

export const OBSERVATION_NURSING_SURFACES = [
  "INTAKE",
  "REASSESSMENT",
  "HOURLY_CHECKS",
  "PAIN",
  "NEURO",
  "RESPIRATORY",
  "FALL_RISK",
  "INTAKE_OUTPUT",
  "CARE_PLAN",
] as const;

export type ObservationNursingSurface = (typeof OBSERVATION_NURSING_SURFACES)[number];

export function isObservationNursingSurface(value: unknown): value is ObservationNursingSurface {
  return (
    typeof value === "string" &&
    (OBSERVATION_NURSING_SURFACES as readonly string[]).includes(value)
  );
}

export type ObservationNursingEntry = {
  surface: ObservationNursingSurface;
  observationEncounterId: string;
  recordedAt?: string | null;
  summary?: string | null;
};

export function validateObservationNursingEntry(
  entry: ObservationNursingEntry
): { ok: true } | { ok: false; reason: string } {
  if (!isObservationNursingSurface(entry.surface)) {
    return { ok: false, reason: "INVALID_SURFACE" };
  }
  if (!String(entry.observationEncounterId ?? "").trim()) {
    return { ok: false, reason: "MISSING_ENCOUNTER" };
  }
  return { ok: true };
}
