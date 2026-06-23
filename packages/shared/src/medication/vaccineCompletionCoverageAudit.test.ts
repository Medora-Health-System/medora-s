import { describe, expect, it } from "vitest";
import {
  VACCINE_COMPLETION_EXPECTATIONS,
  buildEnterpriseVaccineCoverageAuditReport,
  buildVaccineMaturityProjectionReport,
  buildVaccineRepoReadinessReport,
  runVaccineCompletionCertification,
} from "./vaccineCompletionCoverageAudit.js";

describe("EnterpriseVaccineCoverageAuditReport", () => {
  const report = buildEnterpriseVaccineCoverageAuditReport();

  it("runs the vaccine completion orchestrator", () => {
    expect(runVaccineCompletionCertification().ticket).toBe("MEDUI.MEDICATION.VACCINE_COMPLETION_AND_PEDIATRIC_COVERAGE.1");
  });

  it("reports maturity baseline at 4.4", () => {
    expect(buildVaccineRepoReadinessReport().currentMedicationMaturityScore).toBe(4.4);
  });

  it("audits all vaccine expectations", () => {
    expect(report.totalExpected).toBe(VACCINE_COMPLETION_EXPECTATIONS.length);
  });

  it("reports Tdap present", () => {
    expect(report.rows.find((row) => row.vaccineId === "tdap")?.presentInMedicationCatalog).toBe(true);
  });

  it("reports Td present or audited", () => {
    expect(report.rows.some((row) => row.vaccineId === "td")).toBe(true);
  });

  it("reports DTaP missing without inventing it", () => {
    const dtap = report.rows.find((row) => row.vaccineId === "dtap");
    expect(dtap?.status).toBe("MISSING");
    expect(dtap?.notes.join(" ")).toContain("do not invent");
  });

  it("audits MMR", () => {
    expect(report.rows.find((row) => row.vaccineId === "mmr")).toBeDefined();
  });

  it("audits varicella", () => {
    expect(report.rows.find((row) => row.vaccineId === "varicella")).toBeDefined();
  });

  it("audits influenza", () => {
    expect(report.rows.find((row) => row.vaccineId === "influenza")?.presentInMedicationCatalog).toBe(true);
  });

  it("audits COVID", () => {
    expect(report.rows.find((row) => row.vaccineId === "covid")?.presentInMedicationCatalog).toBe(true);
  });

  it("audits Hep A and Hep B", () => {
    expect(report.rows.find((row) => row.vaccineId === "hepatitis_a")).toBeDefined();
    expect(report.rows.find((row) => row.vaccineId === "hepatitis_b")).toBeDefined();
  });

  it("audits maturity projection to 4.5 with blockers", () => {
    const projection = buildVaccineMaturityProjectionReport();
    expect(projection.projectedAfterVaccineCompletion).toBe(4.5);
    expect(projection.remainingBlockers.length).toBeGreaterThan(0);
  });
});
