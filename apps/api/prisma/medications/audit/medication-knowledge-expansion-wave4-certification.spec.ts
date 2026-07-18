import {
  MK_EXPANSION_WAVE4_CERTIFICATION_ID,
  decideMkExpansionWave4Certification,
} from "./medication-knowledge-expansion-wave4-certification";

describe("Medication Knowledge Expansion Wave 4 certification", () => {
  it("uses Wave 4 certification id", () => {
    expect(MK_EXPANSION_WAVE4_CERTIFICATION_ID).toContain("WAVE_4");
  });

  it("certifies with review items below 5000 distinct generics", () => {
    expect(
      decideMkExpansionWave4Certification({
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
        netNewConcepts: 2400,
        finalDistinctGenerics: 4400,
        conflictSilentAccept: false,
      })
    ).toBe("MEDICATION_KNOWLEDGE_EXPANSION_WAVE_4_CERTIFIED_WITH_REVIEW_ITEMS");
  });

  it("certifies fully at target", () => {
    expect(
      decideMkExpansionWave4Certification({
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
        netNewConcepts: 3000,
        finalDistinctGenerics: 5000,
        conflictSilentAccept: false,
      })
    ).toBe("MEDICATION_KNOWLEDGE_EXPANSION_WAVE_4_CERTIFIED");
  });

  it("fails closed on fabricated identifiers", () => {
    expect(
      decideMkExpansionWave4Certification({
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
        netNewConcepts: 3000,
        finalDistinctGenerics: 5000,
        conflictSilentAccept: false,
      })
    ).toBe("MEDICATION_KNOWLEDGE_EXPANSION_WAVE_4_NOT_CERTIFIED");
  });
});
