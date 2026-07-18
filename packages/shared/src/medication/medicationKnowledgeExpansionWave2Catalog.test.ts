import { describe, expect, it } from "vitest";
import {
  MK_EXPANSION_WAVE2_CATALOG_CERTIFICATION_ID,
  MK_EXPANSION_WAVE2_CATALOG_DEFAULTS,
  assertMkExpansionWave2CatalogSafetyDefaults,
  classifyMkExpansionWave2Candidate,
  mkExpansionWave2CatalogConceptCode,
  normalizeMkExpansionWave2ConceptKey,
} from "./medicationKnowledgeExpansionWave2Catalog.js";

describe("Medication Knowledge Expansion Wave 2 catalog", () => {
  it("uses catalog certification id", () => {
    expect(MK_EXPANSION_WAVE2_CATALOG_CERTIFICATION_ID).toContain(
      "EMERGENCY_MEDICINE_CATALOG"
    );
    expect(MK_EXPANSION_WAVE2_CATALOG_DEFAULTS.targetNetNewConcepts).toBe(750);
  });

  it("normalizes concept keys and stable concept codes", () => {
    expect(normalizeMkExpansionWave2ConceptKey("  Epinephrine ")).toBe(
      "epinephrine"
    );
    expect(mkExpansionWave2CatalogConceptCode("epinephrine")).toBe(
      "EM_W2C_EPINEPHRINE"
    );
  });

  it("classifies net-new vs existing vs duplicate", () => {
    const variants = [
      {
        strength: "1 mg/mL",
        dosageForm: "injectable",
        route: "intraveineuse",
        administrationType: "PUSH",
        billingClass: "THERAPEUTIC",
      },
    ] as const;

    expect(
      classifyMkExpansionWave2Candidate({
        conceptKey: "brand-new-ed-drug",
        variants,
        existingNormalizedGenerics: new Set(),
        existingCatalogCodes: new Set(),
      }).outcome
    ).toBe("NEW_CANONICAL_CONCEPT");

    expect(
      classifyMkExpansionWave2Candidate({
        conceptKey: "epinephrine",
        variants,
        existingNormalizedGenerics: new Set(["epinephrine"]),
        existingCatalogCodes: new Set(),
      }).outcome
    ).toBe("EXISTING_CONCEPT_NEW_VARIANT");

    const code = classifyMkExpansionWave2Candidate({
      conceptKey: "epinephrine",
      variants,
      existingNormalizedGenerics: new Set(["epinephrine"]),
      existingCatalogCodes: new Set(),
    }).variantActions[0]?.catalogCode;

    expect(
      classifyMkExpansionWave2Candidate({
        conceptKey: "epinephrine",
        variants,
        existingNormalizedGenerics: new Set(["epinephrine"]),
        existingCatalogCodes: new Set([code!]),
      }).outcome
    ).toBe("DUPLICATE_REJECTED");
  });

  it("fails closed on unsafe defaults", () => {
    expect(() => assertMkExpansionWave2CatalogSafetyDefaults()).not.toThrow();
  });
});
