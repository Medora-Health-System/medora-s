import { z } from "zod";
import { normalizeTotpCodeInput } from "./mfa-totp.util";

/** Strip spaces / non-digits so authenticator pastes like "123 456" validate. */
const totpCodeSchema = z
  .string()
  .trim()
  .transform((s) => normalizeTotpCodeInput(s) ?? "")
  .refine((d) => d.length === 6, { message: "INVALID_TOTP_FORMAT" });

const recoveryCodeSchema = z
  .string()
  .trim()
  .regex(/^[A-Z0-9-]{6,20}$/i, "RECOVERY_CODE_INVALID");

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
    challengeToken: z.string().min(1, "MFA_CHALLENGE_TOKEN_REQUIRED"),
    code: totpCodeSchema.optional(),
    recoveryCode: recoveryCodeSchema.optional(),
  })
  .refine((v) => Boolean(v.code) !== Boolean(v.recoveryCode), {
    message: "MFA_TOTP_OR_RECOVERY_REQUIRED",
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
