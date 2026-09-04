/**
 * Phase MEDUI.2C — client UI language resolution (login boundary).
 */
import { describe, expect, it } from "vitest";
import { resolveClientUiLanguage } from "@/i18n/resolveClientUiLanguage";

describe("resolveClientUiLanguage (MEDUI.2C)", () => {
  it("defaults to English when no preference exists", () => {
    expect(resolveClientUiLanguage({})).toBe("en");
  });

  it("respects saved English preference", () => {
    expect(resolveClientUiLanguage({ storedLanguage: "en" })).toBe("en");
  });

  it("respects saved French preference", () => {
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

  it("prefers stored user language over cached facility language", () => {
    expect(
      resolveClientUiLanguage({
        storedLanguage: "fr",
        cachedFacilityLanguage: "en",
      })
    ).toBe("fr");
  });

  it("prefers stored English over active facility French (INP.2G.2 locale defect)", () => {
    expect(
      resolveClientUiLanguage({
        storedLanguage: "en",
        facilityLanguage: "fr",
        cachedFacilityLanguage: "fr",
        browserLanguage: "fr",
      })
    ).toBe("en");
  });
});
