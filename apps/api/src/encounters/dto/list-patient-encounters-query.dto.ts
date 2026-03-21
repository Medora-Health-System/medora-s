import { z } from "zod";
import { EncounterType } from "@prisma/client";

export const listPatientEncountersQuerySchema = z.object({
  type: z.nativeEnum(EncounterType).optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
});

export type ListPatientEncountersQuery = z.infer<
  typeof listPatientEncountersQuerySchema
>;
