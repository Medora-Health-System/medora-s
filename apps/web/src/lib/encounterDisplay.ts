/**
 * Assigned provider display — never raw UUID (fallback em dash when names missing).
 */
export function formatEncounterProviderAssigned(enc: {
  physicianAssigned?: { firstName?: string | null; lastName?: string | null } | null;
}): string {
  const s = `${enc.physicianAssigned?.firstName ?? ""} ${enc.physicianAssigned?.lastName ?? ""}`.trim();
  return s || "—";
}

/** @deprecated Use {@link formatEncounterProviderAssigned} */
export const formatEncounterPhysicianAssignedFr = formatEncounterProviderAssigned;
