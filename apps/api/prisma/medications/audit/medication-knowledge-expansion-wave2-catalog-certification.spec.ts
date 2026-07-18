import {
  MK_EXPANSION_WAVE2_CATALOG_CERTIFICATION_ID,
  decideMkExpansionWave2CatalogCertification,
} from "./medication-knowledge-expansion-wave2-catalog-certification";

describe("Medication Knowledge Expansion Wave 2 catalog certification", () => {
  it("uses catalog certification id", () => {
    expect(MK_EXPANSION_WAVE2_CATALOG_CERTIFICATION_ID).toContain(
      "EMERGENCY_MEDICINE_CATALOG"
    );
  });

  it("certifies with review items when below 750 net-new", () => {
    expect(
      decideMkExpansionWave2CatalogCertification({
        schemaOk: true,
        regressionOk: true,
        baselineFabricated: false,
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
        netNewConcepts: 600,
        conflictSilentAccept: false,
      })
    ).toBe("MEDICATION_KNOWLEDGE_EXPANSION_WAVE_2_CERTIFIED_WITH_REVIEW_ITEMS");
  });

  it("certifies fully at or above target", () => {
    expect(
      decideMkExpansionWave2CatalogCertification({
        schemaOk: true,
        regressionOk: true,
        baselineFabricated: false,
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
        netNewConcepts: 750,
        conflictSilentAccept: false,
      })
    ).toBe("MEDICATION_KNOWLEDGE_EXPANSION_WAVE_2_CERTIFIED");
  });

  it("fails closed on order mutations", () => {
    expect(
      decideMkExpansionWave2CatalogCertification({
        schemaOk: true,
        regressionOk: true,
        baselineFabricated: false,
        duplicateCanonicalConcepts: 0,
        orphanVariants: 0,
        importIdempotent: true,
        searchOk: true,
        orderingOk: true,
        orderMutations: 1,
        marMutations: 0,
        chartMutations: 0,
        productionCds: 0,
        enterpriseActive: 0,
        netNewConcepts: 750,
        conflictSilentAccept: false,
      })
    ).toBe("MEDICATION_KNOWLEDGE_EXPANSION_WAVE_2_NOT_CERTIFIED");
  });
});
