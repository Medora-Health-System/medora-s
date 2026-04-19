import { z } from "zod";

/**
 * Login accepts the current password as stored (legacy lengths). Strong policy applies to
 * change-password and reset-password only — see `password-policy.ts`.
 */
export const loginDtoSchema = z
  .union([
    z.object({
      username: z.string().min(1),
      password: z.string().min(1),
    }),
    z.object({
      email: z.string().email(),
      password: z.string().min(1),
    }),
  ])
  .transform((v) => ({
    username: "username" in v ? v.username : v.email,
    password: v.password,
  }));

export type LoginDto = z.infer<typeof loginDtoSchema>;

