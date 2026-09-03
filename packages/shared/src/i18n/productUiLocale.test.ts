import { describe, expect, it } from "vitest";
import {
  FACILITY_DEFAULT_LANGUAGE,
  PRODUCT_DEFAULT_UI_LANGUAGE,
  PRODUCT_UI_LANGUAGES,
  PRODUCT_UI_LOCALE_REGISTRY,
  catalogLabelStrategyForProductUi,
  adaptProductUiToBilingualStorageLocale,
  adaptProductUiToCatalogLabelStrategy,
  adaptProductUiToMedicationClinicalDisplayLocale,
  pickLegacyBilingualStoredPair,
  LEGACY_BILINGUAL_STORAGE_FAMILIES,
  isProductUiLanguage,
  parseProductUiLanguage,
  productUiBcp47Tag,
  productUiLanguageSchema,
  productUiLanguageSelectOptions,
  resolveProductUiLanguageFromBrowserCandidates,
  resolveProductUiLanguageOrDefault,
} from "./productUiLocale";

describe("product UI locale registry (MEDUI.ES.1B)", () => {
  it("keeps production languages as French and English only", () => {
    expect([...PRODUCT_UI_LANGUAGES]).toEqual(["fr", "en"]);
    expect(PRODUCT_DEFAULT_UI_LANGUAGE).toBe("en");
    expect(FACILITY_DEFAULT_LANGUAGE).toBe("fr");
    expect("es" in PRODUCT_UI_LOCALE_REGISTRY).toBe(false);
  });

  it("parses exact codes and BCP 47 prefixes without treating unknown as French", () => {
    expect(parseProductUiLanguage("en")).toBe("en");
    expect(parseProductUiLanguage("FR")).toBe("fr");
    expect(parseProductUiLanguage("en-US")).toBe("en");
    expect(parseProductUiLanguage("fr-HT")).toBe("fr");
    expect(parseProductUiLanguage("es")).toBeNull();
    expect(parseProductUiLanguage("es-MX")).toBeNull();
    expect(parseProductUiLanguage("ht")).toBeNull();
    expect(parseProductUiLanguage("not-a-locale")).toBeNull();
    expect(isProductUiLanguage("es")).toBe(false);
  });

  it("resolves unsupported values at the boundary to English product default", () => {
    expect(resolveProductUiLanguageOrDefault(undefined)).toBe("en");
    expect(resolveProductUiLanguageOrDefault("es")).toBe("en");
    expect(resolveProductUiLanguageOrDefault("fr")).toBe("fr");
  });

  it("maps Intl tags from the registry rather than not-en → fr", () => {
    expect(productUiBcp47Tag("en")).toBe("en-US");
    expect(productUiBcp47Tag("fr")).toBe("fr-FR");
    expect(productUiBcp47Tag("es")).toBe("en-US");
    expect(catalogLabelStrategyForProductUi("en")).toBe("en_strict");
    expect(catalogLabelStrategyForProductUi("fr")).toBe("fr_preferred");
  });

  it("does not auto-select Spanish from browser candidates", () => {
    expect(resolveProductUiLanguageFromBrowserCandidates(["es-419", "es"])).toBeNull();
    expect(resolveProductUiLanguageFromBrowserCandidates(["es-MX", "fr-FR"])).toBe("fr");
    expect(resolveProductUiLanguageFromBrowserCandidates(["en-GB"])).toBe("en");
  });

  it("exposes selector options from the registry", () => {
    expect(productUiLanguageSelectOptions()).toEqual([
      { value: "fr", label: "Français" },
      { value: "en", label: "English" },
    ]);
  });

  it("keeps Zod allowlist aligned with the registry", () => {
    expect(productUiLanguageSchema.options).toEqual(["fr", "en"]);
    expect(productUiLanguageSchema.safeParse("es").success).toBe(false);
    expect(productUiLanguageSchema.safeParse("fr").success).toBe(true);
  });

  it("medication and catalog adapters never map es to EN or FR content", () => {
    expect(adaptProductUiToMedicationClinicalDisplayLocale("en")).toEqual({
      kind: "localized",
      locale: "en",
    });
    expect(adaptProductUiToMedicationClinicalDisplayLocale("fr")).toEqual({
      kind: "localized",
      locale: "fr",
    });
    expect(adaptProductUiToMedicationClinicalDisplayLocale("es")).toEqual({ kind: "unsupported" });
    expect(adaptProductUiToMedicationClinicalDisplayLocale("es-MX")).toEqual({
      kind: "unsupported",
    });
    expect(adaptProductUiToBilingualStorageLocale("es")).toEqual({ kind: "unsupported" });
    expect(adaptProductUiToCatalogLabelStrategy("es")).toBeNull();
    expect(adaptProductUiToCatalogLabelStrategy("en")).toBe("en_strict");
    expect(adaptProductUiToCatalogLabelStrategy("fr")).toBe("fr_preferred");
  });

  it("legacy bilingual pick does not present EN/FR as Spanish", () => {
    expect(LEGACY_BILINGUAL_STORAGE_FAMILIES.labelEnFr.family).toBe("A");
    expect(LEGACY_BILINGUAL_STORAGE_FAMILIES.uiTranslationCatalog.family).toBe("B");
    expect(LEGACY_BILINGUAL_STORAGE_FAMILIES.medicationClinicalDisplayMaps.family).toBe("C");
    expect(LEGACY_BILINGUAL_STORAGE_FAMILIES.externalSourceCatalogMetadata.family).toBe("D");
    expect(pickLegacyBilingualStoredPair("en", { en: "English label", fr: "Libellé français" })).toEqual({
      kind: "localized",
      locale: "en",
      value: "English label",
    });
    expect(pickLegacyBilingualStoredPair("fr", { en: "English label", fr: "Libellé français" })).toEqual({
      kind: "localized",
      locale: "fr",
      value: "Libellé français",
    });
    expect(pickLegacyBilingualStoredPair("es", { en: "English label", fr: "Libellé français" })).toEqual({
      kind: "unsupported",
      value: "English label",
      source: "UNLOCALIZED_SOURCE",
    });
  });
});
