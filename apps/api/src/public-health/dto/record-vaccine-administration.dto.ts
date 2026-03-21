import { z } from "zod";

export const recordVaccineAdministrationDtoSchema = z.object({
  patientId: z.string().uuid(),
  encounterId: z.string().uuid().optional().nullable(),
  vaccineCatalogId: z.string().uuid(),
  doseNumber: z.number().int().min(1).max(99).optional().nullable(),
  lotNumber: z.string().max(128).optional().nullable(),
  administeredAt: z.coerce.date().optional(),
  nextDueAt: z.coerce.date().optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

export type RecordVaccineAdministrationDto = z.infer<
  typeof recordVaccineAdministrationDtoSchema
>;
