import { z } from "zod";

export const listDiagnosesQuerySchema = z.object({
  status: z.enum(["ACTIVE", "RESOLVED"]).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

export type ListDiagnosesQuery = z.infer<typeof listDiagnosesQuerySchema>;
