import { ConflictException } from "@nestjs/common";
import {
  BED_OCCUPIED_BLOCKS_STATUS_CHANGE_CODE,
  type BedOperationalStatus,
  type ManualBedOperationalStatus,
} from "@medora/shared";

export type BedOccupiedBlocksStatusChangeConflict = {
  bedKey: string;
  bedDisplay: string;
  status: BedOperationalStatus;
  targetStatus: ManualBedOperationalStatus;
  occupantEncounterId?: string | null;
};

export function throwBedOccupiedBlocksStatusChange(
  conflict: BedOccupiedBlocksStatusChangeConflict
): never {
  throw new ConflictException({
    statusCode: 409,
    code: BED_OCCUPIED_BLOCKS_STATUS_CHANGE_CODE,
    message: BED_OCCUPIED_BLOCKS_STATUS_CHANGE_CODE,
    bedKey: conflict.bedKey,
    bedDisplay: conflict.bedDisplay,
    status: conflict.status,
    targetStatus: conflict.targetStatus,
    occupantEncounterId: conflict.occupantEncounterId ?? undefined,
  });
}
