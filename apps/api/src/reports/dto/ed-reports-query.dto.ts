import { z } from "zod";

export const edReportsQuerySchema = z.object({
  from: z.string().trim().min(8).max(40),
  to: z.string().trim().min(8).max(40),
  providerId: z.string().uuid().optional(),
  export: z.enum(["csv", "json"]).optional().default("json"),
});

export type EdReportsQueryDto = z.infer<typeof edReportsQuerySchema>;
