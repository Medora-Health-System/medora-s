import { describe, expect, it } from "vitest";
import { PUBLICLY_SELECTABLE_PRODUCT_UI_LANGUAGES, resolveProductUiLanguageOrDefault, resolvePublicProductUiLanguageOrDefault, supportedLanguages } from "@/i18n/config";
import { i18nMessage } from "@/lib/i18nMessagesLookup";
import { printDateLocale, printT } from "@/lib/printI18n";
import { resolveClinicalUiMessage } from "@/i18n/messages/registry";
import { normalizeUserFacingError } from "@/lib/userFacingError";
import { resolveClientUiLanguage } from "@/i18n/resolveClientUiLanguage";
import en from "@/i18n/messages/en";
import fr from "@/i18n/messages/fr";

describe("MEDUI.ES.1B locale lookup isolation", () => {
  it("keeps public selectors English and French while internal set includes hidden Spanish", () => {
    expect([...supportedLanguages]).toEqual(["fr", "en", "es"]);
    expect([...PUBLICLY_SELECTABLE_PRODUCT_UI_LANGUAGES]).toEqual(["fr", "en"]);
  });

  it("printT and i18nMessage resolve only the requested locale", () => {
    const enSave = printT("en", "common.save");
    const frSave = printT("fr", "common.save");
    expect(enSave).toBe((en as { common: { save: string } }).common.save);
    expect(frSave).toBe((fr as { common: { save: string } }).common.save);
    expect(enSave).not.toBe(frSave);
    expect(i18nMessage("en", "common.save")).toBe(enSave);
    expect(i18nMessage("fr", "common.save")).toBe(frSave);
  });

  it("missing EN key does not fall back to French", () => {
    const missing = "meduiEs1b.missing.print.en";
    expect(printT("en", missing)).toBe(missing);
    expect(i18nMessage("en", missing)).toBe(missing);
    expect(resolveClinicalUiMessage("en", missing)).toBe(missing);
    expect(printT("en", missing)).not.toBe(printT("fr", "common.save"));
  });

  it("missing FR key does not fall back to English", () => {
    const missing = "meduiEs1b.missing.print.fr";
    expect(printT("fr", missing)).toBe(missing);
    expect(i18nMessage("fr", missing)).toBe(missing);
    expect(resolveClinicalUiMessage("fr", missing)).toBe(missing);
    expect(printT("fr", missing)).not.toBe(printT("en", "common.save"));
  });

  it("unsupported locale resolves to English at the boundary, never French; public hydration hides es", () => {
    expect(resolveProductUiLanguageOrDefault("de")).toBe("en");
    expect(resolveProductUiLanguageOrDefault("es")).toBe("es");
    expect(resolvePublicProductUiLanguageOrDefault("es")).toBe("en");
    expect(resolvePublicProductUiLanguageOrDefault("es-419")).toBe("en");
  });

  it("printDateLocale uses the locale registry", () => {
    expect(printDateLocale("en")).toBe("en-US");
    expect(printDateLocale("fr")).toBe("fr-FR");
  });

  it("userFacingError picks copy by locale key rather than not-en → French", () => {
    expect(normalizeUserFacingError("Encounter not found", "en")).toBe("Encounter not found.");
    expect(normalizeUserFacingError("Encounter not found", "fr")).toBe("Consultation introuvable.");
  });

  it("unsupported stored locale is ignored at the resolution boundary", () => {
    expect(resolveClientUiLanguage({ storedLanguage: "es" })).toBe("en");
    expect(resolveClientUiLanguage({ storedLanguage: "es", facilityLanguage: "fr" })).toBe("fr");
  });

  it("message registry has no implicit cross-language fallback", () => {
    const missing = "meduiEs1bH.registry.missing";
    expect(resolveClinicalUiMessage("en", missing)).toBe(missing);
    expect(resolveClinicalUiMessage("fr", missing)).toBe(missing);
    expect(resolveClinicalUiMessage("en", "common.save")).not.toBe(
      resolveClinicalUiMessage("fr", "common.save")
    );
  });

  it("error registry has no implicit cross-language fallback", () => {
    expect(normalizeUserFacingError("Encounter not found", "en")).not.toContain("introuvable");
    expect(normalizeUserFacingError("Encounter not found", "fr")).not.toContain("Encounter not found");
  });
});
