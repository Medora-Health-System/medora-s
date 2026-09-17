export type DigitalCareUiLanguage = "en" | "fr" | "es";

function normalizeLanguage(language?: string | null): DigitalCareUiLanguage {
  const value = (language ?? "").trim().toLowerCase();
  if (value.startsWith("es")) return "es";
  if (value.startsWith("fr")) return "fr";
  return "en";
}

export function currentDigitalCareUiLanguage(): DigitalCareUiLanguage {
  if (typeof document !== "undefined") {
    return normalizeLanguage(document.documentElement.lang);
  }
  return "en";
}

const GENERIC_RESULT_TITLES: Record<DigitalCareUiLanguage, Record<"LAB_TEST" | "IMAGING_STUDY", string>> = {
  en: { LAB_TEST: "Laboratory result", IMAGING_STUDY: "Imaging result" },
  fr: { LAB_TEST: "Résultat de laboratoire", IMAGING_STUDY: "Résultat d’imagerie" },
  es: { LAB_TEST: "Resultado de laboratorio", IMAGING_STUDY: "Resultado de imagen" },
};

const GENERIC_RESULT_TITLE_ALIASES = new Set([
  "laboratory result",
  "lab result",
  "resultado de laboratorio",
  "résultat de laboratoire",
  "resultat de laboratoire",
  "imaging result",
  "image result",
  "resultado de imagen",
  "resultado de imágenes",
  "résultat d’imagerie",
  "resultat d'imagerie",
  "resultat d’imagerie",
]);

const RESULT_CATEGORIES: Record<DigitalCareUiLanguage, Record<"LAB_TEST" | "IMAGING_STUDY" | "OTHER", string>> = {
  en: { LAB_TEST: "Lab", IMAGING_STUDY: "Imaging", OTHER: "Other" },
  fr: { LAB_TEST: "Laboratoire", IMAGING_STUDY: "Imagerie", OTHER: "Autre" },
  es: { LAB_TEST: "Laboratorio", IMAGING_STUDY: "Imagen", OTHER: "Otro" },
};

/**
 * API result titles are clinical data when a catalog/manual label exists, but older
 * records may carry an English generic fallback. Only those known generic fallbacks
 * are localized; authored clinical labels are preserved exactly as entered.
 */
export function localizeDigitalCareResultTitle(
  title: string | null | undefined,
  kind: string | null | undefined,
  language: string | null | undefined = currentDigitalCareUiLanguage(),
): string {
  const text = (title ?? "").trim();
  const locale = normalizeLanguage(language);
  const resultKind = kind === "LAB_TEST" || kind === "IMAGING_STUDY" ? kind : null;
  if (!resultKind) return text;
  if (!text || GENERIC_RESULT_TITLE_ALIASES.has(text.toLowerCase())) {
    return GENERIC_RESULT_TITLES[locale][resultKind];
  }
  return text;
}

export function localizeDigitalCareResultCategory(
  category: string | null | undefined,
  kind: string | null | undefined,
  language: string | null | undefined = currentDigitalCareUiLanguage(),
): string | undefined {
  const locale = normalizeLanguage(language);
  if (kind === "LAB_TEST" || kind === "IMAGING_STUDY") return RESULT_CATEGORIES[locale][kind];
  const text = (category ?? "").trim();
  if (!text) return undefined;
  if (/^(other|otro|autre)$/i.test(text)) return RESULT_CATEGORIES[locale].OTHER;
  return text;
}
