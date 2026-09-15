import {
  resolveProductUiLanguageOrDefault,
  type ProductUiLanguage,
} from "@/i18n/config";

/**
 * Small presentation-only overrides used while Clinic Care reuses enterprise engines.
 * Keep these strings in the normal product-locale path so shared components never
 * hardcode English and Spanish/French facilities receive the same compact copy.
 */
const CLINIC_PRESENTATION_OVERRIDES: Record<ProductUiLanguage, Record<string, string>> = {
  en: {
    "clinicCareD4c7e.mar.emptyFacility": "No medication scheduled.",
  },
  fr: {
    "clinicCareD4c7e.mar.emptyFacility": "Aucun médicament programmé.",
  },
  es: {
    "clinicCareD4c7e.mar.emptyFacility": "No hay medicamentos programados.",
  },
};

export function resolveClinicPresentationOverride(
  language: string,
  key: string
): string | undefined {
  const locale = resolveProductUiLanguageOrDefault(language);
  return CLINIC_PRESENTATION_OVERRIDES[locale][key];
}
