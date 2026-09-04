import { describe, expect, it } from "vitest";
import {
  FACILITY_DEFAULT_LANGUAGE,
  PRODUCT_DEFAULT_UI_LANGUAGE,
  PRODUCT_UI_LANGUAGES,
  PUBLICLY_SELECTABLE_PRODUCT_UI_LANGUAGES,
  PRODUCT_UI_LOCALE_REGISTRY,
  catalogLabelStrategyForProductUi,
  adaptProductUiToBilingualStorageLocale,
  adaptProductUiToCatalogLabelStrategy,
  adaptProductUiToMedicationClinicalDisplayLocale,
  hiddenSpanishPlaceholder,
  isHiddenSpanishPlaceholder,
  isPubliclySelectableProductUiLanguage,
  pickLegacyBilingualStoredPair,
  pickCatalogDisplayLabelForProductUi,
  UNLOCALIZED_CATALOG_SOURCE,
  UNLOCALIZED_ES_PREFIX,
  LEGACY_BILINGUAL_STORAGE_FAMILIES,
  isProductUiLanguage,
  parseProductUiLanguage,
  productUiBcp47Tag,
  productUiLanguageSchema,
  internalProductUiLanguageSchema,
  productUiLanguageSelectOptions,
  resolveProductUiLanguageFromBrowserCandidates,
  resolveInternalProductUiLanguageOrDefault,
  resolveProductUiLanguageOrDefault,
  resolvePublicProductUiLanguageOrDefault,
} from "./productUiLocale";

