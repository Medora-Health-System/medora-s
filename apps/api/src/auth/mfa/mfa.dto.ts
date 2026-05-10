import { z } from "zod";

const totpCodeSchema = z
  .string()
  .trim()
  .regex(/^\d{6}$/, "Le code à 6 chiffres est requis.");

const recoveryCodeSchema = z
  .string()
  .trim()
  .regex(
    /^[A-Z0-9-]{6,20}$/i,
    "Code de récupération invalide."
  );

export const mfaEnrollInitDtoSchema = z.object({
  /** Optional enrollment grant token (used when login forced MFA enrollment). */
  enrollmentToken: z.string().min(1).optional(),
});
export type MfaEnrollInitDto = z.infer<typeof mfaEnrollInitDtoSchema>;

export const mfaEnrollVerifyDtoSchema = z.object({
  code: totpCodeSchema,
  enrollmentToken: z.string().min(1).optional(),
});
export type MfaEnrollVerifyDto = z.infer<typeof mfaEnrollVerifyDtoSchema>;

export const mfaLoginVerifyDtoSchema = z
  .object({
    challengeToken: z.string().min(1, "Jeton de défi requis."),
    code: totpCodeSchema.optional(),
    recoveryCode: recoveryCodeSchema.optional(),
  })
  .refine((v) => Boolean(v.code) !== Boolean(v.recoveryCode), {
    message: "Fournir soit un code TOTP, soit un code de récupération.",
  });
export type MfaLoginVerifyDto = z.infer<typeof mfaLoginVerifyDtoSchema>;

export const mfaDisableDtoSchema = z.object({
  code: totpCodeSchema,
});
export type MfaDisableDto = z.infer<typeof mfaDisableDtoSchema>;

export const mfaRegenerateRecoveryCodesDtoSchema = z.object({
  code: totpCodeSchema,
});
export type MfaRegenerateRecoveryCodesDto = z.infer<
  typeof mfaRegenerateRecoveryCodesDtoSchema
>;

export const adminMfaResetDtoSchema = z.object({
  userId: z.string().uuid("Identifiant utilisateur invalide."),
});
export type AdminMfaResetDto = z.infer<typeof adminMfaResetDtoSchema>;
