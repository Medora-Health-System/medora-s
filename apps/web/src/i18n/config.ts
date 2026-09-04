/**
 * Clinical product UI locale surface.
 * Canonical definitions live in `@medora/shared` (`productUiLocale`).
 * MEDUI.ES.1C: `es` is internally recognized. MEDUI.ES.1K: Español is publicly selectable.
 */

export {
  FACILITY_DEFAULT_LANGUAGE,
  PRODUCT_DEFAULT_UI_LANGUAGE,
  PRODUCT_DEFAULT_UI_LANGUAGE as defaultLanguage,
  PRODUCT_DEFAULT_UI_LANGUAGE as productDefaultLocale,
  PRODUCT_UI_LANGUAGES as supportedLanguages,
  PUBLICLY_SELECTABLE_PRODUCT_UI_LANGUAGES,
  PRODUCT_UI_LOCALE_REGISTRY,
  UNLOCALIZED_ES_PREFIX,
  catalogLabelStrategyForProductUi,
  adaptProductUiToBilingualStorageLocale,
  adaptProductUiToCatalogLabelStrategy,
  adaptProductUiToMedicationClinicalDisplayLocale,
  hiddenSpanishPlaceholder,
  isHiddenSpanishPlaceholder,
  isPubliclySelectableProductUiLanguage,
  pickLegacyBilingualStoredPair,
  pickProductUiCopy,
  bilingualStorageLocaleOrEn,
  pickCatalogDisplayLabelForProductUi,
  UNLOCALIZED_CATALOG_SOURCE,
  LEGACY_BILINGUAL_STORAGE_FAMILIES,
  getProductUiLocaleDefinition,
  isProductUiLanguage,
  medicationClinicalDisplayLocaleForProductUi,
  parseProductUiLanguage,
  productUiBcp47Tag,
  productUiLanguageSelectOptions,
  resolveProductUiLanguageFromBrowserCandidates,
  resolveInternalProductUiLanguageOrDefault,
  resolveProductUiLanguageOrDefault,
  resolvePublicProductUiLanguageOrDefault,
  type ProductUiLanguage,
  type PubliclySelectableProductUiLanguage as SupportedLanguage,
  type ProductUiLocaleDefinition,
} from "@medora/shared";
