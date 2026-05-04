import { z } from "zod";
import { medicationAdministrationTypeSchema, medicationCatalogBillingClassSchema } from "@medora/shared";

export const patchCatalogClassificationBodySchema = z
  .object({
    administrationType: z.union([medicationAdministrationTypeSchema, z.null()]).optional(),
    billingClass: z.union([medicationCatalogBillingClassSchema, z.null()]).optional(),
    reviewNote: z
      .string()
      .max(500)
      .optional()
      .transform((s) => {
        if (s === undefined) return undefined;
        const t = s.trim();
        return t.length ? t : undefined;
      }),
  })
  .strict()
  .refine((d) => d.administrationType !== undefined || d.billingClass !== undefined, {
    message: "Au moins un champ administrationType ou billingClass est requis.",
  });

export type PatchCatalogClassificationBody = z.infer<typeof patchCatalogClassificationBodySchema>;
