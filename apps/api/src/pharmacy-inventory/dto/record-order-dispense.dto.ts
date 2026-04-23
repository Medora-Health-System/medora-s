import { z } from "zod";

export const recordOrderDispenseDtoSchema = z.object({
  orderItemId: z.string().uuid(),
  quantityDispensed: z.number().int().positive(),
  doseValue: z.number().finite().nonnegative().optional(),
  doseUnit: z.string().trim().max(32).optional(),
  billingQuantity: z.number().finite().nonnegative().optional(),
  quantityUnit: z.string().trim().max(32).optional(),
  ndc: z.string().trim().max(64).optional(),
  dosageInstructions: z.string().max(1024).optional(),
  notes: z.string().max(1024).optional(),
});

export type RecordOrderDispenseDto = z.infer<typeof recordOrderDispenseDtoSchema>;
