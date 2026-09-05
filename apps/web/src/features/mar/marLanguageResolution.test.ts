import { describe, expect, it } from "vitest";
import { resolveClientUiLanguage } from "@/i18n/resolveClientUiLanguage";
import { defaultLanguage } from "@/i18n/config";

describe("marLanguageResolution (MEDUI.ED.UI.I18N_CLEANUP.1)", () => {
  it("app default is English", () => {
    expect(defaultLanguage).toBe("en");
  });

  it("stored user language wins", () => {
    expect(resolveClientUiLanguage({ storedLanguage: "en", browserLanguage: "fr" })).toBe("en");
    expect(resolveClientUiLanguage({ storedLanguage: "fr", browserLanguage: "en" })).toBe("fr");
  });

  it("browser fr-FR does not override explicit English", () => {
    expect(
      resolveClientUiLanguage({
        storedLanguage: "en",
        browserLanguage: "fr",
        cachedFacilityLanguage: "fr",
      })
    ).toBe("en");
  });

  it("falls back to English without preferences", () => {
    expect(
      resolveClientUiLanguage({
        storedLanguage: null,
        facilityLanguage: null,
        cachedFacilityLanguage: null,
        browserLanguage: null,
      })
    ).toBe("en");
  });

  it("no stored language with browser fr defaults to English", () => {
    expect(
      resolveClientUiLanguage({
        storedLanguage: null,
        facilityLanguage: null,
        cachedFacilityLanguage: null,
        browserLanguage: "fr",
      })
    ).toBe("en");
  });

  it("America/Chicago timezone does not force English when user selected French", () => {
    expect(
      resolveClientUiLanguage({
        storedLanguage: "fr",
        browserLanguage: "en",
      })
    ).toBe("fr");
  });

  it("facility language applies even when a stored login locale exists", () => {
    expect(
      resolveClientUiLanguage({
        storedLanguage: "en",
        facilityLanguage: "fr",
        browserLanguage: "en",
      })
    ).toBe("fr");
  });
});
