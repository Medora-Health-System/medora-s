/**
 * Authoritative eligibility for assigning an encounter to a treatment bed/room.
 * Shared by Bed Board assign pickers and occupancy composition.
 *
 * Waiting-room / unassigned locations are eligible.
 * Active treatment-bed assignments (canonical bed key present) are not.
 */
import { resolveEncounterCanonicalBedKey } from "./facilityBedGovernance.js";

export type TreatmentBedAssignmentEligibilityInput = {
  id?: string | null;
  status?: string | null;
  facilityId?: string | null;
  roomLabel?: string | null;
  type?: string | null;
  admissionSummaryJson?: unknown;
  unitCode?: string | null;
};

export type TreatmentBedAssignmentEligibilityOptions = {
  /** When set, encounter.facilityId must match (cross-facility rejected). */
  facilityId?: string | null;
};

/**
 * True when the encounter may be offered for assignment to an available treatment bed.
 *
 * Eligible when:
 * - status is OPEN (or omitted — callers should pass open census rows)
 * - facility matches when options.facilityId is provided
 * - encounter is not already mapped to an active treatment bed
 *   (WAITING_ROOM / empty / non-bed labels → eligible)
 */
export function isEligibleForTreatmentBedAssignment(
  encounter: TreatmentBedAssignmentEligibilityInput,
  options?: TreatmentBedAssignmentEligibilityOptions
): boolean {
  const status = (encounter.status ?? "OPEN").trim().toUpperCase();
  if (status !== "OPEN") return false;

  const scopeFacility = options?.facilityId?.trim();
  const rowFacility = encounter.facilityId?.trim();
  if (scopeFacility && rowFacility && rowFacility !== scopeFacility) {
    return false;
  }

  return resolveEncounterCanonicalBedKey(encounter) == null;
}

/** Deduplicate assign candidates by encounter id (stable first-seen order). */
export function selectTreatmentBedAssignmentCandidates<
  T extends TreatmentBedAssignmentEligibilityInput & { id: string },
>(
  encounters: readonly T[],
  options?: TreatmentBedAssignmentEligibilityOptions
): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const row of encounters) {
    if (!row.id || seen.has(row.id)) continue;
    if (!isEligibleForTreatmentBedAssignment(row, options)) continue;
    seen.add(row.id);
    out.push(row);
  }
  return out;
}
