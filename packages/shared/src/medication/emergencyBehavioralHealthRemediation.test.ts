import { describe, expect, it } from "vitest";
import {
  buildBehavioralHealthHighRiskExclusionReport,
  buildBehavioralHealthI18nCertificationReport,
  buildBehavioralHealthMedicationGapAudit,
  buildBehavioralHealthRootCauseReport,
  buildBehavioralHealthSafetyRegressionReport,
  buildBehavioralHealthWorkflowCompatibilityReport,
  buildEmergencyBehavioralHealthBaselineReport,
  buildTranche3ReadinessRecertificationReport,
  runEmergencyBehavioralHealthRemediationCertification,
} from "./emergencyBehavioralHealthRemediation.js";

describe("MEDUI.MEDICATION.TRANCHE_3_EMERGENCY_BEHAVIORAL_HEALTH_REMEDIATION.1", () => {
  it("01 — Behavioral Health medication presence", () => {
    const audit = buildBehavioralHealthMedicationGapAudit();
    expect(audit.missingCountAfterRemediation).toBe(0);
    expect(audit.rows.find((row) => row.medication === "Ziprasidone")?.catalogPresence).toBe(true);
  });

  it("02 — Behavioral Health workflow compatibility", () => {
    const report = buildBehavioralHealthWorkflowCompatibilityReport();
    expect(report.emergencyWorkflowCompatibility).toBe("PASS");
    expect(report.behavioralCrisisWorkflow).toBe("PASS");
  });

  it("03 — MAR compatibility", () => {
    const audit = buildBehavioralHealthMedicationGapAudit();
    expect(audit.rows.some((row) => row.marReady)).toBe(true);
  });

  it("04 — billing compatibility", () => {
    const audit = buildBehavioralHealthMedicationGapAudit();
    expect(audit.rows.some((row) => row.billingReady)).toBe(true);
  });

  it("05 — inventory compatibility", () => {
    const audit = buildBehavioralHealthMedicationGapAudit();
    expect(audit.rows.some((row) => row.inventoryReady)).toBe(true);
  });

  it("06 — duplicate protection", () => {
    expect(buildBehavioralHealthSafetyRegressionReport().duplicateProtectionActive).toBe(true);
  });

  it("07 — canonical protection", () => {
    expect(buildBehavioralHealthSafetyRegressionReport().canonicalProtectionActive).toBe(true);
  });

  it("08 — pharmacy review nonblocking", () => {
    expect(buildBehavioralHealthSafetyRegressionReport().nonblockingPharmacyReviewActive).toBe(true);
  });

  it("09 — EN localization", () => {
    const i18n = buildBehavioralHealthI18nCertificationReport();
    expect(i18n.frLeakageIntoEn).toBe(0);
    expect(i18n.bilingualMedicationNames).toBe(true);
  });

  it("10 — FR localization", () => {
    const i18n = buildBehavioralHealthI18nCertificationReport();
    expect(i18n.enLeakageIntoFr).toBe(0);
    expect(i18n.bilingualWorkflowLabels).toBe(true);
  });

  it("11 — readiness recertification", () => {
    const report = buildTranche3ReadinessRecertificationReport();
    expect(report.emergencyMedicationPresenceCertification).not.toBe("MISSING");
    expect(report.emergencyWorkflowCompatibilityReport).toBe("PASS");
    expect(["READY_FOR_TRANCHE_3_ACTIVATION", "READY_WITH_BLOCKERS", "NOT_READY"]).toContain(report.finalDecision);
  });

  it("12 — release certification report preserves no-activation compatibility", () => {
    const baseline = buildEmergencyBehavioralHealthBaselineReport();
    const rootCause = buildBehavioralHealthRootCauseReport();
    const highRisk = buildBehavioralHealthHighRiskExclusionReport();
    const report = runEmergencyBehavioralHealthRemediationCertification();
    expect(baseline.emergencyMedicationPresenceCertification).toBe("MISSING");
    expect(rootCause.missingMedication).toBe("Ziprasidone");
    expect(Object.values(highRisk).every((value) => value === false)).toBe(true);
    expect(report.remediation.activated).toBe(false);
    expect(report.compatibility.activationChanged).toBe(false);
  });
});
