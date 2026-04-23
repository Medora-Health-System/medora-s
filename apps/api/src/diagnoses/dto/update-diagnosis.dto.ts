import { z } from "zod";
import { isIcd10CmLikeCodeFormat } from "@medora/shared";

export const updateDiagnosisDtoSchema = z
  .object({
    code: z.string().min(1).max(64).optional(),
    description: z.string().max(2000).optional().nullable(),
    onsetDate: z.coerce.date().optional().nullable(),
    notes: z.string().max(4000).optional().nullable(),
    /** Set to link this row to the ICD-10 catalog (code/description updated from catalog unless description sent). */
    icd10CatalogId: z.string().uuid().nullable().optional(),
    /** When true with `code`, marks the row as explicitly non-catalog. Clears `icd10CatalogId` when applied. */
    manualNonCatalog: z.boolean().optional(),
    sortOrder: z.number().int().min(0).max(9999).optional(),
  })
  .superRefine((data, ctx) => {
    if (typeof data.icd10CatalogId === "string" && data.icd10CatalogId.trim()) {
      return;
    }
    if (data.code === undefined || !data.code.trim()) return;
    if (!isIcd10CmLikeCodeFormat(data.code.trim())) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "code must match ICD-10-CM-like format (letter + two digits + optional extension)",
        path: ["code"],
      });
    }
  });

export type UpdateDiagnosisDto = z.infer<typeof updateDiagnosisDtoSchema>;
