import { z } from "zod";

export const reorderDiagnosesDtoSchema = z.object({
  /** Encounter diagnosis ids in desired order (first = principal / first-listed). */
  orderedIds: z.array(z.string().uuid()).min(1).max(200),
});

export type ReorderDiagnosesDto = z.infer<typeof reorderDiagnosesDtoSchema>;
