import { describe, expect, it } from "vitest";
import {
  buildCurrentMedicationMaturityBaseline,
  buildManufacturerGovernanceRemediationPlan,
  buildMedicationEngineReadinessProjectionReport,
  buildPediatricMedicationSafetyRemediationReport,
  buildPediatricVaccineGapAnalysisReport,
  buildVaccineBillingGovernanceGapReport,
  buildVaccineMarWorkflowGapReport,
  buildVaccinePediatricI18nCertificationReport,
  runVaccinePediatricRemediationReport,
} from "./vaccinePediatricRemediation.js";

describe("MEDUI.MEDICATION.VACCINE_PEDIATRIC_REMEDIATION.1", () => {
  it("reports current medication maturity baseline", () => {
    expect(buildCurrentMedicationMaturityBaseline().currentScore).toBe(4.4);
  });

  it("audits the four pediatric vaccine gaps", () => {
    expect(buildPediatricVaccineGapAnalysisReport().rows.map((row) => row.vaccineId)).toEqual([
      "dtap",
      "ipv",
      "hib",
      "rotavirus",
    ]);
  });

  it("does not create vaccine records while auditing gaps", () => {
    expect(buildPediatricVaccineGapAnalysisReport().noVaccineRecordsCreated).toBe(true);
  });

  it("reports DTaP missing entirely", () => {
    expect(buildPediatricVaccineGapAnalysisReport().rows.find((row) => row.vaccineId === "dtap")?.missingEntirely).toBe(true);
  });

  it("builds a manufacturer normalization plan", () => {
    const plan = buildManufacturerGovernanceRemediationPlan();
    expect(plan.decision).toBe("PLAN_COMPLETE");
    expect(plan.localizedLabelsPreserved).toBe(true);
  });

  it("distinguishes proper-noun EN/FR labels from provider-facing duplicates", () => {
    const plan = buildManufacturerGovernanceRemediationPlan();
    expect(plan.enFrProperNounVariants).toBeGreaterThan(0);
    expect(plan.providerFacingDuplicateManufacturers).toBe(0);
  });

  it("reports pediatric medication safety as partial", () => {
    expect(buildPediatricMedicationSafetyRemediationReport().decision).toBe("PARTIAL");
  });

  it("identifies vaccine MAR workflow gaps", () => {
    expect(buildVaccineMarWorkflowGapReport().missingFields).toContain("refusal workflow");
  });

  it("audits missing billing/CVX/NDC mappings", () => {
    expect(buildVaccineBillingGovernanceGapReport().rows.length).toBe(7);
  });

  it("passes vaccine pediatric i18n certification", () => {
    const report = buildVaccinePediatricI18nCertificationReport();
    expect(report.decision).toBe("PASS");
    expect(report.enLeakageIntoFr).toBe(0);
    expect(report.frLeakageIntoEn).toBe(0);
  });

  it("projects readiness to 4.5 after governed remediation planning", () => {
    const report = buildMedicationEngineReadinessProjectionReport();
    expect(report.projectedAfterRemediation).toBe(4.5);
    expect(report.reachesTargetAfterRemediationPlanning).toBe(true);
  });

  it("returns final readiness decision for hospital formulary certification", () => {
    expect(runVaccinePediatricRemediationReport().finalDecision).toBe("READY_FOR_HOSPITAL_FORMULARY_CERTIFICATION");
  });

  it("confirms no forbidden compatibility changes", () => {
    expect(runVaccinePediatricRemediationReport().compatibility).toEqual({
      vaccineActivationChanged: false,
      medicationActivationChanged: false,
      providerSearchChanged: false,
      formularyStatusChanged: false,
      marBehaviorChanged: false,
      migrationsRequired: false,
    });
  });
});
