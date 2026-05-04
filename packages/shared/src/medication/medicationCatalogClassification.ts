import { z } from "zod";

/** Catalog `CatalogMedication.administrationType` — string storage, validated at edges. */
export const MEDICATION_ADMINISTRATION_TYPES = [
  "INFUSION",
  "PUSH",
  "ORAL",
  "IM",
  "SQ",
  "OTHER",
  "UNKNOWN",
] as const;

export type MedicationAdministrationType = (typeof MEDICATION_ADMINISTRATION_TYPES)[number];

export const medicationAdministrationTypeSchema = z.enum(MEDICATION_ADMINISTRATION_TYPES);

/** Catalog `CatalogMedication.billingClass` — suggestions / review only. */
export const MEDICATION_CATALOG_BILLING_CLASSES = [
  "HYDRATION",
  "THERAPEUTIC",
  "DRUG_SUPPLY",
  "UNKNOWN",
] as const;

export type MedicationBillingClass = (typeof MEDICATION_CATALOG_BILLING_CLASSES)[number];

export const medicationCatalogBillingClassSchema = z.enum(MEDICATION_CATALOG_BILLING_CLASSES);

export function parseMedicationAdministrationType(raw: string | null | undefined): MedicationAdministrationType | null {
  if (raw == null || typeof raw !== "string") return null;
  const t = raw.trim().toUpperCase();
  if (!t) return null;
  const r = medicationAdministrationTypeSchema.safeParse(t);
  return r.success ? r.data : null;
}

export function parseMedicationCatalogBillingClass(raw: string | null | undefined): MedicationBillingClass | null {
  if (raw == null || typeof raw !== "string") return null;
  const t = raw.trim().toUpperCase();
  if (!t) return null;
  const r = medicationCatalogBillingClassSchema.safeParse(t);
  return r.success ? r.data : null;
}
