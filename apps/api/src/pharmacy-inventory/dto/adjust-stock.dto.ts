import { z } from "zod";

export const adjustStockDtoSchema = z.object({
  quantity: z.number().int(), // positive = add, negative = subtract
  notes: z.string().max(1024).optional(),
});

export type AdjustStockDto = z.infer<typeof adjustStockDtoSchema>;
