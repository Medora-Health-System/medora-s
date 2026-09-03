/**
 * Clinical product UI locale surface.
 * Canonical definitions live in `@medora/shared` (`productUiLocale`).
 * MEDUI.ES.1B keeps the supported set as French + English only.
 */

export {
  FACILITY_DEFAULT_LANGUAGE,
  PRODUCT_DEFAULT_UI_LANGUAGE,
  PRODUCT_DEFAULT_UI_LANGUAGE as defaultLanguage,
  PRODUCT_DEFAULT_UI_LANGUAGE as productDefaultLocale,
  PRODUCT_UI_LANGUAGES as supportedLanguages,
  PRODUCT_UI_LOCALE_REGISTRY,
  catalogLabelStrategyForProductUi,
  adaptProductUiToBilingualStorageLocale,
  adaptProductUiToCatalogLabelStrategy,
  adaptProductUiToMedicationClinicalDisplayLocale,
  pickLegacyBilingualStoredPair,
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
  resolveProductUiLanguageOrDefault,
  type ProductUiLanguage as SupportedLanguage,
  type ProductUiLocaleDefinition,
} from "@medora/shared";
