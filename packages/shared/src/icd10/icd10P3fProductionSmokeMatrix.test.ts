import { describe, expect, it } from "vitest";
import {
  ICD10_P3F_SMOKE_ASSERTIONS,
  ICD10_P3F_SMOKE_CODES,
  ICD10_P3F_SMOKE_LOCALES,
  ICD10_P3F_SMOKE_SEARCH_TERMS,
} from "./icd10P3fProductionSmokeMatrix.js";

describe("P3-F production smoke matrix", () => {
  it("includes the required search terms, codes, locales, and assertions", () => {
    expect([...ICD10_P3F_SMOKE_SEARCH_TERMS]).toEqual([
      "abd",
      "abdo",
      "dol",
      "dolo",
      "dolor",
      "nau",
      "nausea",
      "vomit",
      "vomito",
      "vómito",
      "cellulitis",
      "migraine",
    ]);
    expect([...ICD10_P3F_SMOKE_CODES]).toContain("R10.85");
    expect([...ICD10_P3F_SMOKE_CODES]).toContain("L03");
    expect([...ICD10_P3F_SMOKE_CODES]).toContain("L03.90");
    expect([...ICD10_P3F_SMOKE_LOCALES]).toEqual(["en", "fr", "es"]);
    expect(ICD10_P3F_SMOKE_ASSERTIONS.length).toBeGreaterThanOrEqual(11);
  });
});
