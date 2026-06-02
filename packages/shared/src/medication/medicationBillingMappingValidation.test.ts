import { describe, expect, it } from "vitest";
import {
  MEDICATION_BILLING_MAPPING_BY_CODE,
  MEDICATION_BILLING_MAPPING_COVERAGE_THRESHOLD_PCT,
  MEDICATION_BILLING_MAPPING_ENTRIES,
} from "./medicationBillingMappingManifest.js";
import { MEDICATION_BILLING_NDC_BY_CATALOG_CODE } from "./medicationBillingNdcByCatalogCode.js";
import {
  assertMedicationBillingMappingManifest,
  computeMedicationBillingCoverageReport,
  medicationBillingCoverageMeetsThreshold,
  resolveMedicationHcpcsForCatalogRow,
  validateGovernanceMedicationsHaveBillingMappings,
  validateMedicationBillingMappingManifest,
  validateMedicationBillingNdcLinkage,
  validateMedicationRevenuePathReadiness,
} from "./medicationBillingMappingValidation.js";

describe("medicationBillingMappingManifest", () => {
  it("manifest is valid and has no duplicate catalog codes", () => {
    expect(() => assertMedicationBillingMappingManifest()).not.toThrow();
    expect(validateMedicationBillingMappingManifest()).toEqual([]);
    expect(MEDICATION_BILLING_MAPPING_ENTRIES.length).toBeGreaterThan(80);
  });

  it("meets coverage threshold when catalog rows mirror manifest defaults", () => {
    const catalogRows = MEDICATION_BILLING_MAPPING_ENTRIES.map((e) => ({
      code: e.catalogCode,
      billingCodeDefault: e.hcpcs,
      dosageForm: "injectable",
      route: "intraveineuse",
      administrationType: "PUSH",
      isActive: true,
    }));
    const report = computeMedicationBillingCoverageReport(catalogRows);
    expect(report.billableMedications).toBe(catalogRows.length);
    expect(medicationBillingCoverageMeetsThreshold(report)).toBe(true);
    expect(report.coveragePct).toBeGreaterThanOrEqual(MEDICATION_BILLING_MAPPING_COVERAGE_THRESHOLD_PCT);
  });

  it("resolves HCPCS (J-code) for morphine", () => {
    const code = "MORPHINE_10_MG_PER_ML_INJECTABLE_INJECTION";
    expect(resolveMedicationHcpcsForCatalogRow({ code, billingCodeDefault: null })).toBe("J2270");
    expect(MEDICATION_BILLING_MAPPING_BY_CODE[code]?.hcpcs).toBe("J2270");
  });

  it("NDC manifest entries normalize to 11 digits", () => {
    expect(Object.keys(MEDICATION_BILLING_NDC_BY_CATALOG_CODE).length).toBeGreaterThan(15);
    for (const entry of Object.values(MEDICATION_BILLING_NDC_BY_CATALOG_CODE)) {
      expect(entry.ndc11).toMatch(/^\d{11}$/);
      expect(entry.ndcDisplay).toMatch(/^\d{5}-\d{4}-\d{2}$/);
    }
  });

  it("NDC linkage passes when catalog rows mirror NDC manifest", () => {
    const catalogRows = Object.entries(MEDICATION_BILLING_NDC_BY_CATALOG_CODE).map(([code, ndc]) => ({
      code,
      ndc11: ndc.ndc11,
      dosageForm: "injectable",
      route: "intraveineuse",
      isActive: true,
    }));
    const result = validateMedicationBillingNdcLinkage(catalogRows);
    expect(result.pass).toBe(true);
    expect(result.invalidNdc).toEqual([]);
    expect(result.duplicateNdcAcrossCatalog).toEqual([]);
  });

  it("controlled and high-alert manifest codes have HCPCS mappings", () => {
    const sensitiveCodes = MEDICATION_BILLING_MAPPING_ENTRIES.map((e) => e.catalogCode).filter((code) =>
      /MORPHINE|FENTANYL|HYDROMORPHONE|MIDAZOLAM|KETAMINE|HEPARIN|INSULIN|METHYLPREDNISOLONE/.test(code)
    );
    expect(sensitiveCodes.length).toBeGreaterThan(5);
    const result = validateGovernanceMedicationsHaveBillingMappings(sensitiveCodes);
    expect(result.pass).toBe(true);
    expect(result.missingBillingMapping).toEqual([]);
  });

  it("revenue path validation passes for manifest-backed catalog rows", () => {
    const catalogRows = MEDICATION_BILLING_MAPPING_ENTRIES.map((e) => ({
      code: e.catalogCode,
      billingCodeDefault: e.hcpcs,
      ndc11: MEDICATION_BILLING_NDC_BY_CATALOG_CODE[e.catalogCode]?.ndc11 ?? null,
      dosageForm: "injectable",
      route: "injectable",
      administrationType: "PUSH",
      isActive: true,
    }));
    const result = validateMedicationRevenuePathReadiness(catalogRows);
    expect(result.pass).toBe(true);
    expect(result.brokenCatalogCodes).toEqual([]);
  });
});
