/**
 * Resolve certification finding display text from the active Medora application locale.
 * Never fall back English → French. Never treat patient language as UI locale.
 */

import { resolveChartCertificationLocalizationKeys } from "@medora/shared";
import type { SupportedLanguage } from "@/i18n/config";

export type CertificationDeficiencyDisplayInput = {
  title: string;
  description: string;
  titleKey?: string | null;
  descriptionKey?: string | null;
  stableCode?: string | null;
};

function translateOrNull(t: (key: string) => string, key: string | null | undefined): string | null {
  if (!key) return null;
  const value = t(key);
  if (!value || value === key) return null;
  return value;
}

/**
 * Resolve title + description for one certification finding card.
 * Order: active-locale key → mapped stable-code key → English fallback fields → localization error.
 * English locale never uses French catalogs or French API messages.
 */
export function resolveCertificationDeficiencyDisplay(
  t: (key: string) => string,
  language: SupportedLanguage,
  deficiency: CertificationDeficiencyDisplayInput
): { title: string; description: string } {
  const mapped = resolveChartCertificationLocalizationKeys(deficiency.stableCode);

  const titleFromKey =
    translateOrNull(t, deficiency.titleKey) ??
    translateOrNull(t, mapped?.titleKey) ??
    null;

  const descriptionFromKey =
    translateOrNull(t, deficiency.descriptionKey) ??
    translateOrNull(t, mapped?.descriptionKey) ??
    null;

  if (language === "en") {
    return {
      title: titleFromKey ?? mapped?.fallbackTitleEn ?? deficiency.title ?? "Certification finding",
      description:
        descriptionFromKey ??
        mapped?.fallbackDescriptionEn ??
        // English-safe server fallback only (must never be a French API message).
        deficiency.description ??
        "Localization incomplete for this finding.",
    };
  }

  // French: prefer FR keys; established app policy allows English fallback when FR missing.
  return {
    title:
      titleFromKey ??
      mapped?.fallbackTitleEn ??
      deficiency.title ??
      "Constat de certification",
    description:
      descriptionFromKey ??
      mapped?.fallbackDescriptionEn ??
      deficiency.description ??
      "Traduction manquante pour ce constat.",
  };
}

/** Detect likely French certification UI leakage in English locale (tests/dev only). */
export function looksLikeFrenchCertificationUiText(text: string): boolean {
  return /\b(le|la|les|des|une|documentez|manquante?|sortie|consignes|préparation|suivez)\b/i.test(
    text
  );
}
