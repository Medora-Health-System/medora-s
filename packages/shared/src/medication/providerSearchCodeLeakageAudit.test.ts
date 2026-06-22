import { describe, expect, it } from "vitest";
import {
  auditProviderSearchCodeLeakage,
  buildOrderEntryCompatibilityReport,
} from "./providerSearchCanonicalization.js";
import type { MedicationOrderabilityRecord } from "./medicationOrderabilityGovernance.js";

function orderable(partial: Partial<MedicationOrderabilityRecord> & Pick<MedicationOrderabilityRecord, "catalogCode">): MedicationOrderabilityRecord {
  return {
    catalogCode: partial.catalogCode,
    genericName: partial.genericName ?? "Tdap",
    displayNameEn: partial.displayNameEn ?? "Tdap vaccine",
    displayNameFr: partial.displayNameFr ?? "Vaccin Tdap",
    route: partial.route ?? "intramusculaire",
    dosageForm: partial.dosageForm ?? "injectable",
    strength: partial.strength ?? "0.5 mL",
    orderabilityStatus: "ORDERABLE_READY",
    allowedCareSettings: ["OUTPATIENT"],
    allowedRoutes: ["IM"],
    requiresPharmacyReview: false,
    requiresClinicalReview: false,
    restrictedReason: null,
    notOrderableReason: null,
    marDocumentationRequirements: [],
    inventoryNdcLinked: true,
    orderSearchEnabled: true,
    marEnabled: true,
    source: "enterprise",
  };
}

describe("ProviderSearchCodeLeakageAudit and order entry compatibility", () => {
  it("passes live canonical provider-visible values", () => {
    const audit = auditProviderSearchCodeLeakage();
    expect(audit.decision).toBe("PASS");
    expect(audit.internalCatalogCodeLeakage).toBe(0);
  });

  it("detects internal catalog code leakage", () => {
    const audit = auditProviderSearchCodeLeakage([
      orderable({ catalogCode: "BAD", displayNameEn: "TDAP_VACCINE_0_5_ML_INJECTABLE_INJECTABLEINTRAMUSCULAR" }),
    ]);
    expect(audit.decision).toBe("FAIL");
    expect(audit.internalCatalogCodeLeakage).toBe(1);
  });

  it("detects NDC leakage in visible text", () => {
    const audit = auditProviderSearchCodeLeakage([
      orderable({ catalogCode: "NDC_BAD", displayNameEn: "Test 00000-0000-00" }),
    ]);
    expect(audit.ndcLeakage).toBe(1);
  });

  it("detects CVX leakage in visible text", () => {
    const audit = auditProviderSearchCodeLeakage([
      orderable({ catalogCode: "CVX_BAD", displayNameEn: "Tdap CVX 115" }),
    ]);
    expect(audit.cvxLeakage).toBe(1);
  });

  it("audits canonical rows for leakage", () => {
    expect(auditProviderSearchCodeLeakage().rowsAudited).toBeGreaterThan(0);
  });

  it("order entry compatibility passes live canonical variants", () => {
    expect(buildOrderEntryCompatibilityReport().decision).toBe("PASS");
  });

  it("order entry compatibility preserves dose selection", () => {
    expect(buildOrderEntryCompatibilityReport().doseSelectionPreserved).toBe(true);
  });

  it("order entry compatibility preserves route selection", () => {
    expect(buildOrderEntryCompatibilityReport().routeSelectionPreserved).toBe(true);
  });

  it("order entry compatibility preserves MAR linkage", () => {
    expect(buildOrderEntryCompatibilityReport().marLinkagePreserved).toBe(true);
  });

  it("order entry compatibility preserves inventory linkage", () => {
    expect(buildOrderEntryCompatibilityReport().inventoryLinkagePreserved).toBe(true);
  });

  it("order entry compatibility preserves NDC and CVX linkage surfaces", () => {
    const report = buildOrderEntryCompatibilityReport();
    expect(report.ndcLinkagePreserved).toBe(true);
    expect(report.cvxLinkagePreserved).toBe(true);
  });

  it("order entry compatibility audits variants", () => {
    const report = buildOrderEntryCompatibilityReport();
    expect(report.variantsAudited).toBeGreaterThan(0);
    expect(report.canonicalResultsAudited).toBeGreaterThan(0);
  });
});
