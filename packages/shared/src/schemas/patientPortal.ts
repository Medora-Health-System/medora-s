import { z } from "zod";

export const patientPortalLanguageSchema = z.enum(["en", "es", "fr"]);

export const patientPortalRegisterSchema = z
  .object({
    firstName: z.string().trim().min(1).max(120),
    lastName: z.string().trim().min(1).max(120),
    dateOfBirth: z.string().date(),
    email: z.string().trim().email().optional(),
    phone: z.string().trim().min(7).max(32).optional(),
    password: z.string().min(8).max(256),
    preferredLanguage: patientPortalLanguageSchema.optional(),
  })
  .superRefine((value, ctx) => {
    if (!value.email && !value.phone) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Email or phone is required",
        path: ["email"],
      });
    }
  });

export const patientPortalLoginSchema = z.object({
  identifier: z.string().trim().min(1).max(254),
  password: z.string().min(1).max(256),
});

export const patientPortalRefreshSchema = z.object({
  refreshToken: z.string().min(1),
});

export const patientPortalVerifyOtpSchema = z.object({
  challengeId: z.string().uuid(),
  code: z.string().trim().min(4).max(12),
});

export const patientPortalForgotPasswordSchema = z.object({
  identifier: z.string().trim().min(1).max(254),
});

export const patientPortalResetPasswordSchema = z.object({
  challengeId: z.string().uuid(),
  code: z.string().trim().min(4).max(12),
  newPassword: z.string().min(8).max(256),
});

export const patientPortalActivationSchema = z.object({
  activationCode: z.string().trim().min(8).max(256),
});

export const patientPortalMeSchema = z.object({
  id: z.string().uuid(),
  firstName: z.string(),
  lastName: z.string(),
  preferredLanguage: patientPortalLanguageSchema,
  email: z.string().email().nullable(),
  phone: z.string().nullable(),
  emailVerified: z.boolean(),
  phoneVerified: z.boolean(),
});

export type PatientPortalRegisterDto = z.infer<typeof patientPortalRegisterSchema>;
export type PatientPortalLoginDto = z.infer<typeof patientPortalLoginSchema>;
export type PatientPortalRefreshDto = z.infer<typeof patientPortalRefreshSchema>;
export type PatientPortalVerifyOtpDto = z.infer<typeof patientPortalVerifyOtpSchema>;
export type PatientPortalForgotPasswordDto = z.infer<typeof patientPortalForgotPasswordSchema>;
export type PatientPortalResetPasswordDto = z.infer<typeof patientPortalResetPasswordSchema>;
export type PatientPortalActivationDto = z.infer<typeof patientPortalActivationSchema>;
export type PatientPortalMeDto = z.infer<typeof patientPortalMeSchema>;
