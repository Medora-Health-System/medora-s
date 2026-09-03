/**
 * Resolve certification finding display text from the active Medora application locale.
 * Never fall back English → French or French → English. Never treat patient language as UI locale.
 */

import { parseProductUiLanguage, resolveChartCertificationLocalizationKeys } from "@medora/shared";

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

function unlocalizedFindingLabel(
  deficiency: CertificationDeficiencyDisplayInput,
  mappedKey: string | null | undefined,
  explicitKey: string | null | undefined
): string {
  const key = explicitKey?.trim() || mappedKey?.trim();
  if (key) return key;
  const code = deficiency.stableCode?.trim();
  if (code) return code;
  return "UNLOCALIZED_SOURCE";
}

/**
 * Resolve title + description for one certification finding card.
 * Active locale only: EN keys/English-only mapped copy; FR keys only.
 * Missing localized copy → key path / stable code. Never the other language.
 */
export function resolveCertificationDeficiencyDisplay(
  t: (key: string) => string,
  language: string,
  deficiency: CertificationDeficiencyDisplayInput
): { title: string; description: string } {
  const parsed = parseProductUiLanguage(language);
  const mapped = resolveChartCertificationLocalizationKeys(deficiency.stableCode);

  const titleFromKey =
    translateOrNull(t, deficiency.titleKey) ?? translateOrNull(t, mapped?.titleKey) ?? null;
  const descriptionFromKey =
    translateOrNull(t, deficiency.descriptionKey) ??
    translateOrNull(t, mapped?.descriptionKey) ??
    null;

  const unlocalizedTitle = unlocalizedFindingLabel(deficiency, mapped?.titleKey, deficiency.titleKey);
  const unlocalizedDescription = unlocalizedFindingLabel(
    deficiency,
    mapped?.descriptionKey,
    deficiency.descriptionKey
  );

  if (parsed === "en") {
    return {
      title: titleFromKey ?? mapped?.fallbackTitleEn ?? unlocalizedTitle,
      description: descriptionFromKey ?? mapped?.fallbackDescriptionEn ?? unlocalizedDescription,
    };
  }

  if (parsed === "fr") {
    return {
      title: titleFromKey ?? unlocalizedTitle,
      description: descriptionFromKey ?? unlocalizedDescription,
    };
  }

  return {
    title: unlocalizedTitle,
    description: unlocalizedDescription,
  };
}

/** Detect likely French certification UI leakage in English locale (tests/dev only). */
export function looksLikeFrenchCertificationUiText(text: string): boolean {
  return /\b(le|la|les|des|une|documentez|manquante?|sortie|consignes|préparation|suivez)\b/i.test(
    text
  );
}
