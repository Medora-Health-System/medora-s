import { z } from "zod";
import { billingClassificationSchema } from "../encounters/billingClassification.js";
import {
  facilityBillingClassificationModeSchema,
  facilityBillingWorkflowPatchDtoSchema,
} from "../encounters/facilityBillingWorkflow.js";
import { MEDORA_FACILITY_TYPE_REGISTRY } from "../auth/facilityTypeRegistry.js";

export { facilityBillingWorkflowPatchDtoSchema };

const medoraFacilityTypeSchema = z.enum([
  "HOSPITAL",
  "FREESTANDING_ER",
  "URGENT_CARE",
  "CLINIC",
  "OUTSIDE_LABORATORY",
  "OUTSIDE_RADIOLOGY",
  "OUTSIDE_PHARMACY",
]);

const medoraServiceLineSchema = z.enum([
  "EMERGENCY",
  "ICU",
  "MEDSURG",
  "OBSERVATION",
  "OBGYN",
  "PEDIATRICS",
  "BEHAVIORAL_HEALTH",
  "TELEMETRY",
  "LABORATORY",
  "RADIOLOGY",
  "PHARMACY",
  "CLINIC",
  "URGENT_CARE",
]);

export const MEDORA_FACILITY_TYPE_CODES = MEDORA_FACILITY_TYPE_REGISTRY.map((entry) => entry.code);

const facilityBillingWorkflowCreateFieldsSchema = z.object({
  billingClassificationMode: facilityBillingClassificationModeSchema.optional().nullable(),
  allowedEncounterBillingClassifications: z.array(billingClassificationSchema).optional(),
  allowUrgentCareToEmergencyUpgrade: z.boolean().optional(),
  requireUcToEdPatientAcknowledgement: z.boolean().optional(),
  showEncounterBillingControls: z.boolean().optional(),
});

const optStr = (max: number) =>
  z
    .string()
    .max(max)
    .optional()
    .nullable()
    .transform((s) => (s == null || String(s).trim() === "" ? null : String(s).trim()));

const facilityOptionalModulesSchema = z.object({
  laboratory: z.boolean().optional(),
  radiology: z.boolean().optional(),
  pharmacy: z.boolean().optional(),
  publicHealth: z.boolean().optional(),
  billing: z.boolean().optional(),
});

const facilityOperationalAddressSchema = z
  .object({
    line1: optStr(512),
    line2: optStr(512),
    city: optStr(256),
    stateProvince: optStr(128),
    postalCode: optStr(32),
    country: optStr(128),
    phone: optStr(64),
  })
  .partial();

/** MEDUI.D4C.1 — ambulatory care profile + operational address / print identity. */
const facilityCareProfileFieldsSchema = z.object({
  careProfile: z
    .enum([
      "CLINIC",
      "URGENT_CARE",
      "CLINIC_AND_URGENT_CARE",
      "FREESTANDING_ER",
      "HOSPITAL",
      "OUTSIDE_DIAGNOSTIC",
    ])
    .optional()
    .nullable(),
  ambulatoryOperatingMode: z
    .enum(["CLINIC", "URGENT_CARE", "CLINIC_AND_URGENT_CARE"])
    .optional()
    .nullable(),
  ambulatorySubtype: z
    .enum([
      "PRIMARY_CARE_CLINIC",
      "SPECIALTY_CLINIC",
      "URGENT_CARE_CENTER",
      "HYBRID_CLINIC_UC",
    ])
    .optional()
    .nullable(),
  optionalModules: facilityOptionalModulesSchema.optional().nullable(),
  operationalAddress: facilityOperationalAddressSchema.optional().nullable(),
  printDisplayName: optStr(512),
  timezone: optStr(64),
});

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
    facilityType: medoraFacilityTypeSchema.optional().default("CLINIC"),
    serviceLines: z.array(medoraServiceLineSchema).optional(),
  })
  .merge(facilityBillingIdentityFieldsSchema.partial())
  .merge(facilityBillingWorkflowCreateFieldsSchema.partial())
  .merge(facilityCareProfileFieldsSchema.partial())
  .superRefine(refineFacilityBillingNpi);

/** PATCH /admin/facilities/:id/service-config — facility type, service lines, D4C.1 care profile. */
export const updateFacilityServiceConfigDtoSchema = z
  .object({
    facilityType: medoraFacilityTypeSchema.optional(),
    serviceLines: z.array(medoraServiceLineSchema).optional().nullable(),
    resetToTypeDefaults: z.boolean().optional(),
  })
  .merge(facilityCareProfileFieldsSchema.partial());

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
export type UpdateFacilityServiceConfigDto = z.infer<typeof updateFacilityServiceConfigDtoSchema>;
export type FacilityDto = z.infer<typeof facilityDtoSchema>;
export type SetFacilityActiveDto = z.infer<typeof setFacilityActiveDtoSchema>;
export type SetFacilityLanguageDto = z.infer<typeof setFacilityLanguageDtoSchema>;

/** PATCH billing/facility-identity — Phase 7 (ADMIN / BILLING). */
export const facilityBillingIdentityPatchDtoSchema =
  facilityBillingIdentityFieldsSchema.superRefine(refineFacilityBillingNpi);

export type FacilityBillingIdentityPatchDto = z.infer<typeof facilityBillingIdentityPatchDtoSchema>;
