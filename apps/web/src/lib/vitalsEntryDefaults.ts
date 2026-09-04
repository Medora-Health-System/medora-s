import { resolveProductUiLanguageOrDefault } from "@/i18n/config";

export type VitalsEntryUnits = {
  tempInputUnit: "C" | "F";
  weightInputUnit: "kg" | "lb";
  heightInputMode: "cm" | "ftin";
};

const US_ENTRY_UNITS: VitalsEntryUnits = {
  tempInputUnit: "F",
  weightInputUnit: "lb",
  heightInputMode: "ftin",
};

const METRIC_ENTRY_UNITS: VitalsEntryUnits = {
  tempInputUnit: "C",
  weightInputUnit: "kg",
  heightInputMode: "cm",
};

/**
 * Default vitals *entry* units.
 * EN uses US customary. FR and ES each have an explicit metric default — ES is not the
 * `not-en` branch. Canonical stored vitals remain °C / kg / cm regardless of UI language.
 */
export function defaultVitalsEntryUnits(language: string): VitalsEntryUnits {
  const locale = resolveProductUiLanguageOrDefault(language);
  if (locale === "fr") return METRIC_ENTRY_UNITS;
  if (locale === "es") return METRIC_ENTRY_UNITS;
  return US_ENTRY_UNITS;
}
