import { z } from "zod";
import { duplicateResolutionModeSchema } from "./promote-staging.dto";

export const promotePriorityErStagingRowBodySchema = z.object({
  duplicateResolution: duplicateResolutionModeSchema.optional(),
  existingConceptId: z.string().uuid().optional(),
  existingProductId: z.string().uuid().optional(),
  confirmCreateDespiteDuplicate: z.boolean().optional(),
  activateBilling: z.boolean().optional(),
  activatePackageWithNdc: z.boolean().optional(),
  /** Phase 19H — optional facility formulary shell after global baseline promote (still inactive / not orderable). */
  facilityOverlayId: z.string().uuid().optional(),
});

export type PromotePriorityErStagingRowBody = z.infer<typeof promotePriorityErStagingRowBodySchema>;
