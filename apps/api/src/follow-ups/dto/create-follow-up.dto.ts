import { z } from "zod";

export const createFollowUpDtoSchema = z.object({
  patientId: z.string().uuid(),
  encounterId: z.string().uuid().optional().nullable(),
  dueDate: z.coerce.date(),
  reason: z.string().min(1, "Le motif est requis").max(2000),
  notes: z.string().max(4000).optional().nullable(),
});

export type CreateFollowUpDto = z.infer<typeof createFollowUpDtoSchema>;
