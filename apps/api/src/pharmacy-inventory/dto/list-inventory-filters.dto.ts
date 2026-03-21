import { z } from "zod";

export const listInventoryFiltersDtoSchema = z.object({
  medicationNameOrCode: z.string().max(128).optional(),
  activeOnly: z
    .string()
    .optional()
    .transform((v: string | undefined) => v === "true" || v === "1"),
  lowStockOnly: z
    .string()
    .optional()
    .transform((v: string | undefined) => v === "true" || v === "1"),
  expirationBefore: z.coerce.date().optional(), // include items expiring on or before this date
  limit: z.coerce.number().int().min(1).max(200).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

export type ListInventoryFiltersDto = z.infer<typeof listInventoryFiltersDtoSchema>;
