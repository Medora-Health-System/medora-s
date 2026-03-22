import { z } from "zod";

/** POST /admin/facilities */
export const createFacilityDtoSchema = z.object({
  name: z.string().trim().min(1, "Le nom est requis.").max(200),
});

export const facilityDtoSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
});

export type CreateFacilityDto = z.infer<typeof createFacilityDtoSchema>;
export type FacilityDto = z.infer<typeof facilityDtoSchema>;
