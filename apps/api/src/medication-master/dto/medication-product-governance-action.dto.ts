import { z } from "zod";

export const medicationProductGovernanceActionBodySchema = z.object({
  facilityId: z.string().uuid(),
  governanceNote: z.string().trim().max(4000).optional(),
});

export const medicationProductGovernanceBlockBodySchema = z.object({
  facilityId: z.string().uuid(),
  governanceNote: z.string().trim().min(3).max(4000),
});

export type MedicationProductGovernanceActionBody = z.infer<
  typeof medicationProductGovernanceActionBodySchema
>;
export type MedicationProductGovernanceBlockBody = z.infer<
  typeof medicationProductGovernanceBlockBodySchema
>;
