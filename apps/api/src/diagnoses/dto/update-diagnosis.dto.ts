import { z } from "zod";

export const updateDiagnosisDtoSchema = z.object({
  code: z.string().min(1).max(64).optional(),
  description: z.string().max(2000).optional().nullable(),
  onsetDate: z.coerce.date().optional().nullable(),
  notes: z.string().max(4000).optional().nullable(),
});

export type UpdateDiagnosisDto = z.infer<typeof updateDiagnosisDtoSchema>;
