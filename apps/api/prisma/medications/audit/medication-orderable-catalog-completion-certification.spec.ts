import {
  MEDICATION_ORDERABLE_CATALOG_COMPLETION_CERTIFICATION_ID,
  decideOrderableCatalogCompletionCertification,
} from "./medication-orderable-catalog-completion-certification";

describe("Medication Orderable Catalog Completion certification", () => {
  it("uses orderable catalog completion id", () => {
    expect(MEDICATION_ORDERABLE_CATALOG_COMPLETION_CERTIFICATION_ID).toContain(
      "ORDERABLE_CATALOG_COMPLETION"
    );
  });

  it("certifies with review items below 99% coverage", () => {
    expect(
      decideOrderableCatalogCompletionCertification({
        schemaOk: true,
        regressionOk: true,
        coveragePercent: 97,
        commonClinicalSearchPassRate: 1,
        fabricatedData: false,
        dualLayerBulkActivated: false,
        orderMutations: 0,
        marMutations: 0,
        chartMutations: 0,
        cdsActivations: 0,
        importIdempotent: true,
      })
    ).toBe("MEDICATION_ORDERABLE_CATALOG_COMPLETION_CERTIFIED_WITH_REVIEW_ITEMS");
  });

  it("certifies fully at high coverage", () => {
    expect(
      decideOrderableCatalogCompletionCertification({
        schemaOk: true,
        regressionOk: true,
        coveragePercent: 99.5,
        commonClinicalSearchPassRate: 1,
        fabricatedData: false,
        dualLayerBulkActivated: false,
        orderMutations: 0,
        marMutations: 0,
        chartMutations: 0,
        cdsActivations: 0,
        importIdempotent: true,
      })
    ).toBe("MEDICATION_ORDERABLE_CATALOG_COMPLETION_CERTIFIED");
  });

  it("fails closed on dual-layer bulk activation", () => {
    expect(
      decideOrderableCatalogCompletionCertification({
        schemaOk: true,
        regressionOk: true,
        coveragePercent: 99.5,
        commonClinicalSearchPassRate: 1,
        fabricatedData: false,
        dualLayerBulkActivated: true,
        orderMutations: 0,
        marMutations: 0,
        chartMutations: 0,
        cdsActivations: 0,
        importIdempotent: true,
      })
    ).toBe("MEDICATION_ORDERABLE_CATALOG_COMPLETION_NOT_CERTIFIED");
  });
});
