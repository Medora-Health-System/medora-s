import { describe, expect, it } from "vitest";
import { buildPediatricMedicationSafetyAuditReport } from "./pediatricMedicationSafetyAudit.js";

describe("PediatricMedicationSafetyAuditReport", () => {
  const report = buildPediatricMedicationSafetyAuditReport();

  it("runs pediatric medication safety audit", () => {
    expect(report.decision).toBe("PARTIAL");
  });

  it("audits weight-based dosing support", () => {
    expect(report.weightBasedDosingSupport).toBe(false);
  });

  it("audits mg/kg dosing support", () => {
    expect(report.mgKgDosingSupport).toBe(false);
  });

  it("audits maximum dose guardrails", () => {
    expect(report.maximumDoseGuardrails).toBe(false);
  });

  it("audits age-based restrictions", () => {
    expect(report.ageBasedRestrictions).toBe(false);
  });

  it("audits route restrictions", () => {
    expect(report.routeRestrictions).toBe(true);
  });

  it("audits liquid/suspension formulations", () => {
    expect(report.liquidSuspensionFormulations).toBe(false);
  });

  it("audits pediatric MAR documentation", () => {
    expect(report.pediatricMarDocumentation).toBe(true);
  });

  it("audits caregiver education", () => {
    expect(report.caregiverEducation).toBe(true);
  });

  it("audits pediatric allergy verification", () => {
    expect(report.pediatricAllergyVerification).toBe(true);
  });

  it("audits duplicate medication prevention", () => {
    expect(report.duplicateMedPrevention).toBe(true);
  });

  it("reports pediatric safety blockers", () => {
    expect(report.blockers).toContain("PEDIATRIC_WEIGHT_BASED_DOSING_RULES_NOT_CERTIFIED");
  });
});
