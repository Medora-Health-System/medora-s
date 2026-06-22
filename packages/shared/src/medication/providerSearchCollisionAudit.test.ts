import { describe, expect, it } from "vitest";
import { buildProviderSearchDuplicateRiskReport } from "./medicationCanonicalNormalization.js";
import { buildUnifiedOrderabilityMap } from "./medicationOrderabilityCertification.js";
import type { MedicationOrderabilityRecord } from "./medicationOrderabilityGovernance.js";

function orderable(partial: Partial<MedicationOrderabilityRecord> & Pick<MedicationOrderabilityRecord, "catalogCode">): MedicationOrderabilityRecord {
  return {
    catalogCode: partial.catalogCode,
    genericName: partial.genericName ?? "Tdap",
    displayNameEn: partial.displayNameEn ?? "Tdap Vaccine",
    displayNameFr: partial.displayNameFr ?? "Vaccin Tdap",
    route: partial.route ?? "intramusculaire",
    dosageForm: partial.dosageForm ?? "injectable",
    strength: partial.strength ?? "0.5 mL",
    orderabilityStatus: "ORDERABLE_READY",
    allowedCareSettings: partial.allowedCareSettings ?? ["OUTPATIENT"],
    allowedRoutes: partial.allowedRoutes ?? ["IM"],
    requiresPharmacyReview: partial.requiresPharmacyReview ?? false,
    requiresClinicalReview: partial.requiresClinicalReview ?? false,
    restrictedReason: null,
    notOrderableReason: null,
    marDocumentationRequirements: partial.marDocumentationRequirements ?? [],
    inventoryNdcLinked: partial.inventoryNdcLinked ?? true,
    orderSearchEnabled: true,
    marEnabled: partial.marEnabled ?? true,
    source: partial.source ?? "enterprise",
  };
}

describe("ProviderSearchDuplicateRiskReport", () => {
  it("audits provider-orderable rows only", () => {
    const report = buildProviderSearchDuplicateRiskReport();
    const liveOrderable = [...buildUnifiedOrderabilityMap().values()].filter(
      (r) => r.orderabilityStatus === "ORDERABLE_READY" && r.orderSearchEnabled
    );
    expect(report.orderableRowsAudited).toBe(liveOrderable.length);
  });

  it("detects duplicate display rows with same strength and route", () => {
    const report = buildProviderSearchDuplicateRiskReport([
      orderable({ catalogCode: "TYLENOL_500", genericName: "Acetaminophen", displayNameEn: "Tylenol" }),
      orderable({ catalogCode: "ACETAMINOPHEN_500", genericName: "Acetaminophen", displayNameEn: "Tylenol" }),
    ]);
    expect(report.duplicateDisplayRows).toBe(1);
    expect(report.decision).toBe("UNSAFE");
  });

  it("does not treat valid strength variants as duplicate display rows", () => {
    const report = buildProviderSearchDuplicateRiskReport([
      orderable({ catalogCode: "LISINOPRIL_5", genericName: "Lisinopril", displayNameEn: "Lisinopril", strength: "5 mg" }),
      orderable({ catalogCode: "LISINOPRIL_10", genericName: "Lisinopril", displayNameEn: "Lisinopril", strength: "10 mg" }),
    ]);
    expect(report.duplicateDisplayRows).toBe(0);
  });

  it("detects near-identical Tdap display rows", () => {
    const report = buildProviderSearchDuplicateRiskReport([
      orderable({ catalogCode: "TDAP_A", displayNameEn: "Tdap Vaccine" }),
      orderable({ catalogCode: "TDAP_B", displayNameEn: "Tdap Vaccine IM" }),
    ]);
    expect(report.nearIdenticalDisplayRows).toBeGreaterThan(0);
  });

  it("detects internal catalog code leakage in English display", () => {
    const report = buildProviderSearchDuplicateRiskReport([
      orderable({
        catalogCode: "TDAP_BAD",
        displayNameEn: "TDAP_VACCINE_0_5_ML_INJECTABLE_INJECTABLEINTRAMUSCULAR",
      }),
    ]);
    expect(report.internalCodeLeakageRows).toBe(1);
    expect(report.decision).toBe("UNSAFE");
  });

  it("detects internal catalog code leakage in French display", () => {
    const report = buildProviderSearchDuplicateRiskReport([
      orderable({
        catalogCode: "TDAP_BAD_FR",
        displayNameFr: "TDAP_VACCINE_0_5_ML_INJECTABLE_INJECTABLEINTRAMUSCULAR",
      }),
    ]);
    expect(report.rows.some((r) => r.kind === "INTERNAL_CODE_LEAKAGE")).toBe(true);
  });

  it("reports SAFE for a clean single orderable row", () => {
    const report = buildProviderSearchDuplicateRiskReport([
      orderable({ catalogCode: "CLEAN_ACETAMINOPHEN", genericName: "Acetaminophen", displayNameEn: "Acetaminophen" }),
    ]);
    expect(report.decision).toBe("SAFE");
  });

  it("returns risk rows with involved catalog codes", () => {
    const report = buildProviderSearchDuplicateRiskReport([
      orderable({ catalogCode: "DUP_A", displayNameEn: "Duplicate" }),
      orderable({ catalogCode: "DUP_B", displayNameEn: "Duplicate" }),
    ]);
    expect(report.rows[0]?.catalogCodes).toContain("DUP_A");
    expect(report.rows[0]?.catalogCodes).toContain("DUP_B");
  });
});
