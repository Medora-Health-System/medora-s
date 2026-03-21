import { z } from "zod";

export const dispenseMedicationDtoSchema = z.object({
  inventoryItemId: z.string().uuid(),
  patientId: z.string().uuid(),
  encounterId: z.string().uuid(),
  quantityDispensed: z.number().int().positive(),
  dosageInstructions: z.string().max(1024).optional(),
  notes: z.string().max(1024).optional(),
});

export type DispenseMedicationDto = z.infer<typeof dispenseMedicationDtoSchema>;
