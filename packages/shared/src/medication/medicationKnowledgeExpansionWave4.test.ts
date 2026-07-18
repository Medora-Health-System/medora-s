import { describe, expect, it } from "vitest";
import {
  MK_EXPANSION_WAVE4_CERTIFICATION_ID,
  MK_EXPANSION_WAVE4_CONCEPT_PREFIX,
  MK_EXPANSION_WAVE4_TARGET_TOTAL_GENERICS,
  assertMkExpansionWave4SafetyDefaults,
  classifyMkExpansionWave4Candidate,
  mkExpansionWave4ConceptCode,
  normalizeMkExpansionWave4ConceptKey,
} from "./medicationKnowledgeExpansionWave4.js";

describe("Medication Knowledge Expansion Wave 4", () => {
  it("uses Wave 4 certification id and target", () => {
    expect(MK_EXPANSION_WAVE4_CERTIFICATION_ID).toContain("WAVE_4");
    expect(MK_EXPANSION_WAVE4_TARGET_TOTAL_GENERICS).toBe(5000);
    expect(MK_EXPANSION_WAVE4_CONCEPT_PREFIX).toBe("EM_W4C_");
  });

  it("keeps safety defaults", () => {
    expect(() => assertMkExpansionWave4SafetyDefaults()).not.toThrow();
  });

  it("normalizes concept keys deterministically", () => {
    expect(normalizeMkExpansionWave4ConceptKey("Metformin HCl")).toBe("metformin hcl");
    expect(mkExpansionWave4ConceptCode("metformin")).toBe("EM_W4C_METFORMIN");
  });

  it("classifies new vs existing concepts", () => {
    const existing = new Set(["metformin"]);
    const codes = new Set<string>();
    const neu = classifyMkExpansionWave4Candidate({
      conceptKey: "bimekizumab",
      variants: [
        {
          strength: "160 mg",
          dosageForm: "injection",
          route: "sous-cutanee",
          administrationType: "INJECTION",
          billingClass: "DRUG_SUPPLY",
        },
      ],
      existingNormalizedGenerics: existing,
      existingCatalogCodes: codes,
    });
    expect(neu.netNewConcept).toBe(true);
    expect(neu.outcome).toBe("NEW_CANONICAL_CONCEPT");

    const match = classifyMkExpansionWave4Candidate({
      conceptKey: "metformin",
      variants: [
        {
          strength: "500 mg",
          dosageForm: "comprimé",
          route: "orale",
          administrationType: "ORAL",
          billingClass: "DRUG_SUPPLY",
        },
      ],
      existingNormalizedGenerics: existing,
      existingCatalogCodes: codes,
    });
    expect(match.netNewConcept).toBe(false);
    expect(match.outcome).toBe("EXISTING_CONCEPT_NEW_PRODUCT");
  });
});
