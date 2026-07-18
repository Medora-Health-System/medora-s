import {
  MK_EXPANSION_WAVE2_ARTIFACTS,
  MK_EXPANSION_WAVE2_CERTIFICATION_ID,
  decideMkExpansionWave2Certification,
} from "./medication-knowledge-expansion-wave2-certification";

describe("Medication Knowledge Expansion Wave 2 certification", () => {
  it("uses Wave 2 certification id", () => {
    expect(MK_EXPANSION_WAVE2_CERTIFICATION_ID).toContain("WAVE_2");
    expect(MK_EXPANSION_WAVE2_ARTIFACTS.length).toBeGreaterThanOrEqual(4);
  });

  it("certifies when coverage and tags are present", () => {
    expect(
      decideMkExpansionWave2Certification({
        schemaOk: true,
        regressionOk: true,
        live: {
          PackCount: 15,
          FamilyUniverse: 80,
          MatchedFamilies: 50,
          CoveragePercent: 62,
          TaggedCatalogRows: 40,
          SearchExpansionKeys: 100,
          DuplicateCatalogCodes: 0,
          AcetaminophenCatalogRows: 1,
          AcetaminophenInPacks: 0,
          ClinicalActivationEnabled: false,
          EnterpriseActiveAllowed: false,
          OrderFromRecommendation: false,
          SecondMedicationMaster: false,
          PackCoverage: [],
        },
      })
    ).toBe("MEDICATION_KNOWLEDGE_EXPANSION_WAVE_2_CERTIFIED");
  });

  it("fails closed on duplicate catalog codes", () => {
    expect(
      decideMkExpansionWave2Certification({
        schemaOk: true,
        regressionOk: true,
        live: {
          PackCount: 15,
          FamilyUniverse: 80,
          MatchedFamilies: 50,
          CoveragePercent: 62,
          TaggedCatalogRows: 40,
          SearchExpansionKeys: 100,
          DuplicateCatalogCodes: 2,
          AcetaminophenCatalogRows: 0,
          AcetaminophenInPacks: 0,
          ClinicalActivationEnabled: false,
          EnterpriseActiveAllowed: false,
          OrderFromRecommendation: false,
          SecondMedicationMaster: false,
          PackCoverage: [],
        },
      })
    ).toBe("MEDICATION_KNOWLEDGE_EXPANSION_WAVE_2_NOT_CERTIFIED");
  });
});
