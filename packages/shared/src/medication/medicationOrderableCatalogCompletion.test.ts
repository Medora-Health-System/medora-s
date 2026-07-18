import { describe, expect, it } from "vitest";
import {
  MEDICATION_ORDERABLE_CATALOG_COMPLETION_CERTIFICATION_ID,
  classifyCatalogOrderability,
  decideMedicationOrderableCatalogCompletion,
  deriveDosageFormFromExistingText,
  deriveStrengthFromExistingText,
} from "./medicationOrderableCatalogCompletion.js";

describe("Medication Orderable Catalog Completion", () => {
  it("uses completion certification id", () => {
    expect(MEDICATION_ORDERABLE_CATALOG_COMPLETION_CERTIFICATION_ID).toContain(
      "ORDERABLE_CATALOG_COMPLETION"
    );
  });

  it("classifies ready catalogs as orderable", () => {
    const r = classifyCatalogOrderability({
      code: "METFORMIN_500_MG_COMPRIME_ORAL",
      name: "Metformin",
      genericName: "Metformin",
      strength: "500 mg",
      dosageForm: "comprimé",
      route: "orale",
      isActive: true,
    });
    expect(r.orderable).toBe(true);
    expect(r.blocker).toBe("NONE");
  });

  it("derives strength and form from existing text only", () => {
    expect(deriveStrengthFromExistingText("Morphine 10 mg/mL")).toBe("10 mg/mL");
    expect(deriveDosageFormFromExistingText("Vancomycin injection")).toBe(
      "solution injectable"
    );
    expect(deriveStrengthFromExistingText("Vancomycin")).toBeNull();
  });

  it("certifies at high coverage", () => {
    expect(
      decideMedicationOrderableCatalogCompletion({
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
});
