import { describe, expect, it } from "vitest";
import {
  buildVaccineCanonicalFamilyReport,
  TDAP_CANONICAL_CATALOG_CODE,
} from "./medicationCanonicalNormalization.js";

describe("VaccineCanonicalFamilyReport", () => {
  it("includes the required vaccine family list", () => {
    const report = buildVaccineCanonicalFamilyReport();
    expect(report.expectedFamilies).toContain("tdap");
    expect(report.expectedFamilies).toContain("influenza");
    expect(report.expectedFamilies).toContain("hpv");
  });

  it("finds the Tdap canonical vaccine family", () => {
    const report = buildVaccineCanonicalFamilyReport();
    expect(report.presentFamilies).toContain("tdap");
  });

  it("keeps manufacturer catalog centralized", () => {
    const report = buildVaccineCanonicalFamilyReport();
    expect(report.manufacturerCatalogCentralized).toBe(true);
    expect(report.manufacturerCount).toBeGreaterThan(0);
  });

  it("keeps VIS governance attached for Tdap", () => {
    const report = buildVaccineCanonicalFamilyReport();
    expect(report.visGovernancePresent).toBe(true);
  });

  it("reports CVX-linked vaccine families", () => {
    const report = buildVaccineCanonicalFamilyReport();
    expect(report.cvxLinkedFamilies.length).toBeGreaterThan(0);
  });

  it("reports billing-linked vaccine families", () => {
    const report = buildVaccineCanonicalFamilyReport();
    expect(report.billingLinkedFamilies.length).toBeGreaterThan(0);
  });

  it("passes when core Tdap governance sources are present", () => {
    const report = buildVaccineCanonicalFamilyReport();
    expect(report.decision).toBe("PASS");
    expect(report.blockers).toEqual([]);
  });

  it("exports the canonical Tdap catalog code", () => {
    expect(TDAP_CANONICAL_CATALOG_CODE).toContain("TDAP");
  });
});
