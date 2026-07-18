import {
  MK_EXPANSION_WAVE3_CERTIFICATION_ID,
  decideMkExpansionWave3Certification,
} from "./medication-knowledge-expansion-wave3-certification";

describe("Medication Knowledge Expansion Wave 3 certification", () => {
  it("uses Wave 3 certification id", () => {
    expect(MK_EXPANSION_WAVE3_CERTIFICATION_ID).toContain("WAVE_3");
  });

  it("certifies with review items below 2000 distinct generics", () => {
    expect(
      decideMkExpansionWave3Certification({
        schemaOk: true,
        regressionOk: true,
        baselineFabricated: false,
        sourceUnapproved: false,
        fabricatedIdentifiers: false,
        duplicateCanonicalConcepts: 0,
        orphanVariants: 0,
        importIdempotent: true,
        searchOk: true,
        orderingOk: true,
        orderMutations: 0,
        marMutations: 0,
        chartMutations: 0,
        productionCds: 0,
        enterpriseActive: 0,
        recommendationActivations: 0,
        netNewConcepts: 900,
        finalDistinctGenerics: 1858,
        conflictSilentAccept: false,
      })
    ).toBe("MEDICATION_KNOWLEDGE_EXPANSION_WAVE_3_CERTIFIED_WITH_REVIEW_ITEMS");
  });

  it("certifies fully at target", () => {
    expect(
      decideMkExpansionWave3Certification({
        schemaOk: true,
        regressionOk: true,
        baselineFabricated: false,
        sourceUnapproved: false,
        fabricatedIdentifiers: false,
        duplicateCanonicalConcepts: 0,
        orphanVariants: 0,
        importIdempotent: true,
        searchOk: true,
        orderingOk: true,
        orderMutations: 0,
        marMutations: 0,
        chartMutations: 0,
        productionCds: 0,
        enterpriseActive: 0,
        recommendationActivations: 0,
        netNewConcepts: 1050,
        finalDistinctGenerics: 2000,
        conflictSilentAccept: false,
      })
    ).toBe("MEDICATION_KNOWLEDGE_EXPANSION_WAVE_3_CERTIFIED");
  });

  it("fails closed on fabricated identifiers", () => {
    expect(
      decideMkExpansionWave3Certification({
        schemaOk: true,
        regressionOk: true,
        baselineFabricated: false,
        sourceUnapproved: false,
        fabricatedIdentifiers: true,
        duplicateCanonicalConcepts: 0,
        orphanVariants: 0,
        importIdempotent: true,
        searchOk: true,
        orderingOk: true,
        orderMutations: 0,
        marMutations: 0,
        chartMutations: 0,
        productionCds: 0,
        enterpriseActive: 0,
        recommendationActivations: 0,
        netNewConcepts: 1050,
        finalDistinctGenerics: 2000,
        conflictSilentAccept: false,
      })
    ).toBe("MEDICATION_KNOWLEDGE_EXPANSION_WAVE_3_NOT_CERTIFIED");
  });
});
