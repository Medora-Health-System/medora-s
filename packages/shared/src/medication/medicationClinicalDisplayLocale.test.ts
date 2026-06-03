import { describe, expect, it } from "vitest";
import {
  buildMedicationCatalogClinicalParts,
  buildMedicationCatalogSecondaryTexts,
  filterMedicationAliasesForDisplayLocale,
  formatMedicationCatalogClinicalLine,
  medicationEnglishDisplayContainsFrenchLeak,
  resolveMedicationClinicalDisplayValue,
} from "./medicationClinicalDisplayLocale.js";

const IBUPROFEN_FIELDS = {
  strength: "200 mg",
  dosageForm: "comprimé",
  route: "orale",
  therapeuticClass: "Analgésique / antipyrétique",
};

describe("M1.7A.3 medicationClinicalDisplayLocale", () => {
  it("English Ibuprofen clinical line has no French category or form text", () => {
    const line = formatMedicationCatalogClinicalLine(IBUPROFEN_FIELDS, "en");
    expect(line).toContain("200 mg");
    expect(line).toContain("tablet");
    expect(line).toContain("oral");
    expect(line).toContain("Analgesic / antipyretic");
    expect(medicationEnglishDisplayContainsFrenchLeak(line)).toBe(false);
  });

  it("French Ibuprofen clinical line preserves French labels", () => {
    const line = formatMedicationCatalogClinicalLine(IBUPROFEN_FIELDS, "fr");
    expect(line).toContain("comprimé");
    expect(line).toContain("orale");
    expect(line).toContain("Analgésique / antipyrétique");
  });

  it("maps suspension buvable and Antalgique for English UI", () => {
    expect(resolveMedicationClinicalDisplayValue("suspension buvable", "en", "dosageForm")).toBe(
      "oral suspension"
    );
    expect(resolveMedicationClinicalDisplayValue("Antalgique", "en", "therapeuticClass")).toBe(
      "Analgesic"
    );
  });

  it("buildMedicationCatalogSecondaryTexts returns distinct FR and EN lines", () => {
    const texts = buildMedicationCatalogSecondaryTexts(IBUPROFEN_FIELDS);
    expect(texts.secondaryTextFr).toContain("comprimé");
    expect(texts.secondaryTextEn).toContain("tablet");
    expect(medicationEnglishDisplayContainsFrenchLeak(texts.secondaryTextEn)).toBe(false);
  });

  it("filters French aliases out of English display list", () => {
    const filtered = filterMedicationAliasesForDisplayLocale(
      ["Advil", "Motrin", "Advil pédiatrique"],
      "en"
    );
    expect(filtered).toEqual(["Advil", "Motrin"]);
  });

  it("keeps French aliases for French display list", () => {
    const filtered = filterMedicationAliasesForDisplayLocale(
      ["Advil", "Advil pédiatrique"],
      "fr"
    );
    expect(filtered).toEqual(["Advil", "Advil pédiatrique"]);
  });

  it("English parts omit therapeutic class when absent", () => {
    const parts = buildMedicationCatalogClinicalParts(
      { strength: "5 mg", dosageForm: "comprimé", route: "orale" },
      "en"
    );
    expect(parts.join(" ")).toContain("5 mg tablet oral");
    expect(medicationEnglishDisplayContainsFrenchLeak(parts.join(" "))).toBe(false);
  });
});
