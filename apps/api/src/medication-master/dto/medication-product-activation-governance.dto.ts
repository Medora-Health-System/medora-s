import { z } from "zod";

export const medicationActivationGovernanceListQuerySchema = z.object({
  facilityId: z.string().uuid().optional(),
  q: z.string().trim().max(120).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional().default(100),
});

export const medicationActivationGovernanceActionBodySchema = z.object({
  facilityId: z.string().uuid(),
  note: z.string().trim().min(3).max(4000),
  confirmExactSourcePreserved: z.literal(true, {
    errorMap: () => ({ message: "confirmExactSourcePreserved must be true" }),
  }),
  confirmDuplicateGovernanceResolved: z.literal(true, {
    errorMap: () => ({ message: "confirmDuplicateGovernanceResolved must be true" }),
  }),
});

export const medicationActivationEnableBillingBodySchema =
  medicationActivationGovernanceActionBodySchema.extend({
    reviewedBillingCode: z.string().trim().min(2).max(64),
    reviewedBillingUnit: z.string().trim().min(1).max(64),
    reviewedByRole: z.string().trim().min(2).max(48),
  });

export type MedicationActivationGovernanceListQuery = z.infer<
  typeof medicationActivationGovernanceListQuerySchema
>;
export type MedicationActivationGovernanceActionBody = z.infer<
  typeof medicationActivationGovernanceActionBodySchema
>;
export type MedicationActivationEnableBillingBody = z.infer<
  typeof medicationActivationEnableBillingBodySchema
>;
