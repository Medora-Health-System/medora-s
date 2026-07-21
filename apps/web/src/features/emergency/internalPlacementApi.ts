/**
 * D3C — client helpers for Internal Placement HTTP API.
 * No-ops / errors when workflow flag is OFF (server also fails closed).
 */

import { apiFetch } from "@/lib/apiClient";

export type InternalPlacementProjectionDto = {
  id: string;
  status: string;
  trackboardLabel: string | null;
  requestedEncounterType: "OBSERVATION" | "INPATIENT" | string;
  requestedLevelOfCare: string | null;
  requestedService: string | null;
  clinicalPriority: string | null;
  admissionDiagnosisSummary?: string | null;
  reasonForPlacement?: string | null;
  telemetryRequired: boolean;
  isolationRequired: boolean;
  acceptingProviderNameSnapshot?: string | null;
  version: number;
  revision: number;
  assignedUnitCode: string | null;
  assignedRoomKey: string | null;
  assignedBedKey: string | null;
  departedEdAt: string | null;
  arrivedDestinationAt: string | null;
};

export type PlacementDraftPayload = {
  requestedEncounterType: "OBSERVATION" | "INPATIENT";
  requestedLevelOfCare?: string | null;
  requestedService?: string | null;
  clinicalPriority?: string | null;
  admissionDiagnosisSummary?: string | null;
  reasonForPlacement?: string | null;
  telemetryRequired?: boolean;
  isolationRequired?: boolean;
  isolationType?: string | null;
  acceptingProviderNameSnapshot?: string | null;
  expectedVersion?: number;
};

export async function fetchActiveInternalPlacement(
  encounterId: string
): Promise<InternalPlacementProjectionDto | null> {
  return apiFetch(`/encounters/${encounterId}/internal-placement`) as Promise<
    InternalPlacementProjectionDto | null
  >;
}

export async function createInternalPlacementDraft(
  encounterId: string,
  payload: PlacementDraftPayload
): Promise<InternalPlacementProjectionDto> {
  return apiFetch(`/encounters/${encounterId}/internal-placement/draft`, {
    method: "POST",
    body: JSON.stringify(payload),
  }) as Promise<InternalPlacementProjectionDto>;
}

export async function updateInternalPlacementDraft(
  requestId: string,
  payload: PlacementDraftPayload
): Promise<InternalPlacementProjectionDto> {
  return apiFetch(`/internal-placement/${requestId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  }) as Promise<InternalPlacementProjectionDto>;
}

export async function signInternalPlacement(
  requestId: string,
  expectedVersion?: number
): Promise<InternalPlacementProjectionDto> {
  return apiFetch(`/internal-placement/${requestId}/sign`, {
    method: "POST",
    body: JSON.stringify({ expectedVersion }),
  }) as Promise<InternalPlacementProjectionDto>;
}

export async function submitInternalPlacement(
  requestId: string,
  expectedVersion?: number
): Promise<InternalPlacementProjectionDto> {
  return apiFetch(`/internal-placement/${requestId}/submit`, {
    method: "POST",
    body: JSON.stringify({ expectedVersion }),
  }) as Promise<InternalPlacementProjectionDto>;
}

export async function transitionInternalPlacement(
  requestId: string,
  body: {
    toStatus: string;
    assignedUnitCode?: string | null;
    assignedRoomKey?: string | null;
    assignedBedKey?: string | null;
    cancellationReason?: string | null;
    expectedVersion?: number;
  }
): Promise<InternalPlacementProjectionDto> {
  return apiFetch(`/internal-placement/${requestId}/transitions`, {
    method: "POST",
    body: JSON.stringify(body),
  }) as Promise<InternalPlacementProjectionDto>;
}
