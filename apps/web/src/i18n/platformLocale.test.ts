import { describe, expect, it } from "vitest";
import {
  canRunPlatformAdminDomRewrite,
  isPlatformUiLanguage,
  parsePlatformUiLanguage,
  platformLanguageSelectOptions,
  resolvePlatformAdminLegacyLocaleOrDefault,
  PLATFORM_DEFAULT_UI_LANGUAGE,
  PLATFORM_UI_LANGUAGES,
  type PlatformAdminLegacyLocale,
} from "./platformLocale";
import { PRODUCT_UI_LANGUAGES, type ProductUiLanguage } from "@medora/shared";

describe("Platform Admin locale island (MEDUI.ES.1B-H)", () => {
  it("does not inherit future product UI languages", () => {
    expect([...PLATFORM_UI_LANGUAGES]).toEqual(["en", "fr"]);
    expect(isPlatformUiLanguage("es")).toBe(false);
    expect(parsePlatformUiLanguage("es")).toBeNull();
    expect(parsePlatformUiLanguage("es-MX")).toBeNull();
    expect(parsePlatformUiLanguage("fr")).toBe("fr");
    expect(platformLanguageSelectOptions().map((o) => o.value).sort()).toEqual(["en", "fr"]);
  });

  it("rejects unknown locales at the parser; default is English never French", () => {
    expect(PLATFORM_DEFAULT_UI_LANGUAGE).toBe("en");
    expect(parsePlatformUiLanguage("de")).toBeNull();
    expect(parsePlatformUiLanguage("ht")).toBeNull();
    expect(resolvePlatformAdminLegacyLocaleOrDefault("es")).toBe("en");
    expect(resolvePlatformAdminLegacyLocaleOrDefault("es")).not.toBe("fr");
    expect(resolvePlatformAdminLegacyLocaleOrDefault(undefined)).toBe("en");
    expect(resolvePlatformAdminLegacyLocaleOrDefault("not-a-locale")).toBe("en");
  });

  it("does not run MutationObserver rewrite for future es or unknown", () => {
    expect(canRunPlatformAdminDomRewrite("en")).toBe(true);
    expect(canRunPlatformAdminDomRewrite("fr")).toBe(true);
    expect(canRunPlatformAdminDomRewrite("es")).toBe(false);
    expect(canRunPlatformAdminDomRewrite("es-419")).toBe(false);
    expect(canRunPlatformAdminDomRewrite(null)).toBe(false);
  });

  it("keeps PlatformAdminLegacyLocale assignable only from the EN/FR island", () => {
    const island: PlatformAdminLegacyLocale = "fr";
    expect(island).toBe("fr");
    const product: readonly ProductUiLanguage[] = PRODUCT_UI_LANGUAGES;
    expect(product.includes("es" as ProductUiLanguage)).toBe(false);
  });
});
