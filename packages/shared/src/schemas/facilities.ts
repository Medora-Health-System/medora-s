import { z } from "zod";

const optStr = (max: number) =>
  z
    .string()
    .max(max)
    .optional()
    .nullable()
    .transform((s) => (s == null || String(s).trim() === "" ? null : String(s).trim()));

function refineFacilityBillingNpi(d: { billingNpi?: string | null }, ctx: z.RefinementCtx) {
  if (d.billingNpi && !/^\d{10}$/.test(d.billingNpi)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Le NPI doit comporter 10 chiffres.",
      path: ["billingNpi"],
    });
  }
}

const facilityBillingIdentityFieldsSchema = z.object({
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
});

/** POST /admin/facilities — optional billing identity (same source of truth as PATCH billing/facility-identity). */
export const createFacilityDtoSchema = z
  .object({
    name: z.string().trim().min(1, "Le nom est requis.").max(200),
    defaultLanguage: z.enum(["fr", "en"]).optional().default("fr"),
  })
  .merge(facilityBillingIdentityFieldsSchema.partial())
  .superRefine(refineFacilityBillingNpi);

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

/** PATCH billing/facility-identity — Phase 7 (ADMIN / BILLING). */
export const facilityBillingIdentityPatchDtoSchema =
  facilityBillingIdentityFieldsSchema.superRefine(refineFacilityBillingNpi);

export type FacilityBillingIdentityPatchDto = z.infer<typeof facilityBillingIdentityPatchDtoSchema>;
