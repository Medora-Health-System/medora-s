import { describe, expect, it } from "vitest";
import {
  adaptProductUiToMedicationClinicalDisplayLocale,
  pickLegacyBilingualStoredPair,
} from "../i18n/productUiLocale.js";
import {
  filterMedicationAliasesForDisplayLocale,
  resolveMedicationClinicalDisplayValue,
} from "./medicationClinicalDisplayLocale.js";
import { inferLocalizationAliasesFromStrings } from "./medicationLocalizationValidation.js";

describe("MEDUI.ES.1B-CERT formulary alias display isolation", () => {
  it("classifies alias source language without changing canonical identity", () => {
    const aliases = inferLocalizationAliasesFromStrings(["Advil", "Advil pédiatrique", "Motrin"]);
    expect(aliases.find((a) => a.text === "Advil")?.language).toBe("en");
    expect(aliases.find((a) => a.text === "Advil pédiatrique")?.language).toBe("fr");
    expect(aliases.find((a) => a.text === "Motrin")?.language).toBe("en");
  });

  it("EN display does not become FR because a French alias matched", () => {
    const aliases = ["Advil", "Advil pédiatrique"];
    expect(filterMedicationAliasesForDisplayLocale(aliases, "en")).toEqual(["Advil"]);
    expect(resolveMedicationClinicalDisplayValue("comprimé", "en", "dosageForm")).toBe("tablet");
    const name = pickLegacyBilingualStoredPair("en", {
      en: "Ibuprofen",
      fr: "Ibuprofène",
    });
    expect(name).toEqual({ kind: "localized", locale: "en", value: "Ibuprofen" });
  });

  it("FR display does not become EN because an English alias matched", () => {
    const aliases = ["Advil", "Advil pédiatrique"];
    expect(filterMedicationAliasesForDisplayLocale(aliases, "fr")).toEqual([
      "Advil",
      "Advil pédiatrique",
    ]);
    expect(resolveMedicationClinicalDisplayValue("comprimé", "fr", "dosageForm")).toBe("comprimé");
    const name = pickLegacyBilingualStoredPair("fr", {
      en: "Ibuprofen",
      fr: "Ibuprofène",
    });
    expect(name).toEqual({ kind: "localized", locale: "fr", value: "Ibuprofène" });
  });

  it("unsupported ES does not pretend an EN/FR alias is Spanish", () => {
    expect(adaptProductUiToMedicationClinicalDisplayLocale("es")).toEqual({ kind: "unsupported" });
    expect(adaptProductUiToMedicationClinicalDisplayLocale("es-MX")).toEqual({
      kind: "unsupported",
    });
    const picked = pickLegacyBilingualStoredPair("es", { en: "Ibuprofen", fr: "Ibuprofène" });
    expect(picked.kind).toBe("unsupported");
    expect(picked).toEqual({
      kind: "unsupported",
      value: "UNLOCALIZED_SOURCE",
      source: "UNLOCALIZED_SOURCE",
    });
  });
});
