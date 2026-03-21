/**
 * Libellé médecin attribué — jamais d’UUID (repli « — » si noms absents).
 */
export function formatEncounterPhysicianAssignedFr(enc: {
  physicianAssigned?: { firstName?: string | null; lastName?: string | null } | null;
}): string {
  const s = `${enc.physicianAssigned?.firstName ?? ""} ${enc.physicianAssigned?.lastName ?? ""}`.trim();
  return s || "—";
}
