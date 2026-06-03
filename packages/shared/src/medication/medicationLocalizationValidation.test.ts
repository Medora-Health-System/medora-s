import { describe, expect, it } from "vitest";
import {
  buildMedicationSearchTokens,
  buildMedicationSearchTokensEn,
  buildMedicationSearchTokensFr,
  medicationSearchTermsMatchBuilder,
} from "./medicationSearchTokens.js";
import {
  assertMedicationLocalization,
  buildMedicationSearchTermsArray,
  enterpriseFormularyEntryToLocalizationContract,
  validateEnterpriseFormularyLocalizationBatch,
  validateEnterpriseWaveFormularyLocalizationReady,
  validateMedicationLocalization,
} from "./medicationLocalizationValidation.js";
import type { MedicationLocalizationContract } from "./medicationLocalizationTypes.js";
import { validateEnterpriseWave1FormularyManifest } from "./enterpriseWave1FormularyValidation.js";
import { validateEnterpriseWave2FormularyManifest } from "./enterpriseWave2FormularyValidation.js";

const VALID: MedicationLocalizationContract = {
  catalogCode: "AMLODIPINE_5_MG_COMPRIME_ORAL",
  genericName: "Amlodipine",
  displayNameFr: "Amlodipine",
  displayNameEn: "Amlodipine",
  strength: "5 mg",
  dosageForm: "comprimé",
  route: "orale",
  therapeuticClass: "Antihypertenseur",
  aliases: [
    { text: "Norvasc", language: "en", aliasType: "BRAND" },
    { text: "amlodipine", language: "en", aliasType: "GENERIC" },
    { text: "amlodipine", language: "fr", aliasType: "GENERIC" },
  ],
};

describe("M1.7A.2 — medication localization contract", () => {
  it("accepts valid bilingual medication", () => {
    const result = validateMedicationLocalization(VALID, { requireAliasesPerLocale: true });
    expect(result.pass).toBe(true);
    expect(result.issues.filter((i) => i.severity === "blocking")).toHaveLength(0);
  });

  it("fails when displayNameEn missing", () => {
    const result = validateMedicationLocalization({
      ...VALID,
      displayNameEn: "",
    });
    expect(result.pass).toBe(false);
    expect(result.issues.some((i) => i.kind === "MISSING_DISPLAY_EN")).toBe(true);
  });

  it("fails when displayNameFr missing", () => {
    const result = validateMedicationLocalization({
      ...VALID,
      displayNameFr: "  ",
    });
    expect(result.pass).toBe(false);
    expect(result.issues.some((i) => i.kind === "MISSING_DISPLAY_FR")).toBe(true);
  });

  it("fails on duplicate alias within locale", () => {
    const result = validateMedicationLocalization({
      ...VALID,
      aliases: [
        { text: "Norvasc", language: "en" },
        { text: "norvasc", language: "en" },
        { text: "amlodipine", language: "fr" },
      ],
    });
    expect(result.pass).toBe(false);
    expect(result.issues.some((i) => i.kind === "DUPLICATE_ALIAS")).toBe(true);
  });

  it("fails on invalid locale", () => {
    const result = validateMedicationLocalization({
      ...VALID,
      aliases: [{ text: "test", language: "de" as "en" }],
    });
    expect(result.pass).toBe(false);
    expect(result.issues.some((i) => i.kind === "INVALID_LOCALE")).toBe(true);
  });

  it("fails when French text is tagged as English alias", () => {
    const result = validateMedicationLocalization({
      ...VALID,
      aliases: [{ text: "comprimé orale", language: "en" }],
    });
    expect(result.pass).toBe(false);
    expect(result.issues.some((i) => i.kind === "ALIAS_LANGUAGE_MISMATCH")).toBe(true);
  });

  it("fails when displayNameEn copies French displayNameFr", () => {
    const result = validateMedicationLocalization({
      ...VALID,
      displayNameFr: "Metformine comprimé",
      displayNameEn: "Metformine comprimé",
    });
    expect(result.pass).toBe(false);
    expect(result.issues.some((i) => i.kind === "DISPLAY_MIRROR_WITHOUT_OVERRIDE")).toBe(true);
  });

  it("builds EN and FR search tokens separately", () => {
    const en = buildMedicationSearchTokensEn(VALID);
    const fr = buildMedicationSearchTokensFr(VALID);
    expect(en).toContain("amlodipine");
    expect(en).toContain("norvasc");
    expect(fr).toContain("amlodipine");
    expect(en).not.toEqual(expect.arrayContaining(["comprimé"]));
  });

  it("buildMedicationSearchTokens produces combined blob", () => {
    const built = buildMedicationSearchTokens(VALID);
    expect(built.combined.length).toBeGreaterThan(10);
    expect(built.en.length).toBeGreaterThan(0);
    expect(built.fr.length).toBeGreaterThan(0);
  });

  it("strict searchTerms must match builder", () => {
    const terms = buildMedicationSearchTermsArray(VALID);
    const contract = { ...VALID, searchTerms: terms };
    expect(medicationSearchTermsMatchBuilder(contract, terms)).toBe(true);
    expect(
      validateMedicationLocalization(contract, {
        requireAliasesPerLocale: true,
        strictSearchTerms: true,
      }).pass
    ).toBe(true);
  });

  it("Wave 3 readiness fails without builder-aligned searchTerms", () => {
    const bad = { ...VALID, searchTerms: ["manual", "concat"] };
    const ready = validateEnterpriseWaveFormularyLocalizationReady([bad]);
    expect(ready.pass).toBe(false);
  });

  it("Wave 3 readiness passes with builder searchTerms", () => {
    const terms = buildMedicationSearchTermsArray(VALID);
    const ready = validateEnterpriseWaveFormularyLocalizationReady([
      { ...VALID, searchTerms: terms },
    ]);
    expect(ready.pass).toBe(true);
  });

  it("assertMedicationLocalization throws on blocking issues", () => {
    expect(() => assertMedicationLocalization({ ...VALID, displayNameEn: "" })).toThrow(
      /medication-localization/
    );
  });

  it("existing Wave 1 manifest passes localization batch (legacy mode)", () => {
    expect(validateEnterpriseWave1FormularyManifest()).toEqual([]);
  });

  it("existing Wave 2 manifest passes localization batch (legacy mode)", () => {
    expect(validateEnterpriseWave2FormularyManifest()).toEqual([]);
  });

  it("enterpriseFormularyEntryToLocalizationContract infers alias languages", () => {
    const contract = enterpriseFormularyEntryToLocalizationContract({
      catalogCode: "TEST_CODE",
      genericName: "Test",
      displayNameFr: "Test FR",
      displayNameEn: "Test EN",
      aliases: ["Norvasc", "comprimé"],
    });
    expect(contract.aliases.find((a) => a.text === "Norvasc")?.language).toBe("en");
    expect(contract.aliases.find((a) => a.text === "comprimé")?.language).toBe("fr");
  });

  it("validateEnterpriseFormularyLocalizationBatch dedupes catalog codes", () => {
    const batch = validateEnterpriseFormularyLocalizationBatch([
      {
        catalogCode: "DUP",
        genericName: "A",
        displayNameFr: "A",
        displayNameEn: "A",
        aliases: ["a"],
      },
      {
        catalogCode: "DUP",
        genericName: "B",
        displayNameFr: "B",
        displayNameEn: "B",
        aliases: ["b"],
      },
    ]);
    expect(batch.pass).toBe(false);
    expect(batch.issues.some((i) => i.message.includes("duplicate catalogCode"))).toBe(true);
  });
});
