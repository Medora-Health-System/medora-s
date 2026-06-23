import { describe, expect, it } from "vitest";
import { buildVaccineI18nCertificationReport } from "./vaccineI18nCertification.js";
import { runVaccineCompletionCertification } from "./vaccineCompletionCoverageAudit.js";
import { buildHighRiskGovernanceCertificationReport } from "./anticoagulationHighRiskGovernance.js";
import { buildCriticalCareCoverageAuditReport } from "./criticalCareCoverageAudit.js";
import { buildVaccineSearchGovernanceReport, certifyProviderSearchCollisions } from "./providerSearchCanonicalization.js";
import { auditTdapCurrentState } from "./tdapMedicationWorkflowAudit.js";

describe("VaccineI18nCertificationReport", () => {
  const report = buildVaccineI18nCertificationReport();

  it("passes vaccine i18n certification", () => {
    expect(report.decision).toBe("PASS");
  });

  it("passes EN localization", () => {
    expect(report.rowsAudited).toBeGreaterThan(0);
  });

  it("passes FR localization", () => {
    expect(report.missingTranslations).toBe(0);
  });

  it("has no EN leakage into FR", () => {
    expect(report.frLeakageCount).toBe(0);
  });

  it("has no FR leakage into EN", () => {
    expect(report.enLeakageCount).toBe(0);
  });

  it("has no missing translations", () => {
    expect(report.missingTranslations).toBe(0);
  });

  it("preserves Tdap workflow regression", () => {
    expect(auditTdapCurrentState().inMedicationCatalog).toBe(true);
  });

  it("preserves anticoagulation certification regression", () => {
    expect(buildHighRiskGovernanceCertificationReport().decision).toBe("PASS");
  });

  it("preserves critical care certification regression", () => {
    expect(buildCriticalCareCoverageAuditReport().totalExpectedMedications).toBeGreaterThan(0);
  });

  it("preserves provider search canonicalization regression", () => {
    expect(certifyProviderSearchCollisions().decision).toBe("SAFE");
  });

  it("preserves vaccine search governance regression", () => {
    expect(buildVaccineSearchGovernanceReport().decision).toBe("PASS");
  });

  it("emits compatibility audit with no mutation", () => {
    expect(runVaccineCompletionCertification().compatibility).toEqual({
      activationChanged: false,
      providerSearchChanged: false,
      formularyStatusChanged: false,
      marBehaviorChanged: false,
      billingBehaviorChanged: false,
      migrationsRequired: false,
    });
  });
});
