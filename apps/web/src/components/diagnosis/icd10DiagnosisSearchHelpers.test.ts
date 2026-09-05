/**
 * INP.DIS.1I — ICD-10 search keyboard + duplicate helpers.
 */

import { describe, expect, it } from "vitest";
import {
  icd10HitDescription,
  interpretIcd10SearchKeyDown,
  isDuplicateDischargeDiagnosis,
  normalizeDiagnosisDuplicateKey,
} from "./icd10DiagnosisSearchHelpers";

describe("INP.DIS.1I ICD-10 diagnosis search helpers", () => {
  it("duplicates by code when present, else normalized description", () => {
    const selected = [
      { code: "A41.9", description: "Sepsis, unspecified organism" },
      { code: "", description: "Manual free-text diagnosis" },
    ];
    expect(
      isDuplicateDischargeDiagnosis({ code: "a41.9", description: "Other" }, selected)
    ).toBe(true);
    expect(
      isDuplicateDischargeDiagnosis(
        { code: "J18.9", description: "Pneumonia, unspecified organism" },
        selected
      )
    ).toBe(false);
    expect(
      isDuplicateDischargeDiagnosis({ description: "Manual free-text diagnosis" }, selected)
    ).toBe(true);
    expect(normalizeDiagnosisDuplicateKey({ code: "A41.9" })).toBe("code:A41.9");
  });

  it("Enter selects only an actively highlighted result", () => {
    expect(
      interpretIcd10SearchKeyDown({
        key: "Enter",
        activeIndex: -1,
        hitCount: 3,
        listOpen: true,
      })
    ).toEqual({ type: "none" });
    expect(
      interpretIcd10SearchKeyDown({
        key: "Enter",
        activeIndex: 1,
        hitCount: 3,
        listOpen: true,
      })
    ).toEqual({ type: "select", index: 1 });
    expect(
      interpretIcd10SearchKeyDown({
        key: "ArrowDown",
        activeIndex: -1,
        hitCount: 3,
        listOpen: true,
      })
    ).toEqual({ type: "move", nextIndex: 0 });
    expect(
      interpretIcd10SearchKeyDown({
        key: "Escape",
        activeIndex: 0,
        hitCount: 3,
        listOpen: true,
      })
    ).toEqual({ type: "close" });
  });

  it("never persists displayLabel as the canonical description snapshot", () => {
    expect(
      icd10HitDescription({
        code: "A42.1",
        shortDescription: "Abdominal actinomycosis",
        longDescription: null,
        displayLabel: "A42.1",
      })
    ).toBe("Abdominal actinomycosis");
    expect(
      icd10HitDescription({
        code: "R10.85",
        shortDescription: "Abdominal pain, unspecified site",
        displayLabel: "Dolor abdominal en varios sitios",
      })
    ).toBe("Abdominal pain, unspecified site");
    const persistBody = {
      icd10CatalogId: "cat-r1085",
      code: "R10.85",
      description: icd10HitDescription({
        code: "R10.85",
        shortDescription: "Abdominal pain, unspecified site",
        displayLabel: "Dolor abdominal en varios sitios",
      }),
    };
    expect(persistBody).not.toHaveProperty("displayLabel");
    expect(persistBody.description).not.toBe("Dolor abdominal en varios sitios");
    expect(
      isDuplicateDischargeDiagnosis(
        { code: persistBody.code, description: persistBody.description },
        [{ code: "R10.85", description: "Abdominal pain, unspecified site" }]
      )
    ).toBe(true);
  });
});
