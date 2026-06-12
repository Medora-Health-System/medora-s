import { ConflictException } from "@nestjs/common";
import {
  BED_STATUS_BLOCKS_ASSIGNMENT_CODE,
  type BedOperationalStatus,
} from "@medora/shared";

export type BedStatusBlocksAssignmentConflict = {
  bedKey: string;
  bedDisplay: string;
  status: BedOperationalStatus;
  reasonCode?: string | null;
  reasonText?: string | null;
};

export function throwBedStatusBlocksAssignmentConflict(
  conflict: BedStatusBlocksAssignmentConflict
): never {
  throw new ConflictException({
    statusCode: 409,
    code: BED_STATUS_BLOCKS_ASSIGNMENT_CODE,
    message: BED_STATUS_BLOCKS_ASSIGNMENT_CODE,
    bedKey: conflict.bedKey,
    bedDisplay: conflict.bedDisplay,
    status: conflict.status,
    reasonCode: conflict.reasonCode ?? undefined,
    reasonText: conflict.reasonText ?? undefined,
  });
}
