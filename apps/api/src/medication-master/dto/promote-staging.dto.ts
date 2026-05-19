import { z } from "zod";

export const duplicateResolutionModeSchema = z.enum([
  "CREATE_NEW",
  "LINK_TO_EXISTING_CONCEPT",
  "LINK_TO_EXISTING_PRODUCT",
  "NEW_PACKAGE_ONLY",
]);

export const promoteStagingRowBodySchema = z.object({
  duplicateResolution: duplicateResolutionModeSchema.optional(),
  existingConceptId: z.string().uuid().optional(),
  existingProductId: z.string().uuid().optional(),
});

export type PromoteStagingRowBody = z.infer<typeof promoteStagingRowBodySchema>;
