import { z } from "zod";

export const recordOrderDispenseDtoSchema = z.object({
  orderItemId: z.string().uuid(),
  quantityDispensed: z.number().int().positive(),
  dosageInstructions: z.string().max(1024).optional(),
  notes: z.string().max(1024).optional(),
});

export type RecordOrderDispenseDto = z.infer<typeof recordOrderDispenseDtoSchema>;
