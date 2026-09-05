/**
 * Phase MEDUI.2C / MEDUI.LOCALE.P0 — client UI language resolution.
 */
import { describe, expect, it } from "vitest";
import { resolveClientUiLanguage } from "@/i18n/resolveClientUiLanguage";

describe("resolveClientUiLanguage (MEDUI.LOCALE.P0)", () => {
  it("defaults to English when no preference exists", () => {
    expect(resolveClientUiLanguage({})).toBe("en");
  });

  it("respects saved English preference when no facility language is active", () => {
    expect(resolveClientUiLanguage({ storedLanguage: "en" })).toBe("en");
  });

  it("respects saved French preference when no facility language is active", () => {
    expect(resolveClientUiLanguage({ storedLanguage: "fr" })).toBe("fr");
  });

  it("does not let browser French override explicit English stored preference", () => {
    expect(
      resolveClientUiLanguage({
        storedLanguage: "en",
        browserLanguage: "fr",
      })
    ).toBe("en");
  });

  it("does not let browser French override cached English facility preference", () => {
    expect(
      resolveClientUiLanguage({
        cachedFacilityLanguage: "en",
        browserLanguage: "fr",
      })
    ).toBe("en");
  });

  it("uses active facility language before browser fallback", () => {
    expect(
      resolveClientUiLanguage({
        facilityLanguage: "en",
        browserLanguage: "fr",
      })
    ).toBe("en");
  });

  it("uses English fallback when browser French is the only signal", () => {
    expect(resolveClientUiLanguage({ browserLanguage: "fr" })).toBe("en");
  });

  it("hydrates stored Spanish after 1K public enablement; still ignores unknown codes", () => {
    expect(resolveClientUiLanguage({ storedLanguage: "es" })).toBe("es");
    expect(
      resolveClientUiLanguage({
        storedLanguage: "ht",
        facilityLanguage: "fr",
      })
    ).toBe("fr");
  });

  it("prefers stored user language over cached facility language when no active facility is known", () => {
    expect(
      resolveClientUiLanguage({
        storedLanguage: "fr",
        cachedFacilityLanguage: "en",
      })
    ).toBe("fr");
  });

  it("active facility language outranks stored login locale (MEDUI.LOCALE.P0)", () => {
    expect(
      resolveClientUiLanguage({
        storedLanguage: "en",
        facilityLanguage: "fr",
        cachedFacilityLanguage: "fr",
        browserLanguage: "fr",
      })
    ).toBe("fr");
    expect(
      resolveClientUiLanguage({
        storedLanguage: "en",
        facilityLanguage: "es",
        cachedFacilityLanguage: "en",
        browserLanguage: "en",
      })
    ).toBe("es");
  });
});
