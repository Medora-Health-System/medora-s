import { describe, expect, it } from "vitest";
import { ENTERPRISE_WAVE4_ED_HOSPITAL_FORMULARY_MANIFEST } from "./enterpriseWave4EdHospitalFormularyManifest.js";
import {
  isWave4DangerousAlias,
  validateWave4LevophedLevofloxacinCollision,
  validateWave4PreservedSafeAliases,
  validateWave4ScopedAbbrevAliases,
  validateWave4SearchHardening,
} from "./enterpriseWave4EdHospitalSearchValidation.js";

describe("M1.7C.2 — Wave 4 search hardening", () => {
  const catalogs = ENTERPRISE_WAVE4_ED_HOSPITAL_FORMULARY_MANIFEST.map((e) => ({
    catalogCode: e.catalogCode,
    genericName: e.genericName,
    aliases: e.aliases,
    searchTerms: e.searchTerms,
    searchText: e.searchTerms.join(" "),
  }));

  it("rejects dangerous bare aliases MS, U, NTG", () => {
    expect(isWave4DangerousAlias("MS")).toBe(true);
    expect(isWave4DangerousAlias("u")).toBe(true);
    expect(isWave4DangerousAlias("NTG")).toBe(true);
    expect(isWave4DangerousAlias("Dilaudid")).toBe(false);
  });

  it("manifest passes search hardening validation", () => {
    expect(validateWave4SearchHardening(ENTERPRISE_WAVE4_ED_HOSPITAL_FORMULARY_MANIFEST)).toEqual(
      []
    );
  });

  it("levofloxacin does not collide with Levophed", () => {
    expect(validateWave4LevophedLevofloxacinCollision(catalogs)).toEqual([]);
  });

  it("scoped abbreviations remain on correct generics only", () => {
    expect(validateWave4ScopedAbbrevAliases(ENTERPRISE_WAVE4_ED_HOSPITAL_FORMULARY_MANIFEST)).toEqual(
      []
    );
  });

  it("preserves safe ED aliases (Dilaudid, Versed, Roc, Zosyn, Vanc, Levophed)", () => {
    expect(validateWave4PreservedSafeAliases(catalogs)).toEqual([]);
  });
});
