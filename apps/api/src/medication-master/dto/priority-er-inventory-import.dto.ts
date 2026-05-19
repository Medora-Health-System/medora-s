import { z } from "zod";

export const priorityErInventoryImportQuerySchema = z.object({
  dryRun: z
    .union([z.literal("true"), z.literal("false"), z.boolean()])
    .optional()
    .transform((v) => v === true || v === "true")
    .default(true),
  facilityId: z.string().uuid().optional(),
  batchId: z.string().min(1).max(128).optional(),
});

export type PriorityErInventoryImportQuery = z.infer<typeof priorityErInventoryImportQuerySchema>;

export const priorityErInventoryStagingListQuerySchema = z.object({
  batchId: z.string().min(1).optional(),
  reconciliationStatus: z.string().optional(),
  importGateStatus: z.string().optional(),
  q: z.string().max(200).optional(),
  limit: z.coerce.number().int().min(1).max(500).default(100),
  offset: z.coerce.number().int().min(0).default(0),
});

export type PriorityErInventoryStagingListQuery = z.infer<
  typeof priorityErInventoryStagingListQuerySchema
>;
