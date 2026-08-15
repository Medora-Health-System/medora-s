/**
 * MEDUI.D4C.10C — enterprise encounter-create race lock material (no Prisma).
 * Lock acquisition lives in the API (pg_advisory_xact_lock); this module is pure.
 */

export const D4C10C_CERTIFICATION_ID = "MEDUI.D4C.10C" as const;

/** Episode identity for same-service race keys. */
export function enterpriseEncounterCreateEpisodeKey(
  appointmentId?: string | null
): string {
  const appt = String(appointmentId ?? "").trim();
  return appt ? `APPT:${appt}` : "UNBOUND";
}

/**
 * Stable lock material. Distinct service lines / facilities / patients / episodes
 * must not share a lock (preserves Clinic+Dental concurrency).
 */
export function buildEnterpriseEncounterCreateLockMaterial(input: {
  facilityId: string;
  patientId: string;
  serviceLine: string;
  appointmentId?: string | null;
}): string {
  return [
    D4C10C_CERTIFICATION_ID,
    String(input.facilityId ?? "").trim(),
    String(input.patientId ?? "").trim(),
    String(input.serviceLine ?? "")
      .trim()
      .toUpperCase(),
    enterpriseEncounterCreateEpisodeKey(input.appointmentId),
  ].join("\0");
}
