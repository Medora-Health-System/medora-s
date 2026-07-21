/**
 * D3CA — read-only facility placement queue client (D3C data).
 */

import { apiFetch } from "@/lib/apiClient";

export type HospitalCarePlacementQueueRow = {
  id: string;
  status: string;
  trackboardLabel: string | null;
  requestedEncounterType: "OBSERVATION" | "INPATIENT" | string;
  requestedLevelOfCare: string | null;
  requestedService: string | null;
  clinicalPriority: string | null;
  acceptingProviderNameSnapshot: string | null;
  assignedUnitCode: string | null;
  assignedRoomKey: string | null;
  assignedBedKey: string | null;
  departedEdAt: string | null;
  arrivedDestinationAt: string | null;
  readyForTransferAt: string | null;
  originatingEncounterId: string;
  receivingEncounterId: string | null;
  requestedAt: string | null;
  createdAt: string;
  patient: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    mrn: string | null;
    dob: string | null;
    sexAtBirth: string | null;
  };
};

export async function fetchFacilityPlacementQueue(): Promise<HospitalCarePlacementQueueRow[]> {
  const rows = await apiFetch("/internal-placement");
  return Array.isArray(rows) ? (rows as HospitalCarePlacementQueueRow[]) : [];
}

/** Queue statuses shown on Placement Queue / Admissions (pre-arrival + transport). */
export const PLACEMENT_QUEUE_STATUS_SET = new Set([
  "SIGNED",
  "REQUESTED",
  "UNDER_REVIEW",
  "ACCEPTED",
  "BED_ASSIGNED",
  "READY_FOR_TRANSFER",
  "DEPARTED_ED",
]);

/** Post-arrival census lanes for Observation / Inpatient shells. */
export function isArrivedPlacement(row: HospitalCarePlacementQueueRow): boolean {
  return (
    row.status === "ARRIVED_DESTINATION" ||
    Boolean(row.arrivedDestinationAt) ||
    Boolean(row.receivingEncounterId)
  );
}
