import { describe, expect, it } from "vitest";
import {
  buildVaccineSearchGovernanceReport,
} from "./providerSearchCanonicalization.js";

describe("VaccineSearchGovernanceReport", () => {
  it("audits expected vaccine search families", () => {
    const report = buildVaccineSearchGovernanceReport();
    expect(report.expectedFamilies).toContain("tdap");
    expect(report.expectedFamilies).toContain("meningococcal");
  });

  it("preserves Tdap vaccine search family", () => {
    expect(buildVaccineSearchGovernanceReport().presentFamilies).toContain("tdap");
  });

  it("preserves influenza vaccine search family when orderable", () => {
    expect(buildVaccineSearchGovernanceReport().presentFamilies).toContain("influenza");
  });

  it("preserves manufacturer selection", () => {
    expect(buildVaccineSearchGovernanceReport().manufacturerSelectable).toBe(true);
  });

  it("preserves lot tracking", () => {
    expect(buildVaccineSearchGovernanceReport().lotTrackingPreserved).toBe(true);
  });

  it("preserves expiration tracking", () => {
    expect(buildVaccineSearchGovernanceReport().expirationPreserved).toBe(true);
  });

  it("preserves VIS workflow", () => {
    expect(buildVaccineSearchGovernanceReport().visWorkflowPreserved).toBe(true);
  });

  it("preserves CVX linkage", () => {
    expect(buildVaccineSearchGovernanceReport().cvxPreserved).toBe(true);
  });

  it("preserves billing linkage", () => {
    expect(buildVaccineSearchGovernanceReport().billingPreserved).toBe(true);
  });

  it("does not duplicate canonical vaccine rows", () => {
    expect(buildVaccineSearchGovernanceReport().duplicateVaccineRows).toBe(0);
  });

  it("passes vaccine search governance when Tdap governance sources exist", () => {
    const report = buildVaccineSearchGovernanceReport();
    expect(report.decision).toBe("PASS");
    expect(report.blockers).toEqual([]);
  });

  it("keeps restricted vaccines governed without adding provider-search rows", () => {
    const report = buildVaccineSearchGovernanceReport();
    expect(report.presentFamilies).toContain("tdap");
    expect(report.duplicateVaccineRows).toBe(0);
  });
});
