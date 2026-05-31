import { ConflictException } from "@nestjs/common";
import {
  ED_ROOM_OCCUPIED_CODE,
  type EdRoomOccupancyConflict,
} from "@medora/shared";

export { ED_ROOM_OCCUPIED_CODE };

export function throwEdRoomOccupiedConflict(conflict: EdRoomOccupancyConflict): never {
  throw new ConflictException({
    statusCode: 409,
    code: ED_ROOM_OCCUPIED_CODE,
    message: ED_ROOM_OCCUPIED_CODE,
    requestedRoom: conflict.requestedRoom,
    suggestedRoom: conflict.suggestedRoom,
  });
}
