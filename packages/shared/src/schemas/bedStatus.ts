import { z } from "zod";
import { MANUAL_BED_OPERATIONAL_STATUSES } from "../encounters/bedOperationalStatus.js";

export const bedStatusUpdateDtoSchema = z.object({
  status: z.enum(MANUAL_BED_OPERATIONAL_STATUSES as unknown as [string, ...string[]]),
  reasonCode: z.string().trim().max(64).optional(),
  reasonText: z.string().trim().max(500).optional(),
});

export type BedStatusUpdateDto = z.infer<typeof bedStatusUpdateDtoSchema>;

export const bedBoardUnitQuerySchema = z.object({
  unit: z.enum(["ED", "OBS", "MS", "ICU"]).optional(),
});

export type BedBoardUnitQuery = z.infer<typeof bedBoardUnitQuerySchema>;
