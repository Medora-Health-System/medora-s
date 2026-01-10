import { z } from "zod";

export const sexAtBirthSchema = z.enum(["M", "F", "X", "U"]);
export type SexAtBirth = z.infer<typeof sexAtBirthSchema>;

export const patientCreateDtoSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  registeredAtFacilityId: z.string().uuid(),
  dob: z.coerce.date().optional(),
  phone: z.string().min(5).max(32).optional(),
  sexAtBirth: sexAtBirthSchema.optional(),
  nationalId: z.string().min(3).max(64).optional()
});

export type PatientCreateDto = z.infer<typeof patientCreateDtoSchema>;

