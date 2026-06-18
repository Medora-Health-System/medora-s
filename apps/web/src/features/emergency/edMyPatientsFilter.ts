/** Minimal encounter shape for My Patients assignment filtering (trackboard row subset). */
export type EdMyPatientsEncounter = {
  id: string;
  physicianAssignedUserId?: string | null;
  physicianAssigned?: { id?: string | null } | null;
  nurseAssignedUserId?: string | null;
  nurseAssigned?: { id?: string | null } | null;
};

export type EdMyPatientsFilterContext = {
  currentUserId: string;
  roles: readonly string[];
};

function normalizeUserId(value: string | null | undefined): string {
  return (value ?? "").trim();
}

export function resolvePhysicianAssignedUserId(encounter: EdMyPatientsEncounter): string {
  return normalizeUserId(
    encounter.physicianAssignedUserId ?? encounter.physicianAssigned?.id ?? null
  );
}

export function resolveNurseAssignedUserId(encounter: EdMyPatientsEncounter): string {
  return normalizeUserId(encounter.nurseAssignedUserId ?? encounter.nurseAssigned?.id ?? null);
}

/**
 * Operational ownership — assignment is workload, not exclusivity.
 * RN: nurse assignment; PROVIDER: physician assignment; ADMIN: either role slot.
 */
export function isEncounterAssignedToCurrentUser(
  encounter: EdMyPatientsEncounter,
  ctx: EdMyPatientsFilterContext
): boolean {
  const userId = normalizeUserId(ctx.currentUserId);
  if (!userId) return false;

  const nurseId = resolveNurseAssignedUserId(encounter);
  const physicianId = resolvePhysicianAssignedUserId(encounter);
  const isNurse = ctx.roles.includes("RN");
  const isProvider = ctx.roles.includes("PROVIDER");
  const isAdmin = ctx.roles.includes("ADMIN");

  if (isAdmin) {
    return nurseId === userId || physicianId === userId;
  }

  const roleMatches: boolean[] = [];
  if (isNurse) roleMatches.push(nurseId === userId);
  if (isProvider) roleMatches.push(physicianId === userId);

  if (roleMatches.length === 0) return false;
  return roleMatches.some(Boolean);
}

export function resolveMyPatientsEncounters<T extends EdMyPatientsEncounter>(
  encounters: readonly T[],
  ctx: EdMyPatientsFilterContext
): T[] {
  if (!normalizeUserId(ctx.currentUserId)) return [];
  return encounters.filter((encounter) => isEncounterAssignedToCurrentUser(encounter, ctx));
}
