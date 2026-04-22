import { z } from "zod";

/** POST /admin/facilities */
export const createFacilityDtoSchema = z.object({
  name: z.string().trim().min(1, "Le nom est requis.").max(200),
  defaultLanguage: z.enum(["fr", "en"]).optional().default("fr"),
});

export const facilityDtoSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
});

/** PATCH /admin/facilities/:id */
export const setFacilityActiveDtoSchema = z.object({
  isActive: z.boolean(),
});

/** PATCH /admin/facilities/:id/language */
export const setFacilityLanguageDtoSchema = z.object({
  defaultLanguage: z.enum(["fr", "en"]),
});

export type CreateFacilityDto = z.infer<typeof createFacilityDtoSchema>;
export type FacilityDto = z.infer<typeof facilityDtoSchema>;
export type SetFacilityActiveDto = z.infer<typeof setFacilityActiveDtoSchema>;
export type SetFacilityLanguageDto = z.infer<typeof setFacilityLanguageDtoSchema>;

const optStr = (max: number) =>
  z
    .string()
    .max(max)
    .optional()
    .nullable()
    .transform((s) => (s == null || String(s).trim() === "" ? null : String(s).trim()));

/** PATCH billing/facility-identity — Phase 7 (ADMIN / BILLING). */
export const facilityBillingIdentityPatchDtoSchema = z.object({
  billingLegalName: optStr(512),
  billingNpi: z
    .string()
    .max(10)
    .optional()
    .nullable()
    .transform((s) => (s == null || String(s).trim() === "" ? null : String(s).trim().replace(/\D/g, "").slice(0, 10))),
  taxIdEin: optStr(32),
  billingAddressLine1: optStr(512),
  billingAddressLine2: optStr(512),
  billingCity: optStr(256),
  billingStateProvince: optStr(128),
  billingPostalCode: optStr(32),
  billingCountry: optStr(128),
  billingFacilityTypeLabel: optStr(256),
})
  .superRefine((d, ctx) => {
    if (d.billingNpi && !/^\d{10}$/.test(d.billingNpi)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Le NPI doit comporter 10 chiffres.",
        path: ["billingNpi"],
      });
    }
  });

export type FacilityBillingIdentityPatchDto = z.infer<typeof facilityBillingIdentityPatchDtoSchema>;
