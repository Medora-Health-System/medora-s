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

describe("Platform Admin locale island", () => {
  it("supports EN/FR/ES and rejects unknown locales", () => {
    expect([...PLATFORM_UI_LANGUAGES]).toEqual(["en", "fr", "es"]);
    expect(isPlatformUiLanguage("es")).toBe(true);
    expect(parsePlatformUiLanguage("es")).toBe("es");
    expect(parsePlatformUiLanguage("es-MX")).toBe("es");
    expect(parsePlatformUiLanguage("fr")).toBe("fr");
    expect(platformLanguageSelectOptions().map((o) => o.value)).toEqual(["en", "fr", "es"]);
  });

  it("rejects unknown locales at the parser; default is English never French", () => {
    expect(PLATFORM_DEFAULT_UI_LANGUAGE).toBe("en");
    expect(parsePlatformUiLanguage("de")).toBeNull();
    expect(parsePlatformUiLanguage("ht")).toBeNull();
    expect(resolvePlatformAdminLegacyLocaleOrDefault("de")).toBe("en");
    expect(resolvePlatformAdminLegacyLocaleOrDefault("de")).not.toBe("fr");
    expect(resolvePlatformAdminLegacyLocaleOrDefault(undefined)).toBe("en");
    expect(resolvePlatformAdminLegacyLocaleOrDefault("not-a-locale")).toBe("en");
  });

  it("runs MutationObserver rewrite for all supported platform locales", () => {
    expect(canRunPlatformAdminDomRewrite("en")).toBe(true);
    expect(canRunPlatformAdminDomRewrite("fr")).toBe(true);
    expect(canRunPlatformAdminDomRewrite("es")).toBe(true);
    expect(canRunPlatformAdminDomRewrite(null)).toBe(false);
    expect(canRunPlatformAdminDomRewrite("de")).toBe(false);
  });

  it("keeps PlatformAdminLegacyLocale aligned with public product languages", () => {
    const island: PlatformAdminLegacyLocale = "es";
    expect(island).toBe("es");
    const product: readonly ProductUiLanguage[] = PRODUCT_UI_LANGUAGES;
    expect(product.includes("es")).toBe(true);
    expect(isPlatformUiLanguage("es")).toBe(true);
  });
});
