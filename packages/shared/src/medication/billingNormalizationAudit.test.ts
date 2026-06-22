import { describe, expect, it } from "vitest";
import { buildMedicationBillingNormalizationReport } from "./medicationCanonicalNormalization.js";

describe("MedicationBillingNormalizationReport", () => {
  it("audits billing and NDC manifests", () => {
    const report = buildMedicationBillingNormalizationReport();
    expect(report.billingRowsAudited).toBeGreaterThan(0);
    expect(report.ndcRowsAudited).toBeGreaterThan(0);
  });

  it("reports duplicate HCPCS mapping count", () => {
    const report = buildMedicationBillingNormalizationReport();
    expect(report.duplicateHcpcsMappings).toBeGreaterThanOrEqual(0);
  });

  it("reports duplicate NDC mapping count", () => {
    const report = buildMedicationBillingNormalizationReport();
    expect(report.duplicateNdcMappings).toBeGreaterThanOrEqual(0);
  });

  it("reports conflicting mapping count", () => {
    const report = buildMedicationBillingNormalizationReport();
    expect(report.conflictingMappings).toBe(0);
  });

  it("flags RxNorm as an explicit remaining MVP gap", () => {
    const report = buildMedicationBillingNormalizationReport();
    expect(report.missingRxNormRows).toBeGreaterThan(0);
    expect(report.rows.some((r) => r.kind === "RXNORM_MISSING")).toBe(true);
  });

  it("does not fail solely because RxNorm is not yet modeled", () => {
    const report = buildMedicationBillingNormalizationReport();
    expect(report.decision).toBe("PASS");
  });

  it("does not report obsolete mapping warnings without an obsolete source", () => {
    const report = buildMedicationBillingNormalizationReport();
    expect(report.obsoleteMappingWarnings).toBe(0);
  });

  it("includes catalog codes on normalization rows", () => {
    const report = buildMedicationBillingNormalizationReport();
    expect(report.rows.every((row) => row.catalogCodes.length > 0)).toBe(true);
  });
});
