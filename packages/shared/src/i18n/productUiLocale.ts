/**
 * MEDUI.ES.1C / 1K — Canonical product UI locale registry.
 *
 * Internal recognition includes Spanish. After MEDUI.ES.1K, Español is publicly selectable.
 * Product default remains English. This is NOT patient preferred language.
 */

import { z } from "zod";

/** Internally recognized product UI locales, including hidden Spanish. */
export const PRODUCT_UI_LANGUAGES = ["fr", "en", "es"] as const;

export type ProductUiLanguage = (typeof PRODUCT_UI_LANGUAGES)[number];

/**
 * Locales shown in login / settings / facility selectors.
 * MEDUI.ES.1K: Español is publicly selectable. Product default remains English.
 */
export const PUBLICLY_SELECTABLE_PRODUCT_UI_LANGUAGES = ["fr", "en", "es"] as const;

export type PubliclySelectableProductUiLanguage =
  (typeof PUBLICLY_SELECTABLE_PRODUCT_UI_LANGUAGES)[number];

/** Unauthenticated / unsupported-locale fallback for product UI. Not a catalog fill-in. */
export const PRODUCT_DEFAULT_UI_LANGUAGE: PubliclySelectableProductUiLanguage = "en";

/**
 * Default stored on new facilities when admin does not choose a language.
 * Independent from {@link PRODUCT_DEFAULT_UI_LANGUAGE} (Haiti facilities are typically French).
 * Facility stored preference may be any publicly selectable product UI language.
 */
export const FACILITY_DEFAULT_LANGUAGE: PubliclySelectableProductUiLanguage = "fr";

/** Facility / user-facing stored language — EN / FR / ES after MEDUI.ES.1K. */
const PUBLIC_PRODUCT_UI_LANGUAGE_ZOD_VALUES = ["fr", "en", "es"] as [
  PubliclySelectableProductUiLanguage,
  ...PubliclySelectableProductUiLanguage[],
];

export const productUiLanguageSchema = z.enum(PUBLIC_PRODUCT_UI_LANGUAGE_ZOD_VALUES);

const INTERNAL_PRODUCT_UI_LANGUAGE_ZOD_VALUES = ["fr", "en", "es"] as [
  ProductUiLanguage,
  ...ProductUiLanguage[],
];

export const internalProductUiLanguageSchema = z.enum(INTERNAL_PRODUCT_UI_LANGUAGE_ZOD_VALUES);

/** Hidden Spanish catalog placeholder — never approved clinical Spanish. */
export const UNLOCALIZED_ES_PREFIX = "UNLOCALIZED_ES::";

export function hiddenSpanishPlaceholder(keyPath: string): string {
  return `${UNLOCALIZED_ES_PREFIX}${keyPath.trim()}`;
}

export function isHiddenSpanishPlaceholder(value: string): boolean {
  return value.startsWith(UNLOCALIZED_ES_PREFIX) && value.length > UNLOCALIZED_ES_PREFIX.length;
}

/** How catalog search / order labels pick EN vs FR stored fields. */
export type CatalogLabelStrategy = "en_strict" | "fr_preferred" | "unlocalized";

/**
 * Catalog clinical-display maps currently exist only for EN (FR→EN normalization)
 * and FR (pass-through). Bound explicitly per UI locale — never "not English → French".
 * Hidden Spanish has no clinical map yet (MEDUI.ES.1D).
 */
export type MedicationClinicalDisplayLocaleCode = "en" | "fr";

export type ProductUiLocaleDefinition = {
  code: ProductUiLanguage;
  /** BCP 47 tag for Intl date/number presentation. */
  bcp47: string;
  /** Native chrome label. */
  nativeLabel: string;
  catalogLabelStrategy: CatalogLabelStrategy;
  medicationClinicalDisplayLocale: MedicationClinicalDisplayLocaleCode | null;
  publiclySelectable: boolean;
};

