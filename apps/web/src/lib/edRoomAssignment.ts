import {
  BED_STATUS_BLOCKS_ASSIGNMENT_CODE,
  ED_ROOM_OCCUPIED_CODE,
  ROOM_ALREADY_OCCUPIED_CODE,
  formatBedOperationalStatusLabel,
  findRoomOccupancyConflict,
  isEdWaitingRoomLabel,
  normalizeRoomLabel,
  type BedOperationalStatus,
  type EdRoomOccupancyConflict,
} from "@medora/shared";
import { fetchOpenEncounters } from "@/lib/clinicalWorklistApi";

export type RoomOccupancyConflictUi = EdRoomOccupancyConflict & {
  occupiedRoom?: string;
  occupiedByPatientName?: string;
};

export type BedStatusBlocksAssignmentUi = {
  bedKey: string;
  bedDisplay: string;
  status: BedOperationalStatus;
  reasonCode?: string;
  reasonText?: string;
};

export type RoomAssignmentConflictUi =
  | { kind: "occupancy"; conflict: RoomOccupancyConflictUi }
  | { kind: "bedStatus"; conflict: BedStatusBlocksAssignmentUi };

/** Loads open encounters and checks for an exact numbered-room conflict (ED-only legacy helper). */
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

export function parseBedStatusBlocksApiError(error: unknown): BedStatusBlocksAssignmentUi | null {
  if (!error || typeof error !== "object") return null;
  const err = error as { status?: number; body?: unknown };
  if (err.status !== 409 || !err.body || typeof err.body !== "object" || Array.isArray(err.body)) {
    return null;
  }
  const body = err.body as Record<string, unknown>;
  if (body.code !== BED_STATUS_BLOCKS_ASSIGNMENT_CODE) return null;
  const bedKey = typeof body.bedKey === "string" ? body.bedKey : "";
  const bedDisplay = typeof body.bedDisplay === "string" ? body.bedDisplay : "";
  const status = typeof body.status === "string" ? (body.status as BedOperationalStatus) : null;
  if (!bedKey || !bedDisplay || !status) return null;
  return {
    bedKey,
    bedDisplay,
    status,
    reasonCode: typeof body.reasonCode === "string" ? body.reasonCode : undefined,
    reasonText: typeof body.reasonText === "string" ? body.reasonText : undefined,
  };
}

export function parseRoomAssignmentApiError(error: unknown): RoomAssignmentConflictUi | null {
  const occupancy = parseRoomOccupancyApiError(error);
  if (occupancy) return { kind: "occupancy", conflict: occupancy };
  const bedStatus = parseBedStatusBlocksApiError(error);
  if (bedStatus) return { kind: "bedStatus", conflict: bedStatus };
  return null;
}

export function formatBedStatusBlocksMessage(
  conflict: BedStatusBlocksAssignmentUi,
  language: "en" | "fr",
  t: (key: string) => string
): string {
  const statusLabelKey = `bedStatus.${conflict.status}`;
  const statusLabel =
    t(statusLabelKey) !== statusLabelKey
      ? t(statusLabelKey)
      : formatBedOperationalStatusLabel(conflict.status, language);
  const template = t("roomAssignment.bedStatusConflictBody");
  return template.replace("{bedDisplay}", conflict.bedDisplay).replace("{statusLabel}", statusLabel);
}

export function parseRoomOccupancyApiError(error: unknown): RoomOccupancyConflictUi | null {
  if (!error || typeof error !== "object") return null;
  const err = error as { status?: number; body?: unknown };
  if (err.status !== 409 || !err.body || typeof err.body !== "object" || Array.isArray(err.body)) {
    return null;
  }
  const body = err.body as Record<string, unknown>;
  const code = body.code;
  if (code !== ROOM_ALREADY_OCCUPIED_CODE && code !== ED_ROOM_OCCUPIED_CODE) return null;

  const requestedRoom = typeof body.requestedRoom === "string" ? body.requestedRoom : "";
  const suggestedRoom = typeof body.suggestedRoom === "string" ? body.suggestedRoom : requestedRoom;
  const occupiedRoom = typeof body.occupiedRoom === "string" ? body.occupiedRoom : undefined;
  const occupyingEncounterId =
    typeof body.occupiedByEncounterId === "string" ? body.occupiedByEncounterId : "";
  const occupiedByPatientName =
    typeof body.occupiedByPatientName === "string" ? body.occupiedByPatientName : undefined;

  if (!requestedRoom && !occupiedRoom) return null;

  return {
    occupyingEncounterId,
    requestedRoom: requestedRoom || occupiedRoom || "",
    suggestedRoom: suggestedRoom || requestedRoom || occupiedRoom || "",
    occupiedRoom,
    occupiedByPatientName,
  };
}

/** @deprecated Use parseRoomOccupancyApiError */
export function parseEdRoomOccupiedApiError(error: unknown): EdRoomOccupancyConflict | null {
  return parseRoomOccupancyApiError(error);
}

export function buildEdRoomOccupancyConfirmPayload(
  conflict: RoomOccupancyConflictUi,
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
