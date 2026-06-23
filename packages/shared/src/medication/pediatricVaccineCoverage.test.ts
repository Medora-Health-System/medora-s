import { describe, expect, it } from "vitest";
import { buildPediatricVaccineCoverageReport } from "./pediatricVaccineCoverage.js";
import { buildPediatricMedicationReadinessDecision } from "./vaccineCompletionCoverageAudit.js";

describe("PediatricVaccineCoverageReport", () => {
  const report = buildPediatricVaccineCoverageReport();

  it("audits pediatric vaccine rows", () => {
    expect(report.rows.length).toBe(13);
  });

  it("emits pediatric partial decision", () => {
    expect(report.decision).toBe("PARTIAL");
  });

  it("audits pediatric age support", () => {
    expect(report.rows.some((row) => row.pediatricAgeGroupSupport)).toBe(true);
  });

  it("audits pediatric series support", () => {
    expect(report.rows.some((row) => row.doseSeriesSupport)).toBe(true);
  });

  it("blocks DTaP as documented missing gap", () => {
    const row = report.rows.find((r) => r.vaccineId === "dtap");
    expect(row?.status).toBe("MISSING");
    expect(row?.blockers).toContain("DTAP_MISSING_DOCUMENTED_REVIEW_REQUIRED");
  });

  it("audits IPV", () => {
    expect(report.rows.find((row) => row.vaccineId === "ipv")).toBeDefined();
  });

  it("audits Hib", () => {
    expect(report.rows.find((row) => row.vaccineId === "hib")).toBeDefined();
  });

  it("audits rotavirus", () => {
    expect(report.rows.find((row) => row.vaccineId === "rotavirus")).toBeDefined();
  });

  it("audits pediatric lot support", () => {
    expect(report.rows.every((row) => typeof row.lot === "boolean")).toBe(true);
  });

  it("audits pediatric expiration support", () => {
    expect(report.rows.every((row) => typeof row.expiration === "boolean")).toBe(true);
  });

  it("audits caregiver education", () => {
    expect(report.rows.every((row) => typeof row.caregiverEducation === "boolean")).toBe(true);
  });

  it("emits pediatric readiness decision", () => {
    expect(buildPediatricMedicationReadinessDecision()).toBe("PEDIATRIC_PARTIAL");
  });
});
