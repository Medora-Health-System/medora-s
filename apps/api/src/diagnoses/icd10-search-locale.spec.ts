import { BadRequestException } from "@nestjs/common";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseProductUiLanguage, resolveProductUiLanguageOrDefault } from "@medora/shared";
import { requireIcd10SearchLocale, parseOptionalIcd10ListLocale } from "./icd10-search-locale";

describe("ICD-10 search locale gate", () => {
  it("accepts canonical product locales", () => {
    expect(requireIcd10SearchLocale("en")).toBe("en");
    expect(requireIcd10SearchLocale("fr")).toBe("fr");
    expect(requireIcd10SearchLocale("es")).toBe("es");
  });

  it("uses existing parser case/BCP-47 behavior without inventing a second registry", () => {
    expect(parseProductUiLanguage("EN")).toBe("en");
    expect(requireIcd10SearchLocale("EN")).toBe("en");
    expect(parseProductUiLanguage("fr-FR")).toBe("fr");
    expect(requireIcd10SearchLocale("fr-FR")).toBe("fr");
    expect(parseProductUiLanguage("es-MX")).toBe("es");
    expect(requireIcd10SearchLocale("es-MX")).toBe("es");
  });

  it("rejects missing, empty, ht, and unknown values instead of defaulting to EN", () => {
    expect(parseProductUiLanguage("ht")).toBeNull();
    expect(parseProductUiLanguage("")).toBeNull();
    expect(parseProductUiLanguage(undefined)).toBeNull();
    expect(parseProductUiLanguage("de")).toBeNull();
    expect(() => requireIcd10SearchLocale(undefined)).toThrow(BadRequestException);
    expect(() => requireIcd10SearchLocale("")).toThrow(BadRequestException);
    expect(() => requireIcd10SearchLocale("ht")).toThrow(BadRequestException);
    expect(() => requireIcd10SearchLocale("de")).toThrow(BadRequestException);
    expect(resolveProductUiLanguageOrDefault(undefined)).toBe("en");
    expect(resolveProductUiLanguageOrDefault("ht")).toBe("en");
  });

  it("controller uses the reject-on-null gate, not the EN defaulting resolver", () => {
    const controller = readFileSync(join(__dirname, "diagnoses.controller.ts"), "utf8");
    expect(controller).toContain("requireIcd10SearchLocale");
    expect(controller).not.toContain("resolveProductUiLanguageOrDefault");
    expect(controller).not.toContain("resolvePublicProductUiLanguageOrDefault");
    expect(controller).not.toContain("resolveInternalProductUiLanguageOrDefault");
  });

  it("optional list locale omits missing and rejects invalid without silent EN", () => {
    expect(parseOptionalIcd10ListLocale(undefined)).toBeNull();
    expect(parseOptionalIcd10ListLocale("")).toBeNull();
    expect(parseOptionalIcd10ListLocale("es")).toBe("es");
    expect(() => parseOptionalIcd10ListLocale("ht")).toThrow(BadRequestException);
  });
});
