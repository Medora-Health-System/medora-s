import {
  buildDualLayerLinkageAuditRow,
  shouldExcludeFromProductionSearch,
  summarizeRxNormMappingAudit,
} from "./medication-phase2-foundation.util";

describe("medication-phase2-foundation.util", () => {
  describe("buildDualLayerLinkageAuditRow", () => {
    it("defaults to UNLINKED and flags legacy FK without verification", () => {
      const row = buildDualLayerLinkageAuditRow({
        productId: "prod-1",
        productCode: "PROD_CODE",
        legacyCatalogMedicationId: "legacy-1",
        catalogCode: "GENERIC_MST_abc",
      });
      expect(row.dualLayerLinkageStatus).toBe("UNLINKED");
      expect(row.hasLegacyFkButUnverified).toBe(true);
      expect(row.dataClassification).toBe("FIXTURE");
    });

    it("clears unverified flag when status is VERIFIED", () => {
      const row = buildDualLayerLinkageAuditRow({
        productId: "prod-2",
        productCode: "PROD_CODE_2",
        legacyCatalogMedicationId: "legacy-2",
        dualLayerLinkageStatus: "VERIFIED",
        catalogCode: "LISINOPRIL_10",
      });
      expect(row.hasLegacyFkButUnverified).toBe(false);
      expect(row.dataClassification).toBe("PRODUCTION");
    });
  });

  describe("shouldExcludeFromProductionSearch", () => {
    it("does not exclude by default (runtime search unchanged)", () => {
      expect(
        shouldExcludeFromProductionSearch({
          dataClassification: "FIXTURE",
          code: "GENERIC_MST_x",
        })
      ).toBe(false);
      expect(
        shouldExcludeFromProductionSearch({
          dataClassification: "FIXTURE",
          code: "GENERIC_MST_x",
          excludeFixtures: false,
        })
      ).toBe(false);
    });

    it("excludes fixture classifications only when excludeFixtures is true", () => {
      expect(
        shouldExcludeFromProductionSearch({
          dataClassification: "FIXTURE",
          code: "ANY_CODE",
          excludeFixtures: true,
        })
      ).toBe(true);

      expect(
        shouldExcludeFromProductionSearch({
          dataClassification: "PRODUCTION",
          code: "LISINOPRIL_10",
          excludeFixtures: true,
        })
      ).toBe(false);

      expect(
        shouldExcludeFromProductionSearch({
          code: "KCL_MST_abc",
          excludeFixtures: true,
        })
      ).toBe(true);
    });
  });

  describe("summarizeRxNormMappingAudit", () => {
    it("requires RxCUI for verified summary", () => {
      expect(
        summarizeRxNormMappingAudit({
          conceptId: "c1",
          rxNormMappingStatus: "VERIFIED",
          rxNormConceptId: "12345",
        }).verified
      ).toBe(true);

      expect(
        summarizeRxNormMappingAudit({
          conceptId: "c2",
          rxNormMappingStatus: "VERIFIED",
        }).verified
      ).toBe(false);
    });
  });
});
