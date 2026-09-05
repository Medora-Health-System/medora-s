/**
 * MEDUI.MEDICATION_CATALOG.HOSPITAL_ORDERABILITY_AND_TDAP.1
 * Central vaccine manufacturer catalog — do not hardcode only in UI.
 */
import { pickProductUiCopy } from "../i18n/productUiLocale.js";

export type VaccineManufacturerId =
  | "sanofi_pasteur"
  | "glaxosmithkline"
  | "moderna"
  | "pfizer"
  | "merck"
  | "novavax"
  | "seqirus"
  | "astrazeneca"
  | "bavarian_nordic"
  | "dynavax"
  | "emergent_biosolutions"
  | "grifols"
  | "johnson_and_johnson"
  | "medimmune"
  | "unknown"
  | "other";

export type VaccineManufacturerEntry = {
  id: VaccineManufacturerId;
  labelEn: string;
  labelFr: string;
  labelEs: string;
};

export const VACCINE_MANUFACTURER_CATALOG: readonly VaccineManufacturerEntry[] = [
  { id: "sanofi_pasteur", labelEn: "Sanofi Pasteur", labelFr: "Sanofi Pasteur", labelEs: "Sanofi Pasteur" },
  { id: "glaxosmithkline", labelEn: "GlaxoSmithKline", labelFr: "GlaxoSmithKline", labelEs: "GlaxoSmithKline" },
  { id: "moderna", labelEn: "Moderna US, Inc.", labelFr: "Moderna US, Inc.", labelEs: "Moderna US, Inc." },
  { id: "pfizer", labelEn: "Pfizer, Inc.", labelFr: "Pfizer, Inc.", labelEs: "Pfizer, Inc." },
  { id: "merck", labelEn: "Merck and Co., Inc.", labelFr: "Merck and Co., Inc.", labelEs: "Merck and Co., Inc." },
  { id: "novavax", labelEn: "Novavax, Inc.", labelFr: "Novavax, Inc.", labelEs: "Novavax, Inc." },
  { id: "seqirus", labelEn: "Seqirus", labelFr: "Seqirus", labelEs: "Seqirus" },
  { id: "astrazeneca", labelEn: "AstraZeneca", labelFr: "AstraZeneca", labelEs: "AstraZeneca" },
  { id: "bavarian_nordic", labelEn: "Bavarian Nordic A/S", labelFr: "Bavarian Nordic A/S", labelEs: "Bavarian Nordic A/S" },
  { id: "dynavax", labelEn: "Dynavax, Inc.", labelFr: "Dynavax, Inc.", labelEs: "Dynavax, Inc." },
  { id: "emergent_biosolutions", labelEn: "Emergent BioSolutions", labelFr: "Emergent BioSolutions", labelEs: "Emergent BioSolutions" },
  { id: "grifols", labelEn: "Grifols", labelFr: "Grifols", labelEs: "Grifols" },
  { id: "johnson_and_johnson", labelEn: "Johnson and Johnson", labelFr: "Johnson and Johnson", labelEs: "Johnson and Johnson" },
  { id: "medimmune", labelEn: "MedImmune, Inc.", labelFr: "MedImmune, Inc.", labelEs: "MedImmune, Inc." },
  { id: "unknown", labelEn: "Unknown manufacturer", labelFr: "Fabricant inconnu", labelEs: "Fabricante desconocido" },
  { id: "other", labelEn: "Other manufacturer", labelFr: "Autre fabricant", labelEs: "Otro fabricante" },
] as const;

export function resolveVaccineManufacturerDisplay(
  entry: VaccineManufacturerEntry,
  locale: string | null | undefined
): string {
  return pickProductUiCopy(locale, { en: entry.labelEn, fr: entry.labelFr, es: entry.labelEs }, entry.labelEs);
}

export const VACCINE_MANUFACTURER_BY_ID: Record<VaccineManufacturerId, VaccineManufacturerEntry> =
  Object.fromEntries(VACCINE_MANUFACTURER_CATALOG.map((m) => [m.id, m])) as Record<
    VaccineManufacturerId,
    VaccineManufacturerEntry
  >;

export function vaccineManufacturerLabel(
  id: VaccineManufacturerId | "" | null | undefined,
  locale: string | null | undefined
): string {
  if (!id) return "";
  const entry = VACCINE_MANUFACTURER_BY_ID[id];
  if (!entry) return "";
  return resolveVaccineManufacturerDisplay(entry, locale);
}
