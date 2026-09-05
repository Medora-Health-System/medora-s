import { z } from "zod";

export const listDiagnosesQuerySchema = z.object({
  status: z.enum(["ACTIVE", "RESOLVED", "REMOVED"]).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
  offset: z.coerce.number().int().min(0).optional(),
  /** Canonical product UI locale (en|fr|es). Presentation only — never mutates stored description. */
  locale: z.string().trim().min(2).max(16).optional(),
});

export type ListDiagnosesQuery = z.infer<typeof listDiagnosesQuerySchema>;
