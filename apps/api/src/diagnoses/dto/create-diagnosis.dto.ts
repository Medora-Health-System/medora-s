import { z } from "zod";
import { isIcd10CmLikeCodeFormat } from "@medora/shared";

export const createDiagnosisDtoSchema = z
  .object({
    /** Required unless `icd10CatalogId` is set (catalog supplies the code). */
    code: z.string().trim().max(64).optional(),
    description: z.string().max(2000).optional().nullable(),
    onsetDate: z.coerce.date().optional().nullable(),
    notes: z.string().max(4000).optional().nullable(),
    /** Pick a row from `Icd10DiagnosisCode` — primary structured path (ER-1). */
    icd10CatalogId: z.string().uuid().optional(),
    /**
     * When true, `code` is required and stored as explicitly non-catalog (not ICD-validated).
     * Mutually exclusive with `icd10CatalogId`.
     */
    manualNonCatalog: z.boolean().optional(),
    /** Optional encounter ordering hint; otherwise appended after current max `sortOrder`. */
    sortOrder: z.number().int().min(0).max(9999).optional(),
  })
  .superRefine((data, ctx) => {
    const cat = data.icd10CatalogId?.trim();
    const manual = data.manualNonCatalog === true;
    if (cat && manual) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "icd10CatalogId and manualNonCatalog cannot be used together",
        path: ["manualNonCatalog"],
      });
    }
    if (cat) return;
    if (manual) {
      if (!data.code?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "code is required when manualNonCatalog is true",
          path: ["code"],
        });
        return;
      }
      const mc = data.code.trim();
      if (!isIcd10CmLikeCodeFormat(mc)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "code must match ICD-10-CM-like format (letter + two digits + optional extension)",
          path: ["code"],
        });
      }
      return;
    }
    if (!data.code?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "code is required when not using icd10CatalogId",
        path: ["code"],
      });
      return;
    }
    const c = data.code.trim();
    if (!isIcd10CmLikeCodeFormat(c)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "code must match ICD-10-CM-like format (letter + two digits + optional extension)",
        path: ["code"],
      });
    }
  });

export type CreateDiagnosisDto = z.infer<typeof createDiagnosisDtoSchema>;
