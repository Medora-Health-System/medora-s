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

export type PlacementQueueAvailability = "ENABLED" | "FEATURE_DISABLED";

export type FacilityPlacementQueueResponse = {
  availability: PlacementQueueAvailability;
  items: HospitalCarePlacementQueueRow[];
};

export function parseFacilityPlacementQueueResponse(
  body: unknown
): FacilityPlacementQueueResponse {
  if (body && typeof body === "object" && !Array.isArray(body)) {
    const o = body as { availability?: unknown; items?: unknown };
    if (o.availability === "FEATURE_DISABLED") {
      return { availability: "FEATURE_DISABLED", items: [] };
    }
    if (o.availability === "ENABLED" || Array.isArray(o.items)) {
      return {
        availability: "ENABLED",
        items: Array.isArray(o.items) ? (o.items as HospitalCarePlacementQueueRow[]) : [],
      };
    }
  }
  if (Array.isArray(body)) {
    return { availability: "ENABLED", items: body as HospitalCarePlacementQueueRow[] };
  }
  return { availability: "ENABLED", items: [] };
}

export async function fetchFacilityPlacementQueue(): Promise<FacilityPlacementQueueResponse> {
  const body = await apiFetch("/internal-placement");
  return parseFacilityPlacementQueueResponse(body);
}

export type PlacementTransitionBody = {
  toStatus: string;
  acceptanceNotes?: string | null;
  assignedUnitCode?: string | null;
  assignedRoomKey?: string | null;
  assignedBedKey?: string | null;
  assignmentSourceSystem?: string | null;
  cancellationReason?: string | null;
  expectedVersion?: number;
};

/** D3E.7 — governed server transition (never invent status client-side). */
export async function transitionPlacementRequest(
  requestId: string,
  body: PlacementTransitionBody
): Promise<HospitalCarePlacementQueueRow> {
  const result = await apiFetch(`/internal-placement/${encodeURIComponent(requestId)}/transitions`, {
    method: "POST",
    body: JSON.stringify(body),
  });
  return result as HospitalCarePlacementQueueRow;
}

export function isPlacementActionsEnabledInBrowser(): boolean {
  const v = String(process.env.NEXT_PUBLIC_PLACEMENT_ACTIONS_ENABLED ?? "")
    .trim()
    .toLowerCase();
  return v === "1" || v === "true" || v === "yes" || v === "on";
}

export function isForbiddenApiError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    (error as { status?: number }).status === 403
  );
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
