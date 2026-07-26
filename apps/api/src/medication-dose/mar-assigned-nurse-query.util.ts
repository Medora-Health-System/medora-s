/**
 * Nurse-assignment filter for MAR list endpoints.
 *
 * Facility-wide pass/timeline boards may optionally filter by assigned nurse.
 * Encounter-scoped MAR (single chart) must never gate visibility on assignment —
 * any facility-authorized MAR viewer/administrator must see the same doses.
 *
 * D4A.4.2: when a facility assignee is active, callers resolve matching encounter
 * ids via enterprise ownership (PRIMARY_RN / ED nurse) — do NOT Prisma-filter on
 * Encounter.nurseAssignedUserId alone (that silently prefers ED receiving nurse
 * for inpatient / observation).
 */
export function resolveMarAssignedNurseFilter(input: {
  encounterId?: string | null;
  assignedToUserId?: string | null;
}): string | undefined {
  if (input.encounterId?.trim()) return undefined;
  const assigned = input.assignedToUserId?.trim();
  return assigned || undefined;
}
