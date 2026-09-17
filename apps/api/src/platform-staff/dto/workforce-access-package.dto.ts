import { z } from "zod";

export const applyWorkforceAccessPackageSchema = z.object({
  reason: z.string().trim().min(3).max(500),
  ticketReference: z.string().trim().min(1).max(120).optional(),
});
