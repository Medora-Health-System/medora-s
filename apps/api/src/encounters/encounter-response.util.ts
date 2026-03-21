/**
 * Stable clinic-oriented encounter shape for API consumers.
 * visitReason ↔ chiefComplaint, clinicianImpression ↔ providerNote.
 */
export function toEncounterClinicResponse<T extends Record<string, unknown>>(
  enc: T
): T & {
  visitReason: string | null;
  clinicianImpression: string | null;
  treatmentPlan: string | null;
  followUpDate: Date | string | null;
} {
  const chief = enc.chiefComplaint as string | null | undefined;
  const note = enc.providerNote as string | null | undefined;
  return {
    ...enc,
    visitReason: chief ?? null,
    clinicianImpression: note ?? null,
    treatmentPlan: (enc.treatmentPlan as string | null | undefined) ?? null,
    followUpDate: (enc.followUpDate as Date | string | null | undefined) ?? null,
  };
}
