import { z } from "zod";

export const createVaccineCatalogDtoSchema = z.object({
  code: z.string().min(1).max(64),
  name: z.string().min(1).max(256),
  description: z.string().max(2000).optional(),
  manufacturer: z.string().max(256).optional(),
  isActive: z.boolean().optional(),
});

export type CreateVaccineCatalogDto = z.infer<typeof createVaccineCatalogDtoSchema>;
