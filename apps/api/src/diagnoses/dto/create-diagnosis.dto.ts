import { z } from "zod";

export const createDiagnosisDtoSchema = z.object({
  code: z.string().trim().min(1).max(64),
  description: z.string().max(2000).optional().nullable(),
  onsetDate: z.coerce.date().optional().nullable(),
  notes: z.string().max(4000).optional().nullable(),
});

export type CreateDiagnosisDto = z.infer<typeof createDiagnosisDtoSchema>;
