import { z } from "zod";

export const updateDiagnosisDtoSchema = z.object({
  code: z.string().min(1).max(64).optional(),
  description: z.string().max(2000).optional().nullable(),
  onsetDate: z.coerce.date().optional().nullable(),
  notes: z.string().max(4000).optional().nullable(),
  /** Set to link this row to the ICD-10 catalog (code/description updated from catalog unless description sent). */
  icd10CatalogId: z.string().uuid().nullable().optional(),
  /** When true with `code`, marks the row as explicitly non-catalog. Clears `icd10CatalogId` when applied. */
  manualNonCatalog: z.boolean().optional(),
  sortOrder: z.number().int().min(0).max(9999).optional(),
});

export type UpdateDiagnosisDto = z.infer<typeof updateDiagnosisDtoSchema>;
