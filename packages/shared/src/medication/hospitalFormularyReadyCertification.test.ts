import { describe, expect, it } from "vitest";
import {
  runHospitalFormularyReadyCertification,
} from "./hospitalFormularyReadyCertification.js";

describe("MEDUI.MEDICATION.HOSPITAL_FORMULARY_READY_CERTIFICATION.1", () => {
  const report = runHospitalFormularyReadyCertification();

  it("runs final hospital formulary certification", () => {
    expect(report.ticket).toBe("MEDUI.MEDICATION.HOSPITAL_FORMULARY_READY_CERTIFICATION.1");
  });

  it("certifies medication engine maturity at 4.5", () => {
    expect(report.maturityCertification.currentScore).toBe(4.5);
    expect(report.maturityCertification.targetReached).toBe(true);
  });

  it("includes all major certification domains", () => {
    expect(report.maturityCertification.certificationsIncluded).toContain("Vaccine Completion");
    expect(report.maturityCertification.certificationsIncluded).toContain("Pediatric Remediation");
  });

  it("audits required hospital domains", () => {
    expect(report.hospitalCoverage.rows.length).toBe(21);
  });

  it("reports hospital coverage blockers instead of hiding them", () => {
    expect(report.hospitalCoverage.blockers.length).toBeGreaterThan(0);
  });

  it("certifies orderability governance counts", () => {
    expect(report.orderabilityGovernance.totalMedications).toBeGreaterThan(report.orderabilityGovernance.orderableMedications);
    expect(report.orderabilityGovernance.accidentalActivationDetected).toBe(false);
  });

  it("certifies high-risk governance protections", () => {
    expect(report.highRiskMedication.governanceProtectionsIntact).toBe(true);
  });

  it("certifies MAR with known blockers", () => {
    expect(report.marCertification.decision).toBe("PARTIAL");
  });

  it("certifies billing with known blockers", () => {
    expect(report.billingCertification.decision).toBe("PARTIAL");
  });

  it("certifies provider search", () => {
    expect(report.providerSearchCertification.decision).toBe("PASS");
  });

  it("certifies medication i18n", () => {
    expect(report.i18nCertification.decision).toBe("PASS");
    expect(report.i18nCertification.enLeakageIntoFr).toBe(0);
    expect(report.i18nCertification.frLeakageIntoEn).toBe(0);
  });

  it("certifies activation readiness counts", () => {
    expect(report.activationReadiness.immediatelyEligible).toBeGreaterThan(0);
    expect(report.activationReadiness.engineeringRequired).toBeGreaterThanOrEqual(0);
  });

  it("does not claim full readiness while blockers remain", () => {
    expect(report.finalDecision).toBe("HOSPITAL_FORMULARY_READY_WITH_BLOCKERS");
  });

  it("confirms no forbidden compatibility changes", () => {
    expect(report.compatibility).toEqual({
      medicationActivationChanged: false,
      vaccineActivationChanged: false,
      providerSearchChanged: false,
      formularyStatusChanged: false,
      marBehaviorChanged: false,
      migrationsRequired: false,
    });
  });
});
