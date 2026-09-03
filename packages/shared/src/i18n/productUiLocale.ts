/**
 * MEDUI.ES.1B — Canonical product UI locale registry.
 *
 * This is NOT:
 * - Patient preferred language (`fr` / `en` / `ht` / `es` / `OTHER`)
 * - Medication catalog seed locale (`MedicationLocalizationLocale`)
 * - Registration packet / legal template locale
 * - External integration language
 *
 * Production supported set remains French + English. Do not add `es` until MEDUI.ES.1C.
 */

import { z } from "zod";

export const PRODUCT_UI_LANGUAGES = ["fr", "en"] as const;

export type ProductUiLanguage = (typeof PRODUCT_UI_LANGUAGES)[number];

/** Unauthenticated / unsupported-locale fallback for product UI. Not a catalog fill-in. */
export const PRODUCT_DEFAULT_UI_LANGUAGE: ProductUiLanguage = "en";

/**
 * Default stored on new facilities when admin does not choose a language.
 * Independent from {@link PRODUCT_DEFAULT_UI_LANGUAGE} (Haiti facilities are typically French).
 */
export const FACILITY_DEFAULT_LANGUAGE: ProductUiLanguage = "fr";

const PRODUCT_UI_LANGUAGE_ZOD_VALUES = ["fr", "en"] as [ProductUiLanguage, ...ProductUiLanguage[]];

export const productUiLanguageSchema = z.enum(PRODUCT_UI_LANGUAGE_ZOD_VALUES);

/** How catalog search / order labels pick EN vs FR stored fields. */
export type CatalogLabelStrategy = "en_strict" | "fr_preferred";

/**
 * Catalog clinical-display maps currently exist only for EN (FR→EN normalization)
 * and FR (pass-through). Bound explicitly per UI locale — never "not English → French".
 */
export type MedicationClinicalDisplayLocaleCode = "en" | "fr";

export type ProductUiLocaleDefinition = {
  code: ProductUiLanguage;
  /** BCP 47 tag for Intl date/number presentation. */
  bcp47: string;
  /** Selector chrome in that language (English / Français). */
  nativeLabel: string;
  catalogLabelStrategy: CatalogLabelStrategy;
  medicationClinicalDisplayLocale: MedicationClinicalDisplayLocaleCode;
};

export const PRODUCT_UI_LOCALE_REGISTRY: Record<ProductUiLanguage, ProductUiLocaleDefinition> = {
  en: {
    code: "en",
    bcp47: "en-US",
    nativeLabel: "English",
    catalogLabelStrategy: "en_strict",
    medicationClinicalDisplayLocale: "en",
  },
  fr: {
    code: "fr",
    bcp47: "fr-FR",
    nativeLabel: "Français",
    catalogLabelStrategy: "fr_preferred",
    medicationClinicalDisplayLocale: "fr",
  },
};

export function isProductUiLanguage(value: string | null | undefined): value is ProductUiLanguage {
  return value != null && (PRODUCT_UI_LANGUAGES as readonly string[]).includes(value);
}

/**
 * Parse a raw UI/header/storage value.
 * Accepts exact codes (`en`, `fr`) and BCP 47 prefixes (`en-US`, `fr-HT`).
 * Unknown values including `es` / `es-*` return null — Spanish is not a product UI locale yet.
 */
export function parseProductUiLanguage(raw: string | null | undefined): ProductUiLanguage | null {
  if (raw == null) return null;
  const norm = raw.trim().toLowerCase();
  if (!norm) return null;
  if (isProductUiLanguage(norm)) return norm;
  for (const code of PRODUCT_UI_LANGUAGES) {
    if (norm.startsWith(`${code}-`)) return code;
  }
  return null;
}

/** Locale-resolution boundary: unsupported/missing → product default (English). */
export function resolveProductUiLanguageOrDefault(raw: string | null | undefined): ProductUiLanguage {
  return parseProductUiLanguage(raw) ?? PRODUCT_DEFAULT_UI_LANGUAGE;
}

export function getProductUiLocaleDefinition(language: ProductUiLanguage): ProductUiLocaleDefinition {
  return PRODUCT_UI_LOCALE_REGISTRY[language];
}

export function productUiBcp47Tag(language: string | null | undefined): string {
  return PRODUCT_UI_LOCALE_REGISTRY[resolveProductUiLanguageOrDefault(language)].bcp47;
}

export function catalogLabelStrategyForProductUi(language: ProductUiLanguage): CatalogLabelStrategy {
  return PRODUCT_UI_LOCALE_REGISTRY[language].catalogLabelStrategy;
}

/**
 * Bilingual stored fields (`labelEn`/`labelFr`, `displayNameEn`/`displayNameFr`,
 * `cardTitleEn`/`cardTitleFr`, formulary alias `language`) are **legacy bilingual
 * storage** — not N-locale UI catalogs.
 *
 * Classification:
 * - A. legacy bilingual storage (these fields)
 * - B. UI translation content (`t()` / `printT` message catalogs)
 * - C. clinical terminology catalog (medication display maps)
 * - D. external/source catalog metadata (RxNorm, etc. — identity, not UI locale)
 *
 * Unsupported product UI locale (including future `es` before a Spanish catalog):
 * return `{ kind: "unsupported" }`. Never pick `labelFr`/`labelEn` and present it
 * as the missing language.
 */
export type BilingualStorageLocale = "en" | "fr";

export type BilingualStorageAdaptation =
  | { kind: "localized"; locale: BilingualStorageLocale }
  | { kind: "unsupported" };

