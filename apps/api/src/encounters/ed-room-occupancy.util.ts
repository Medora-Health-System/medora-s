import { ConflictException } from "@nestjs/common";
import {
  ED_ROOM_OCCUPIED_CODE,
  ROOM_ALREADY_OCCUPIED_CODE,
  type BedOccupancyConflict,
} from "@medora/shared";

export { ED_ROOM_OCCUPIED_CODE, ROOM_ALREADY_OCCUPIED_CODE };

export function throwRoomAlreadyOccupiedConflict(conflict: BedOccupancyConflict): never {
  throw new ConflictException({
    statusCode: 409,
    code: ROOM_ALREADY_OCCUPIED_CODE,
    message: ROOM_ALREADY_OCCUPIED_CODE,
    occupiedRoom: conflict.occupiedRoom,
    occupiedByEncounterId: conflict.occupyingEncounterId,
    occupiedByPatientName: conflict.occupiedByPatientName ?? undefined,
    requestedRoom: conflict.requestedRoom,
    suggestedRoom: conflict.suggestedRoom,
  });
}

/** @deprecated Prefer throwRoomAlreadyOccupiedConflict — kept for legacy ED paths. */
export function throwEdRoomOccupiedConflict(conflict: {
  occupyingEncounterId: string;
  requestedRoom: string;
  suggestedRoom: string;
}): never {
  throw new ConflictException({
    statusCode: 409,
    code: ED_ROOM_OCCUPIED_CODE,
    message: ED_ROOM_OCCUPIED_CODE,
    requestedRoom: conflict.requestedRoom,
    suggestedRoom: conflict.suggestedRoom,
  });
}
