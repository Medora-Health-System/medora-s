import { z } from "zod";

export const resetPasswordDtoSchema = z.object({
  id: z.string().uuid("Identifiant de lien invalide"),
  token: z.string().min(1, "Token requis"),
  newPassword: z.string().min(8, "Le mot de passe doit contenir au moins 8 caractères"),
});

export type ResetPasswordDto = z.infer<typeof resetPasswordDtoSchema>;
