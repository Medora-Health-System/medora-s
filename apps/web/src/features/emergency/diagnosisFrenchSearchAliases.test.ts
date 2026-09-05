import { describe, expect, it } from "vitest";
import type { Icd10SearchHit } from "@/lib/chartApi";
import {
  diagnosisMatchesLocalizedSearch,
  getFrenchDiagnosisSearchAliases,
  normalizeDiagnosisSearchText,
  resolveLocalizedDiagnosisSearchQuery,
  resolveLocalizedDiagnosisSearchQueries,
} from "./diagnosisFrenchSearchAliases";

function mockHit(code: string, shortDescription: string): Icd10SearchHit {
  return {
    id: `id-${code}`,
    code,
    shortDescription,
    longDescription: null,
    isBillable: true,
    displayLabel: code,
    displayResolution: "UNLOCALIZED_CODE",
  };
}

describe("19Y.16A French diagnosis search aliases", () => {
  it("exports alias catalog with required French pain terms", () => {
    const aliases = getFrenchDiagnosisSearchAliases();
    const phrases = aliases.flatMap((a) => a.frenchPhrases);
    expect(phrases).toContain("douleur abdominale");
    expect(phrases).toContain("douleur thoracique");
    expect(phrases).toContain("mal de tete");
    expect(phrases).toContain("essoufflement");
    expect(phrases).toContain("infection urinaire");
  });

  it("normalizeDiagnosisSearchText is accent-insensitive", () => {
    expect(normalizeDiagnosisSearchText("Céphalée")).toBe("cephalee");
    expect(normalizeDiagnosisSearchText("Fièvre")).toBe("fievre");
    expect(normalizeDiagnosisSearchText("  Douleur  ")).toBe("douleur");
  });

  it("douleur abdominale resolves to abdominal pain", () => {
    expect(resolveLocalizedDiagnosisSearchQuery("douleur abdominale", "fr")).toBe("abdominal pain");
    expect(
      diagnosisMatchesLocalizedSearch(mockHit("R10.9", "Abdominal pain, unspecified"), "douleur abdominale", "fr")
    ).toBe(true);
  });

  it("douleur a partial search finds abdominal pain", () => {
    expect(resolveLocalizedDiagnosisSearchQuery("douleur a", "fr")).toBe("abdominal pain");
    expect(
      diagnosisMatchesLocalizedSearch(mockHit("R10.9", "Abdominal pain, unspecified"), "douleur a", "fr")
    ).toBe(true);
  });

  it("douleur thoracique finds chest pain", () => {
    expect(resolveLocalizedDiagnosisSearchQuery("douleur thoracique", "fr")).toBe("chest pain");
    expect(
      diagnosisMatchesLocalizedSearch(mockHit("R07.9", "Chest pain, unspecified"), "douleur thoracique", "fr")
    ).toBe(true);
  });

  it("mal de tête finds headache (accent-insensitive)", () => {
    expect(resolveLocalizedDiagnosisSearchQuery("mal de tête", "fr")).toBe("headache");
    expect(
      diagnosisMatchesLocalizedSearch(mockHit("R51.9", "Headache, unspecified"), "mal de tête", "fr")
    ).toBe(true);
  });

  it("essoufflement finds shortness of breath", () => {
    expect(resolveLocalizedDiagnosisSearchQuery("essoufflement", "fr")).toBe("shortness of breath");
    expect(
      diagnosisMatchesLocalizedSearch(
        mockHit("R06.02", "Shortness of breath"),
        "essoufflement",
        "fr"
      )
    ).toBe(true);
  });

  it("infection urinaire finds UTI", () => {
    const queries = resolveLocalizedDiagnosisSearchQueries("infection urinaire", "fr");
    expect(queries).toContain("urinary tract infection");
    expect(queries).toContain("UTI");
    expect(
      diagnosisMatchesLocalizedSearch(
        mockHit("N39.0", "Urinary tract infection, site not specified"),
        "infection urinaire",
        "fr"
      )
    ).toBe(true);
  });

  it("accent-insensitive French partial search works", () => {
    expect(
      diagnosisMatchesLocalizedSearch(mockHit("R51.9", "Headache, unspecified"), "céphalée", "fr")
    ).toBe(true);
    expect(
      diagnosisMatchesLocalizedSearch(mockHit("R50.9", "Fever, unspecified"), "fièvre", "fr")
    ).toBe(true);
  });

  it("English locale passes query through unchanged", () => {
    expect(resolveLocalizedDiagnosisSearchQuery("chest pain", "en")).toBe("chest pain");
    expect(
      diagnosisMatchesLocalizedSearch(mockHit("R07.9", "Chest pain, unspecified"), "chest", "en")
    ).toBe(true);
  });

  it("Phase 10 — commotion cérébrale finds concussion", () => {
    expect(resolveLocalizedDiagnosisSearchQuery("commotion cérébrale", "fr")).toBe("concussion");
    expect(
      diagnosisMatchesLocalizedSearch(mockHit("S06.0X0A", "Concussion without loss of consciousness"), "commotion cérébrale", "fr")
    ).toBe(true);
  });

  it("Phase 10 — hématome sous-dural finds subdural hematoma", () => {
    const queries = resolveLocalizedDiagnosisSearchQueries("hématome sous-dural", "fr");
    expect(queries).toContain("subdural hematoma");
    expect(
      diagnosisMatchesLocalizedSearch(
        mockHit("S06.5X0A", "Traumatic subdural hemorrhage without loss of consciousness"),
        "hématome sous-dural",
        "fr"
      )
    ).toBe(true);
  });

  it("Phase 10 — fracture orbitaire finds orbital fracture (distinct from fracture du crâne)", () => {
    expect(resolveLocalizedDiagnosisSearchQuery("fracture orbitaire", "fr")).toBe("orbital fracture");
    expect(resolveLocalizedDiagnosisSearchQuery("fracture du crâne", "fr")).toBe("skull fracture");
  });

  it("Phase 10 — dent avulsée finds tooth avulsion, distinct from dent cassée (tooth fracture)", () => {
    expect(resolveLocalizedDiagnosisSearchQuery("dent avulsée", "fr")).toBe("tooth avulsion");
    expect(resolveLocalizedDiagnosisSearchQuery("dent cassée", "fr")).toBe("tooth fracture");
  });

  it("Phase 10 — hématome septal finds septal hematoma, distinct from nasal fracture aliases", () => {
    const queries = resolveLocalizedDiagnosisSearchQueries("hématome septal", "fr");
    expect(queries).toContain("septal hematoma");
    expect(queries).not.toContain("nasal fracture");
  });
});
