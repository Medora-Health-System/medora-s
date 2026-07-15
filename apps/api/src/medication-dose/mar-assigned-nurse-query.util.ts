/**
 * Nurse-assignment filter for MAR list endpoints.
 *
 * Facility-wide pass/timeline boards may optionally filter by assigned nurse.
 * Encounter-scoped MAR (single chart) must never gate visibility on assignment —
 * any facility-authorized MAR viewer/administrator must see the same doses.
 */
export function resolveMarAssignedNurseFilter(input: {
  encounterId?: string | null;
  assignedToUserId?: string | null;
}): string | undefined {
  if (input.encounterId?.trim()) return undefined;
  const assigned = input.assignedToUserId?.trim();
  return assigned || undefined;
}
