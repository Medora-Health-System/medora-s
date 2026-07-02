/**
 * Attribution metadata for EncounterClinicalRecord projections.
 * Pure data — no UI coupling.
 */

export type ClinicalRecordAttribution = {
  name: string | null;
  initials: string | null;
  role: string | null;
  at: string | null;
};

export function buildClinicalRecordAttribution(input: {
  name?: string | null;
  initials?: string | null;
  role?: string | null;
  at?: string | null;
}): ClinicalRecordAttribution {
  return {
    name: input.name?.trim() || null,
    initials: input.initials?.trim() || null,
    role: input.role?.trim() || null,
    at: input.at?.trim() || null,
  };
}

export function isClinicalRecordAttributionEmpty(attr: ClinicalRecordAttribution | null | undefined): boolean {
  if (!attr) return true;
  return !attr.name && !attr.initials && !attr.role && !attr.at;
}
