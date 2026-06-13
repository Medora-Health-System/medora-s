import type { EncounterRoomUpdateResponse } from "@/lib/roomAssignmentApi";

export type EncounterWithGovernedRoom = {
  roomLabel?: string | null;
  type?: string | null;
  admissionSummaryJson?: unknown;
  unitCode?: string | null;
  governedRoomDisplay?: string | null;
  governedRoomUnit?: string | null;
  governedRoomHasAssignment?: boolean;
};

export const MEDORA_ENCOUNTER_ROOM_ASSIGNMENT_REFRESH = "medora:encounter-room-assignment-refresh";

export type EncounterRoomAssignmentRefreshDetail = {
  encounterId: string;
  facilityId: string;
  patch: EncounterRoomUpdateResponse;
};

/** Notify mounted surfaces (e.g. MAR shift timeline) to refresh after room assignment. */
export function dispatchEncounterRoomAssignmentRefresh(
  detail: EncounterRoomAssignmentRefreshDetail
): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(MEDORA_ENCOUNTER_ROOM_ASSIGNMENT_REFRESH, { detail }));
}

/**
 * Merge governed room assignment PATCH fields into local encounter state.
 * Does not replace the encounter — only overlays fields present on the response.
 */
export function applyEncounterRoomAssignmentUpdate<T extends EncounterWithGovernedRoom>(
  encounter: T,
  roomUpdate: EncounterRoomUpdateResponse
): T {
  const next: T = { ...encounter };

  if (Object.prototype.hasOwnProperty.call(roomUpdate, "roomLabel")) {
    next.roomLabel = roomUpdate.roomLabel ?? null;
  }
  if (roomUpdate.type !== undefined) {
    next.type = roomUpdate.type;
  }
  if (Object.prototype.hasOwnProperty.call(roomUpdate, "governedRoomDisplay")) {
    next.governedRoomDisplay = roomUpdate.governedRoomDisplay ?? null;
  }
  if (Object.prototype.hasOwnProperty.call(roomUpdate, "governedRoomUnit")) {
    next.governedRoomUnit = roomUpdate.governedRoomUnit ?? null;
  }
  if (Object.prototype.hasOwnProperty.call(roomUpdate, "governedRoomHasAssignment")) {
    next.governedRoomHasAssignment = roomUpdate.governedRoomHasAssignment ?? false;
  }

  return next;
}
