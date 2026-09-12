import { z } from "zod";

export const patientPortalRegisterBodySchema = z
  .object({
    firstName: z.string().trim().min(1).max(120),
    lastName: z.string().trim().min(1).max(120),
    dateOfBirth: z.string().date(),
    email: z.string().trim().email().optional(),
    phone: z.string().trim().min(7).max(32).optional(),
    password: z.string().min(8).max(256),
    preferredLanguage: z.enum(["en", "es", "fr"]).default("en"),
  })
  .superRefine((value, ctx) => {
    if (!value.email && !value.phone) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["email"],
        message: "Email or phone is required",
      });
    }
  });

export const patientPortalLoginBodySchema = z.object({
  identifier: z.string().trim().min(1).max(254),
  password: z.string().min(1).max(256),
  deviceId: z.string().trim().min(1).max(200).optional(),
  deviceName: z.string().trim().min(1).max(200).optional(),
});

export const patientPortalRefreshBodySchema = z.object({
  refreshToken: z.string().min(1),
});

export type PatientPortalRegisterBody = z.infer<typeof patientPortalRegisterBodySchema>;
export type PatientPortalLoginBody = z.infer<typeof patientPortalLoginBodySchema>;
export type PatientPortalRefreshBody = z.infer<typeof patientPortalRefreshBodySchema>;
