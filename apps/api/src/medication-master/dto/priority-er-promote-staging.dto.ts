import { z } from "zod";
import { duplicateResolutionModeSchema } from "./promote-staging.dto";

export const promotePriorityErStagingRowBodySchema = z.object({
  duplicateResolution: duplicateResolutionModeSchema.optional(),
  existingConceptId: z.string().uuid().optional(),
  existingProductId: z.string().uuid().optional(),
  confirmCreateDespiteDuplicate: z.boolean().optional(),
  activateBilling: z.boolean().optional(),
  activatePackageWithNdc: z.boolean().optional(),
});

export type PromotePriorityErStagingRowBody = z.infer<typeof promotePriorityErStagingRowBodySchema>;
