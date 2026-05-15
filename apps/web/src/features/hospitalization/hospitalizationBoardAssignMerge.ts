import type { HospitalisationBoardEncounterRow } from "@/lib/hospitalisationBoardTypes";

/**
 * Merge Phase 10A self-assign encounter payload into a hospitalisation board row
 * (trackboard row shape subset). Preserves `observationOps` / `trackboardOps` until
 * the next full board refetch recalculates flags.
 */
export function mergeHospitalisationRowAfterAssign(
  row: HospitalisationBoardEncounterRow,
  updated: unknown
): HospitalisationBoardEncounterRow {
  if (!updated || typeof updated !== "object" || Array.isArray(updated)) {
    return row;
  }
  const u = updated as Partial<HospitalisationBoardEncounterRow>;
  return {
    ...row,
    ...(u.physicianAssigned !== undefined ? { physicianAssigned: u.physicianAssigned } : {}),
    ...(u.nurseAssigned !== undefined ? { nurseAssigned: u.nurseAssigned } : {}),
    ...(u.physicianAssignedUserId !== undefined ? { physicianAssignedUserId: u.physicianAssignedUserId } : {}),
    ...(u.nurseAssignedUserId !== undefined ? { nurseAssignedUserId: u.nurseAssignedUserId } : {}),
  };
}
