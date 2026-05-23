import { z } from "zod";

const highRiskReviewActionBaseSchema = z.object({
  facilityId: z.string().uuid(),
  note: z.string().min(3).max(2000),
});

export const highRiskApproveCatalogBodySchema = highRiskReviewActionBaseSchema;

export type HighRiskApproveCatalogBody = z.infer<typeof highRiskApproveCatalogBodySchema>;

export const highRiskApproveProviderOrderingBodySchema = highRiskReviewActionBaseSchema.extend({
  confirmProviderOrderingOnly: z.literal(true),
  confirmMarRemainsOff: z.literal(true),
  confirmBillingRemainsOff: z.literal(true),
  confirmInventoryRemainsOff: z.literal(true),
});

export type HighRiskApproveProviderOrderingBody = z.infer<
  typeof highRiskApproveProviderOrderingBodySchema
>;

export const highRiskRejectBodySchema = highRiskReviewActionBaseSchema;

export type HighRiskRejectBody = z.infer<typeof highRiskRejectBodySchema>;
