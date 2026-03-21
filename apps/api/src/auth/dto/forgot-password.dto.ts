import { z } from "zod";

export const forgotPasswordDtoSchema = z.object({
  email: z.string().email("Email invalide"),
});

export type ForgotPasswordDto = z.infer<typeof forgotPasswordDtoSchema>;
