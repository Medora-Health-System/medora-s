import { z } from "zod";

const governanceActionConfirmationsSchema = z.object({
  confirmExactSourcePreserved: z.literal(true, {
    errorMap: () => ({ message: "confirmExactSourcePreserved must be true" }),
  }),
  confirmDuplicateGovernanceResolved: z.literal(true, {
    errorMap: () => ({ message: "confirmDuplicateGovernanceResolved must be true" }),
  }),
});

export const medicationProductGovernanceActionBodySchema = z.object({
  facilityId: z.string().uuid(),
  governanceNote: z.string().trim().max(4000).optional(),
});

/** Phase 19G.2C — single-row governance activation approval (no runtime cutover). */
export const medicationProductGovernanceApproveBodySchema = z
  .object({
    facilityId: z.string().uuid(),
    governanceNote: z.string().trim().min(3).max(4000),
  })
  .merge(governanceActionConfirmationsSchema);

export const medicationProductGovernanceBlockBodySchema = z
  .object({
    facilityId: z.string().uuid(),
    governanceNote: z.string().trim().min(3).max(4000),
  })
  .merge(governanceActionConfirmationsSchema);

export type MedicationProductGovernanceActionBody = z.infer<
  typeof medicationProductGovernanceActionBodySchema
>;
export type MedicationProductGovernanceApproveBody = z.infer<
  typeof medicationProductGovernanceApproveBodySchema
>;
export type MedicationProductGovernanceBlockBody = z.infer<
  typeof medicationProductGovernanceBlockBodySchema
>;
