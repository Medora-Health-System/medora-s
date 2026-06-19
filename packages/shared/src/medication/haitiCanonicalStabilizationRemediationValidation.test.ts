import { describe, expect, it } from "vitest";
import {
  classifyLegacyLinkRow,
  isInvalidLegacyLinkage,
  isProviderSearchPollutionCatalogCode,
} from "./haitiCanonicalStabilizationRemediation.js";
import {
  validateM15eBackfillReadiness,
  validateQuarantineRemediationEnforcement,
  validateSearchScenarios,
} from "./haitiCanonicalStabilizationRemediationValidation.js";

describe("haitiCanonicalStabilizationRemediation (M1.5R)", () => {
  it("flags 19G and PRI_ER catalog codes as search pollution", () => {
    expect(isProviderSearchPollutionCatalogCode("19G1-ACET-123")).toBe(true);
    expect(isProviderSearchPollutionCatalogCode("PRI_ER_ACET_X")).toBe(true);
    expect(isProviderSearchPollutionCatalogCode("PARACETAMOL_1_G_COMPRIME_ORAL")).toBe(false);
  });

  it("detects invalid acet clone link to Haiti catalog", () => {
    expect(
      isInvalidLegacyLinkage({
        productId: "p1",
        productCode: "19G1-ACET-1",
        conceptGenericName: "Acetaminophen",
        baselineAvailable: false,
        legacyCatalogMedicationId: "cat-1",
        catalogCode: "PARACETAMOL_1_G_COMPRIME_ORAL",
        catalogExists: true,
      })
    ).toBe(true);
  });

  it("classifies manifest-aligned link as correct", () => {
    const row = classifyLegacyLinkRow({
      productId: "p1",
      productCode: "ONDANSETRON_4_MG_COMPRIME_ORAL",
      conceptGenericName: "Ondansetron",
      baselineAvailable: false,
      legacyCatalogMedicationId: "cat-1",
      catalogCode: "ONDANSETRON_4_MG_COMPRIME_ORAL",
      catalogExists: true,
    });
    expect(row.classification).toBe("CORRECT");
  });

  it("enforces quarantine remediation rules", () => {
    const result = validateQuarantineRemediationEnforcement();
    expect(result.pass).toBe(true);
  });

  it("expects 190 M1.5E processable linkage targets", () => {
    const readiness = validateM15eBackfillReadiness([]);
    expect(readiness.processable).toBe(190);
    expect(readiness.manualReview).toBe(59);
    expect(readiness.score).toBeGreaterThan(70);
  });

  it("fails acetaminophen search when clone catalog rows present", () => {
    const scenarios = validateSearchScenarios([
      { code: "19G1-ACET-1", genericName: "Acetaminophen" },
      { code: "PARACETAMOL_1_G_COMPRIME_ORAL", genericName: "Paracetamol" },
    ]);
    const acet = scenarios.find((s) => s.query === "acetaminophen");
    expect(acet?.pass).toBe(false);
    expect(acet?.cloneHits).toBeGreaterThan(0);
  });
});