describe("product UI locale registry (MEDUI.ES.1C → 1K)", () => {
  it("recognizes Spanish internally and publicly after 1K enablement; default remains English", () => {
    expect([...PRODUCT_UI_LANGUAGES]).toEqual(["fr", "en", "es"]);
    expect([...PUBLICLY_SELECTABLE_PRODUCT_UI_LANGUAGES]).toEqual(["fr", "en", "es"]);
    expect(PRODUCT_DEFAULT_UI_LANGUAGE).toBe("en");
    expect(FACILITY_DEFAULT_LANGUAGE).toBe("fr");
    expect("es" in PRODUCT_UI_LOCALE_REGISTRY).toBe(true);
    expect(PRODUCT_UI_LOCALE_REGISTRY.es.publiclySelectable).toBe(true);
    expect(isPubliclySelectableProductUiLanguage("es")).toBe(true);
    expect(isProductUiLanguage("es")).toBe(true);
  });

  it("parses exact codes and BCP 47 prefixes including hidden Spanish", () => {
    expect(parseProductUiLanguage("en")).toBe("en");
    expect(parseProductUiLanguage("FR")).toBe("fr");
    expect(parseProductUiLanguage("en-US")).toBe("en");
    expect(parseProductUiLanguage("fr-HT")).toBe("fr");
    expect(parseProductUiLanguage("es")).toBe("es");
    expect(parseProductUiLanguage("es-MX")).toBe("es");
    expect(parseProductUiLanguage("ht")).toBeNull();
    expect(parseProductUiLanguage("not-a-locale")).toBeNull();
  });

  it("resolves missing/unknown at the boundary to English; valid es stays es internally", () => {
    expect(resolveProductUiLanguageOrDefault(undefined)).toBe("en");
    expect(resolveProductUiLanguageOrDefault("de")).toBe("en");
    expect(resolveProductUiLanguageOrDefault("es")).toBe("es");
    expect(resolveInternalProductUiLanguageOrDefault("es")).toBe("es");
    expect(resolveProductUiLanguageOrDefault("fr")).toBe("fr");
    expect(resolvePublicProductUiLanguageOrDefault("es")).toBe("es");
    expect(resolvePublicProductUiLanguageOrDefault("es-419")).toBe("es");
    expect(resolvePublicProductUiLanguageOrDefault("fr")).toBe("fr");
  });

  it("maps Intl tags from the registry rather than not-en → fr", () => {
    expect(productUiBcp47Tag("en")).toBe("en-US");
    expect(productUiBcp47Tag("fr")).toBe("fr-FR");
    expect(productUiBcp47Tag("es")).toBe("es-419");
    expect(catalogLabelStrategyForProductUi("en")).toBe("en_strict");
    expect(catalogLabelStrategyForProductUi("fr")).toBe("fr_preferred");
    expect(catalogLabelStrategyForProductUi("es")).toBe("unlocalized");
  });

  it("does not auto-select Spanish from browser candidates", () => {
    expect(resolveProductUiLanguageFromBrowserCandidates(["es-419", "es"])).toBeNull();
    expect(resolveProductUiLanguageFromBrowserCandidates(["es-MX", "fr-FR"])).toBe("fr");
    expect(resolveProductUiLanguageFromBrowserCandidates(["en-GB"])).toBe("en");
  });

  it("exposes selector options from the public registry only", () => {
    expect(productUiLanguageSelectOptions()).toEqual([
      { value: "fr", label: "Français" },
      { value: "en", label: "English" },
      { value: "es", label: "Español" },
    ]);
    expect(productUiLanguageSelectOptions().some((o) => o.label === "Español")).toBe(true);
  });

  it("keeps facility Zod allowlist public EN/FR/ES; internal schema still accepts es", () => {
    expect(productUiLanguageSchema.options).toEqual(["fr", "en", "es"]);
    expect(productUiLanguageSchema.safeParse("es").success).toBe(true);
    expect(productUiLanguageSchema.safeParse("fr").success).toBe(true);
    expect(internalProductUiLanguageSchema.safeParse("es").success).toBe(true);
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
      value: "UNLOCALIZED_SOURCE",
      source: "UNLOCALIZED_SOURCE",
    });
  });

  it("catalog display never substitutes EN↔FR; es uses code only", () => {
    const fields = { displayNameEn: "Glucose", displayNameFr: "Glucose plasmatique", code: "GLU" };
    expect(pickCatalogDisplayLabelForProductUi("en", { ...fields, displayNameEn: "" })).toBe("GLU");
    expect(pickCatalogDisplayLabelForProductUi("en", { ...fields, displayNameEn: "" })).not.toBe(
      "Glucose plasmatique"
    );
    expect(pickCatalogDisplayLabelForProductUi("fr", { ...fields, displayNameFr: "" })).toBe("GLU");
    expect(pickCatalogDisplayLabelForProductUi("fr", { ...fields, displayNameFr: "" })).not.toBe("Glucose");
    expect(pickCatalogDisplayLabelForProductUi("es", fields)).toBe("GLU");
    expect(pickCatalogDisplayLabelForProductUi("es", fields)).not.toBe("Glucose");
    expect(pickCatalogDisplayLabelForProductUi("es", fields)).not.toBe("Glucose plasmatique");
    expect(pickCatalogDisplayLabelForProductUi(undefined, { displayNameFr: "Glucose plasmatique", code: "GLU" })).toBe(
      "GLU"
    );
    expect(pickCatalogDisplayLabelForProductUi("en", { code: "" })).toBe(UNLOCALIZED_CATALOG_SOURCE);
  });

  it("blocks six-direction catalog display substitution including hypothetical es", () => {
    const fields = { displayNameEn: "Glucose", displayNameFr: "Glucose plasmatique", code: "GLU" };
    expect(pickCatalogDisplayLabelForProductUi("en", { ...fields, displayNameEn: "" })).not.toBe(fields.displayNameFr);
    expect(pickCatalogDisplayLabelForProductUi("fr", { ...fields, displayNameFr: "" })).not.toBe(fields.displayNameEn);
    expect(pickCatalogDisplayLabelForProductUi("es", fields)).not.toBe(fields.displayNameEn);
    expect(pickCatalogDisplayLabelForProductUi("es", fields)).not.toBe(fields.displayNameFr);
    expect(pickCatalogDisplayLabelForProductUi("es", { ...fields, displayNameFr: "" })).toBe("GLU");
    expect(pickCatalogDisplayLabelForProductUi("es", { ...fields, displayNameEn: "" })).toBe("GLU");
  });

  it("empty stored bilingual strings do not become EN/FR for Spanish display", () => {
    expect(
      pickCatalogDisplayLabelForProductUi("es", { displayNameEn: "", displayNameFr: "", code: "GLU" })
    ).toBe("GLU");
    expect(pickCatalogDisplayLabelForProductUi("es", { displayNameEn: "", displayNameFr: "Glucose plasmatique" })).toBe(
      UNLOCALIZED_CATALOG_SOURCE
    );
  });

  it("hidden Spanish placeholders are explicit and cannot be confused with EN/FR copy", () => {
    const placeholder = hiddenSpanishPlaceholder("common.save");
    expect(placeholder.startsWith(UNLOCALIZED_ES_PREFIX)).toBe(true);
    expect(isHiddenSpanishPlaceholder(placeholder)).toBe(true);
    expect(isHiddenSpanishPlaceholder("Save")).toBe(false);
    expect(isHiddenSpanishPlaceholder("Enregistrer")).toBe(false);
    expect(isHiddenSpanishPlaceholder(UNLOCALIZED_ES_PREFIX)).toBe(false);
  });
});
