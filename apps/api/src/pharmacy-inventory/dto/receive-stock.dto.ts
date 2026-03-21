import { z } from "zod";

export const receiveStockDtoSchema = z.object({
  quantity: z.number().int().positive(),
  notes: z.string().max(1024).optional(),
});

export type ReceiveStockDto = z.infer<typeof receiveStockDtoSchema>;
