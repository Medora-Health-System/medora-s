import { z } from "zod";

export const createInventoryItemDtoSchema = z.object({
  catalogMedicationId: z.string().uuid(),
  sku: z.string().min(1).max(64),
  lotNumber: z.string().max(64).optional(),
  expirationDate: z.coerce.date().optional(),
  quantityOnHand: z.number().int().min(0).optional(),
  reorderLevel: z.number().int().min(0).optional(),
  unit: z.string().max(32).optional(),
});

export type CreateInventoryItemDto = z.infer<typeof createInventoryItemDtoSchema>;
