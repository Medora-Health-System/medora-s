import {
  medicationFormularyImportStagingPromotionFixture,
  medicationFormularyImportStagingPromotionSelect,
} from "./medication-formulary-import-staging.types";

describe("medication-formulary-import-staging.types", () => {
  it("promotion select includes sourceInventorySku", () => {
    expect(medicationFormularyImportStagingPromotionSelect.sourceInventorySku).toBe(true);
    expect(medicationFormularyImportStagingPromotionSelect.sourceRowId).toBe(true);
    expect(medicationFormularyImportStagingPromotionSelect.sourceInventoryDescription).toBe(true);
  });

  it("fixture provides nullable sourceInventorySku", () => {
    const row = medicationFormularyImportStagingPromotionFixture();
    expect(row.sourceInventorySku).toBeNull();
    expect(row.sourceInventoryDescription.length).toBeGreaterThan(0);
  });
});
