import { z } from "zod";

export const listPatientVaccinationsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).optional(),
});

export type ListPatientVaccinationsQuery = z.infer<
  typeof listPatientVaccinationsQuerySchema
>;
