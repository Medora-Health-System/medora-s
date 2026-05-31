import {
  ED_ROOM_OCCUPIED_CODE,
  findRoomOccupancyConflict,
  isEdWaitingRoomLabel,
  normalizeRoomLabel,
  type EdRoomOccupancyConflict,
} from "@medora/shared";
import { fetchOpenEncounters } from "@/lib/clinicalWorklistApi";

/** Loads open encounters and checks for an exact numbered-room conflict. */
export async function checkEdRoomAssignmentConflict(
  facilityId: string,
  requestedRoom: string,
  excludeEncounterId?: string
): Promise<EdRoomOccupancyConflict | null> {
  const encounters = await fetchOpenEncounters(facilityId);
  return findRoomOccupancyConflict(requestedRoom, encounters, {
    excludeEncounterId,
    facilityId,
  });
}

export function isSameNormalizedRoom(
  currentRoom: string | null | undefined,
  nextRoom: string | null | undefined
): boolean {
  if (isEdWaitingRoomLabel(currentRoom) && isEdWaitingRoomLabel(nextRoom)) return true;
  return normalizeRoomLabel(currentRoom) === normalizeRoomLabel(nextRoom);
}

export function parseEdRoomOccupiedApiError(error: unknown): EdRoomOccupancyConflict | null {
  if (!error || typeof error !== "object") return null;
  const err = error as { status?: number; body?: unknown };
  if (err.status !== 409 || !err.body || typeof err.body !== "object" || Array.isArray(err.body)) {
    return null;
  }
  const body = err.body as Record<string, unknown>;
  if (body.code !== ED_ROOM_OCCUPIED_CODE) return null;
  const requestedRoom = typeof body.requestedRoom === "string" ? body.requestedRoom : "";
  const suggestedRoom = typeof body.suggestedRoom === "string" ? body.suggestedRoom : "";
  if (!requestedRoom || !suggestedRoom) return null;
  return {
    occupyingEncounterId: "",
    requestedRoom,
    suggestedRoom,
  };
}

export function buildEdRoomOccupancyConfirmPayload(
  conflict: EdRoomOccupancyConflict,
  acceptedRoom?: string
) {
  const accepted = acceptedRoom ?? conflict.suggestedRoom;
  return {
    roomLabel: conflict.requestedRoom,
    confirmOccupiedRoomAssignment: true,
    roomOccupancyOverride: {
      requestedRoom: conflict.requestedRoom,
      acceptedRoom: accepted,
    },
  };
}
