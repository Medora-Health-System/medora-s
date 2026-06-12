import { apiFetch } from "./apiClient";
import type { EncounterCareUnitCode, EncounterRoomChangeReasonCode } from "@medora/shared";

export type EncounterRoomUpdatePayload = {
  room: string | null;
  unitCode?: EncounterCareUnitCode | null;
  reason?: EncounterRoomChangeReasonCode | null;
  reasonOther?: string | null;
  confirmOccupiedRoomAssignment?: boolean;
  roomOccupancyOverride?: {
    requestedRoom: string;
    acceptedRoom: string;
  };
  confirmBedStatusOverride?: boolean;
  bedStatusOverrideReasonCode?: string | null;
  bedStatusOverrideReasonText?: string | null;
};

export type EncounterRoomUpdateResponse = {
  id: string;
  roomLabel?: string | null;
  type?: string | null;
  governedRoomDisplay?: string | null;
  governedRoomUnit?: string | null;
  governedRoomHasAssignment?: boolean;
};

export async function updateEncounterRoomAssignment(
  facilityId: string,
  encounterId: string,
  payload: EncounterRoomUpdatePayload
): Promise<EncounterRoomUpdateResponse> {
  return apiFetch(`/encounters/${encounterId}/room`, {
    method: "PATCH",
    facilityId,
    body: JSON.stringify(payload),
  }) as Promise<EncounterRoomUpdateResponse>;
}
