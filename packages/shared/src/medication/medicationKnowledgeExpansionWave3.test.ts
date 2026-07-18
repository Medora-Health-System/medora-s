import { describe, expect, it } from "vitest";
import {
  MK_EXPANSION_WAVE3_CERTIFICATION_ID,
  MK_EXPANSION_WAVE3_SOURCE_REGISTRY,
  assertMkExpansionWave3SafetyDefaults,
  assertMkExpansionWave3SourceApprovedForIngestion,
  classifyMkExpansionWave3Candidate,
  getMkExpansionWave3Source,
  mkExpansionWave3ConceptCode,
  normalizeMkExpansionWave3ConceptKey,
} from "./medicationKnowledgeExpansionWave3.js";

describe("Medication Knowledge Expansion Wave 3", () => {
  it("uses Wave 3 import-driven certification id", () => {
    expect(MK_EXPANSION_WAVE3_CERTIFICATION_ID).toContain("WAVE_3");
    expect(MK_EXPANSION_WAVE3_CERTIFICATION_ID).toContain("IMPORT_DRIVEN");
  });

  it("registers sources and approves only curated ingest", () => {
    expect(MK_EXPANSION_WAVE3_SOURCE_REGISTRY.length).toBeGreaterThanOrEqual(5);
    expect(getMkExpansionWave3Source("MEDORA_CURATED")?.approvalStatus).toBe(
      "APPROVED_FOR_INGESTION"
    );
    expect(() =>
      assertMkExpansionWave3SourceApprovedForIngestion("MEDORA_CURATED")
    ).not.toThrow();
    expect(() =>
      assertMkExpansionWave3SourceApprovedForIngestion("LICENSED_COMMERCIAL")
    ).toThrow();
    expect(() => assertMkExpansionWave3SourceApprovedForIngestion("RXNORM")).toThrow();
  });

  it("classifies net-new vs existing product vs duplicate", () => {
    const variants = [
      {
        strength: "500 mg",
        dosageForm: "comprimé",
        route: "orale",
        administrationType: "ORAL",
        billingClass: "DRUG_SUPPLY",
      },
    ] as const;

    expect(
      classifyMkExpansionWave3Candidate({
        conceptKey: "brand-new-hospital-drug",
        variants,
        existingNormalizedGenerics: new Set(),
        existingCatalogCodes: new Set(),
      }).outcome
    ).toBe("NEW_CANONICAL_CONCEPT");

    expect(
      classifyMkExpansionWave3Candidate({
        conceptKey: "metformin",
        variants,
        existingNormalizedGenerics: new Set(["metformin"]),
        existingCatalogCodes: new Set(),
      }).outcome
    ).toBe("EXISTING_CONCEPT_NEW_PRODUCT");

    const code = classifyMkExpansionWave3Candidate({
      conceptKey: "metformin",
      variants,
      existingNormalizedGenerics: new Set(["metformin"]),
      existingCatalogCodes: new Set(),
    }).variantActions[0]?.catalogCode;

    expect(
      classifyMkExpansionWave3Candidate({
        conceptKey: "metformin",
        variants,
        existingNormalizedGenerics: new Set(["metformin"]),
        existingCatalogCodes: new Set([code!]),
      }).outcome
    ).toBe("EXISTING_CANONICAL_MATCH");
  });

  it("uses stable concept codes and safety defaults", () => {
    expect(normalizeMkExpansionWave3ConceptKey("  Metformin ")).toBe("metformin");
    expect(mkExpansionWave3ConceptCode("metformin")).toBe("EM_W3C_METFORMIN");
    expect(() => assertMkExpansionWave3SafetyDefaults()).not.toThrow();
  });
});
