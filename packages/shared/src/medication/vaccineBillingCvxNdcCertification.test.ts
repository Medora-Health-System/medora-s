import { describe, expect, it } from "vitest";
import { buildVaccineBillingCvxNdcCertificationReport } from "./vaccineBillingCvxNdcCertification.js";

describe("VaccineBillingCvxNdcCertificationReport", () => {
  const report = buildVaccineBillingCvxNdcCertificationReport();

  it("runs vaccine billing audit", () => {
    expect(["PASS", "PARTIAL", "FAIL"]).toContain(report.decision);
  });

  it("audits CVX", () => {
    expect(report.rows.some((row) => row.cvxPresent)).toBe(true);
  });

  it("audits NDC", () => {
    expect(report.rows.some((row) => row.ndcPresent)).toBe(true);
  });

  it("audits billing code", () => {
    expect(report.rows.some((row) => row.billingCodePresent)).toBe(true);
  });

  it("audits billing readiness", () => {
    expect(report.rows.some((row) => row.billingReady)).toBe(true);
  });

  it("audits inventory compatibility", () => {
    expect(report.rows.some((row) => row.inventoryCompatible)).toBe(true);
  });

  it("audits Tdap billing", () => {
    expect(report.rows.find((row) => row.vaccineId === "tdap")?.status).toBe("READY");
  });

  it("audits influenza billing", () => {
    expect(report.rows.find((row) => row.vaccineId === "influenza")?.cvxPresent).toBe(true);
  });

  it("audits COVID billing", () => {
    expect(report.rows.find((row) => row.vaccineId === "covid")?.ndcPresent).toBe(true);
  });

  it("audits pneumococcal billing", () => {
    expect(report.rows.find((row) => row.vaccineId === "pneumococcal")).toBeDefined();
  });

  it("reports DTaP billing gap", () => {
    expect(report.rows.find((row) => row.vaccineId === "dtap")?.status).toBe("MISSING");
  });

  it("reports blockers for missing optional/pediatric vaccines", () => {
    expect(report.blockers.length).toBeGreaterThan(0);
  });
});