export function adaptProductUiToBilingualStorageLocale(
  raw: string | null | undefined
): BilingualStorageAdaptation {
  const parsed = parseProductUiLanguage(raw);
  if (parsed === "en" || parsed === "fr") return { kind: "localized", locale: parsed };
  return { kind: "unsupported" };
}

/**
 * Product UI → medication clinical-display maps.
 * Exact for supported EN/FR. Unsupported (including `es`) is **not** mapped to EN or FR.
 */
export function adaptProductUiToMedicationClinicalDisplayLocale(
  raw: string | null | undefined
): BilingualStorageAdaptation {
  return adaptProductUiToBilingualStorageLocale(raw);
}

/**
 * Product UI → catalog label strategy.
 * `null` means do not treat stored EN/FR labels as localized for that locale.
 */
export function adaptProductUiToCatalogLabelStrategy(
  raw: string | null | undefined
): CatalogLabelStrategy | null {
  const parsed = parseProductUiLanguage(raw);
  if (!parsed) return null;
  return PRODUCT_UI_LOCALE_REGISTRY[parsed].catalogLabelStrategy;
}

export const LEGACY_BILINGUAL_STORAGE_FAMILIES = {
  labelEnFr: {
    family: "A" as const,
    fields: ["labelEn", "labelFr"],
    description: "Legacy bilingual storage for operational/catalog labels",
  },
  cardTitleEnFr: {
    family: "A" as const,
    fields: ["cardTitleEn", "cardTitleFr"],
    description: "Legacy bilingual storage for EDOC card titles",
  },
  displayNameEnFr: {
    family: "A" as const,
    fields: ["displayNameEn", "displayNameFr"],
    description: "Legacy bilingual storage for catalog display names",
  },
  formularyAliasLanguage: {
    family: "A" as const,
    fields: ["language"],
    description: "Formulary alias language tag on bilingual alias rows",
  },
  uiTranslationCatalog: {
    family: "B" as const,
    fields: ["en.ts", "fr.ts", "printT", "i18nMessage"],
    description: "UI translation content — active locale only",
  },
  medicationClinicalDisplayMaps: {
    family: "C" as const,
    fields: ["MedicationClinicalDisplayLocale"],
    description: "Clinical terminology catalog maps (EN/FR only until Spanish catalog phase)",
  },
  externalSourceCatalogMetadata: {
    family: "D" as const,
    fields: ["RxNorm", "code", "ndc"],
    description: "External/source catalog metadata — identity, not UI locale",
  },
} as const;

/**
 * Pick a legacy bilingual pair for a product UI locale.
 * Unsupported locales (including future `es`) return UNLOCALIZED_SOURCE using the
 * English stored field as canonical source text — never as a localized Spanish value.
 */
export function pickLegacyBilingualStoredPair(
  rawLocale: string | null | undefined,
  pair: { en: string; fr: string }
):
  | { kind: "localized"; locale: BilingualStorageLocale; value: string }
  | { kind: "unsupported"; value: string; source: "UNLOCALIZED_SOURCE" } {
  const adapted = adaptProductUiToBilingualStorageLocale(rawLocale);
  if (adapted.kind === "localized") {
    return { kind: "localized", locale: adapted.locale, value: pair[adapted.locale] };
  }
  return { kind: "unsupported", value: pair.en, source: "UNLOCALIZED_SOURCE" };
}

/** Explicit unlocalized catalog/report/billing label — never another Medora language. */
export const UNLOCALIZED_CATALOG_SOURCE = "UNLOCALIZED_SOURCE";

export type CatalogDisplayLabelFields = {
  displayNameEn?: string | null;
  displayNameFr?: string | null;
  code?: string | null;
};

/**
 * User-facing catalog label for the active product UI locale.
 * EN uses EN only; FR uses FR only. Missing localized text → code / UNLOCALIZED_SOURCE.
 * Explicit unsupported locale (including `es`) never receives EN or FR labels.
 * Omitted locale is the F-boundary: product default EN, then EN-only.
 */
export function pickCatalogDisplayLabelForProductUi(
  rawLocale: string | null | undefined,
  fields: CatalogDisplayLabelFields
): string {
  const parsed = parseProductUiLanguage(rawLocale);
  const code = fields.code?.trim() || "";
  const en = fields.displayNameEn?.trim() || "";
  const fr = fields.displayNameFr?.trim() || "";

  if (parsed === "en") return en || code || UNLOCALIZED_CATALOG_SOURCE;
  if (parsed === "fr") return fr || code || UNLOCALIZED_CATALOG_SOURCE;

  if (rawLocale != null && String(rawLocale).trim() !== "") {
    return code || UNLOCALIZED_CATALOG_SOURCE;
  }

  return en || code || UNLOCALIZED_CATALOG_SOURCE;
}

export function medicationClinicalDisplayLocaleForProductUi(
  language: ProductUiLanguage
): MedicationClinicalDisplayLocaleCode {
  return PRODUCT_UI_LOCALE_REGISTRY[language].medicationClinicalDisplayLocale;
}

export function productUiLanguageSelectOptions(): ReadonlyArray<{
  value: ProductUiLanguage;
  label: string;
}> {
  return PRODUCT_UI_LANGUAGES.map((code) => ({
    value: code,
    label: PRODUCT_UI_LOCALE_REGISTRY[code].nativeLabel,
  }));
}

/** Browser language tags → product UI locale. Caller decides whether to apply the result. */
export function resolveProductUiLanguageFromBrowserCandidates(
  candidates: readonly string[]
): ProductUiLanguage | null {
  for (const raw of candidates) {
    const parsed = parseProductUiLanguage(raw);
    if (parsed) return parsed;
  }
  return null;
}