export const PRODUCT_UI_LOCALE_REGISTRY: Record<ProductUiLanguage, ProductUiLocaleDefinition> = {
  en: {
    code: "en",
    bcp47: "en-US",
    nativeLabel: "English",
    catalogLabelStrategy: "en_strict",
    medicationClinicalDisplayLocale: "en",
    publiclySelectable: true,
  },
  fr: {
    code: "fr",
    bcp47: "fr-FR",
    nativeLabel: "Français",
    catalogLabelStrategy: "fr_preferred",
    medicationClinicalDisplayLocale: "fr",
    publiclySelectable: true,
  },
  es: {
    code: "es",
    bcp47: "es-419",
    nativeLabel: "Español",
    catalogLabelStrategy: "unlocalized",
    medicationClinicalDisplayLocale: null,
    publiclySelectable: true,
  },
};

export function isProductUiLanguage(value: string | null | undefined): value is ProductUiLanguage {
  return value != null && (PRODUCT_UI_LANGUAGES as readonly string[]).includes(value);
}

export function isPubliclySelectableProductUiLanguage(
  value: string | null | undefined
): value is PubliclySelectableProductUiLanguage {
  return (
    value != null && (PUBLICLY_SELECTABLE_PRODUCT_UI_LANGUAGES as readonly string[]).includes(value)
  );
}

/**
 * Parse a raw UI/header/storage value.
 * Accepts exact codes (`en`, `fr`, `es`) and BCP 47 prefixes (`en-US`, `fr-HT`, `es-MX`).
 * Unknown values return null. Parsed `es` is internal-only — public hydration must not apply it.
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

/**
 * Public product UI hydration. Unknown values → English default.
 * Parsed `es` hydrates to Spanish after MEDUI.ES.1K public enablement.
 */
export function resolvePublicProductUiLanguageOrDefault(
  raw: string | null | undefined
): PubliclySelectableProductUiLanguage {
  const parsed = parseProductUiLanguage(raw);
  if (parsed && isPubliclySelectableProductUiLanguage(parsed)) return parsed;
  return PRODUCT_DEFAULT_UI_LANGUAGE;
}

/**
 * Locale-resolution boundary.
 * Public `en`/`fr` inputs stay `en`/`fr` (overload — UI call sites do not widen to hidden `es`).
 * Parsed `es` stays `es`. Unknown/missing → product default English.
 * Public hydration must use {@link resolvePublicProductUiLanguageOrDefault}.
 */
export function resolveProductUiLanguageOrDefault(
  raw: PubliclySelectableProductUiLanguage
): PubliclySelectableProductUiLanguage;
export function resolveProductUiLanguageOrDefault(
  raw: string | null | undefined
): ProductUiLanguage;
export function resolveProductUiLanguageOrDefault(
  raw: string | null | undefined
): ProductUiLanguage {
  return parseProductUiLanguage(raw) ?? PRODUCT_DEFAULT_UI_LANGUAGE;
}

/**
 * Internal resolver: parsed `es` stays `es`. Unknown still defaults to English.
 */
export function resolveInternalProductUiLanguageOrDefault(
  raw: string | null | undefined
): ProductUiLanguage {
  return parseProductUiLanguage(raw) ?? PRODUCT_DEFAULT_UI_LANGUAGE;
}

export function getProductUiLocaleDefinition(language: ProductUiLanguage): ProductUiLocaleDefinition {
  return PRODUCT_UI_LOCALE_REGISTRY[language];
}

