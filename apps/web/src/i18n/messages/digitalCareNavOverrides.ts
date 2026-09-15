import type { ProductUiLanguage } from "@/i18n/config";

const DIGITAL_CARE_NAV_COPY: Record<ProductUiLanguage, Record<string, string>> = {
  en: { "nav.digitalCare": "Digital Care" },
  fr: { "nav.digitalCare": "Soins numériques" },
  es: { "nav.digitalCare": "Atención Digital" },
};

export function resolveDigitalCareNavOverride(language: string, key: string): string | undefined {
  const lang = language === "fr" || language === "es" ? language : "en";
  return DIGITAL_CARE_NAV_COPY[lang][key];
}
