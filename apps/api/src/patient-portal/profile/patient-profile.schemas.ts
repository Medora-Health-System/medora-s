import { z } from "zod";

export const patientProfileUpdateSchema = z
  .object({
    preferredLanguage: z.enum(["en", "es", "fr"]).optional(),
  })
  .strict()
  .refine((value) => value.preferredLanguage !== undefined, {
    message: "At least one supported profile field is required",
  });

export type PatientProfileUpdateDto = z.infer<typeof patientProfileUpdateSchema>;