export function productUiBcp47Tag(language: string | null | undefined): string {
  return PRODUCT_UI_LOCALE_REGISTRY[resolveInternalProductUiLanguageOrDefault(language)].bcp47;
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
 * Exact for supported EN/FR. Hidden Spanish has no clinical map — never mapped to EN or FR.
 */
export function adaptProductUiToMedicationClinicalDisplayLocale(
  raw: string | null | undefined
): BilingualStorageAdaptation {
  return adaptProductUiToBilingualStorageLocale(raw);
}

/**
 * Product UI → catalog label strategy for bilingual EN/FR stored fields.
 * `null` means do not treat stored EN/FR labels as localized (hidden Spanish / unknown).
 */
export function adaptProductUiToCatalogLabelStrategy(
  raw: string | null | undefined
): "en_strict" | "fr_preferred" | null {
  const parsed = parseProductUiLanguage(raw);
  if (parsed === "en") return "en_strict";
  if (parsed === "fr") return "fr_preferred";
  return null;
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
    fields: ["en.ts", "fr.ts", "es.ts", "printT", "i18nMessage"],
    description: "UI translation content — active locale only (ES is hidden placeholders in 1C)",
  },
  medicationClinicalDisplayMaps: {
    family: "C" as const,
    fields: ["MedicationClinicalDisplayLocale"],
    description: "Clinical terminology catalog maps (EN/FR only; Spanish canon is MEDUI.ES.1D)",
  },
  externalSourceCatalogMetadata: {
    family: "D" as const,
    fields: ["RxNorm", "code", "ndc"],
    description: "External/source catalog metadata — identity, not UI locale",
  },
} as const;

/**
 * Pick a legacy bilingual pair for a product UI locale.
 * Hidden Spanish and other locales without EN/FR columns return UNLOCALIZED_SOURCE using the
 * Unsupported locales (including ES) never receive EN/FR as localized UI.
 * Callers must use `kind`/`source`, not treat `value` as Spanish.
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
  return { kind: "unsupported", value: "UNLOCALIZED_SOURCE", source: "UNLOCALIZED_SOURCE" };
}

/**
 * Pick UI chrome copy for the active product locale.
 * EN/FR are exact. ES uses `copy.es` when authored; otherwise `unresolvedEs`.
 * Never substitutes EN or FR as Spanish, and never substitutes FR as English.
 * Missing/unknown locale uses EN at the resolution boundary.
 */
export type ProductUiCopyMap<T> = { en: T; fr: T; es?: T };

export function pickProductUiCopy<TEn, TFr = TEn, TEs = TEn>(
  rawLocale: string | null | undefined,
  copy: { en: TEn; fr: TFr; es?: TEs },
  unresolvedEs: TEs
): TEn | TFr | TEs {
  const parsed = parseProductUiLanguage(rawLocale);
  if (parsed === "fr") return copy.fr;
  if (parsed === "es") return copy.es !== undefined ? copy.es : unresolvedEs;
  return copy.en;
}

/** Adapt product UI locale onto legacy EN/FR storage/search columns. ES → English identity, never French. */
export function bilingualStorageLocaleOrEn(raw: string | null | undefined): "en" | "fr" {
  const adapted = adaptProductUiToBilingualStorageLocale(raw);
  return adapted.kind === "localized" ? adapted.locale : "en";
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
 * Hidden Spanish (`es`) never receives EN or FR labels.
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
): MedicationClinicalDisplayLocaleCode | null {
  return PRODUCT_UI_LOCALE_REGISTRY[language].medicationClinicalDisplayLocale;
}

export function productUiLanguageSelectOptions(): ReadonlyArray<{
  value: PubliclySelectableProductUiLanguage;
  label: string;
}> {
  return PUBLICLY_SELECTABLE_PRODUCT_UI_LANGUAGES.map((code) => ({
    value: code,
    label: PRODUCT_UI_LOCALE_REGISTRY[code].nativeLabel,
  }));
}

/**
 * Browser language tags → publicly selectable product UI locale.
 * Spanish browser tags are ignored so existing users are not auto-switched to Español.
 */
export function resolveProductUiLanguageFromBrowserCandidates(
  candidates: readonly string[]
): PubliclySelectableProductUiLanguage | null {
  for (const raw of candidates) {
    const parsed = parseProductUiLanguage(raw);
    if (parsed === "es") continue;
    if (parsed && isPubliclySelectableProductUiLanguage(parsed)) return parsed;
  }
  return null;
}
