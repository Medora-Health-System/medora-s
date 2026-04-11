/**
 * Shared patient display fields for API responses (public health, MSPP, etc.).
 * Identifier priority: nationalId (NIR) → mrn → globalMrn.
 */

/** NIN (nationalId) preferred, then facility MRN, then global dossier number. */
export function patientPrimaryIdentifierFromPatient(p: {
  nationalId: string | null;
  mrn: string | null;
  globalMrn: string;
}): string {
  const n = p.nationalId?.trim();
  if (n) return n;
  const m = p.mrn?.trim();
  if (m) return m;
  return p.globalMrn.trim();
}

export function patientFullNameFromPatient(p: { firstName: string; lastName: string }): string | null {
  const s = `${p.firstName} ${p.lastName}`.trim();
  return s || null;
}
