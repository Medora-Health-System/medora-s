import { z } from "zod";
import { PASSWORD_POLICY_HINT_FR, passwordMeetsPolicy, PASSWORD_MIN_LENGTH } from "@medora/shared";

export const resetPasswordDtoSchema = z.object({
  id: z.string().uuid("Identifiant de lien invalide"),
  token: z.string().min(1, "Token requis"),
  newPassword: z
    .string()
    .min(PASSWORD_MIN_LENGTH, PASSWORD_POLICY_HINT_FR)
    .refine(passwordMeetsPolicy, { message: PASSWORD_POLICY_HINT_FR }),
});

export type ResetPasswordDto = z.infer<typeof resetPasswordDtoSchema>;
