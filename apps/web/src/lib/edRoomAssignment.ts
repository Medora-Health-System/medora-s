import { findRoomOccupancyConflict, normalizeRoomLabel, type EdRoomOccupancyConflict } from "@medora/shared";
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
  return normalizeRoomLabel(currentRoom) === normalizeRoomLabel(nextRoom);
}
