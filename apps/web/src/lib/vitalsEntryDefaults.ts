import type { SupportedLanguage } from "@/i18n/config";

export type VitalsEntryUnits = {
  tempInputUnit: "C" | "F";
  weightInputUnit: "kg" | "lb";
  heightInputMode: "cm" | "ftin";
};

/** Default entry units by UI locale (en → US customary for temp/weight/height). */
export function defaultVitalsEntryUnits(language: SupportedLanguage): VitalsEntryUnits {
  if (language === "en") {
    return { tempInputUnit: "F", weightInputUnit: "lb", heightInputMode: "ftin" };
  }
  return { tempInputUnit: "C", weightInputUnit: "kg", heightInputMode: "cm" };
}
