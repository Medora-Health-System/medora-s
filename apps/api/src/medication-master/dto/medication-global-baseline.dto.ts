import { z } from "zod";

export const medicationGlobalBaselineListQuerySchema = z.object({
  q: z.string().trim().max(120).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional().default(100),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

export type MedicationGlobalBaselineListQuery = z.infer<
  typeof medicationGlobalBaselineListQuerySchema
>;
