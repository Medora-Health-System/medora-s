import { z } from "zod";

export const loginDtoSchema = z
  .union([
    z.object({
      username: z.string().min(1),
      password: z.string().min(8)
    }),
    z.object({
      email: z.string().email(),
      password: z.string().min(8)
    })
  ])
  .transform((v) => ({
    username: "username" in v ? v.username : v.email,
    password: v.password
  }));

export type LoginDto = z.infer<typeof loginDtoSchema>;

