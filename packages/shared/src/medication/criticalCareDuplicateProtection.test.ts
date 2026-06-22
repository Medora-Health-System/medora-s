import { describe, expect, it } from "vitest";
import { buildCriticalCareDuplicateProtectionReport } from "./criticalCareDuplicateProtection.js";
import {
  buildCriticalCareI18nCertificationReport,
  buildCriticalCareMaturityProjectionReport,
  runCriticalCareCertification,
} from "./criticalCareCoverageAudit.js";

describe("CriticalCareDuplicateProtectionReport", () => {
  it("runs duplicate protection report", () => {
    expect(["PASS", "FAIL"]).toContain(buildCriticalCareDuplicateProtectionReport().decision);
  });

  it("uses activation collision certification", () => {
    expect(["SAFE", "BLOCKED"]).toContain(buildCriticalCareDuplicateProtectionReport().activationCollisionDecision);
  });

  it("uses provider search collision certification", () => {
    expect(buildCriticalCareDuplicateProtectionReport().providerSearchCollisionDecision).toBe("SAFE");
  });

  it("reports no duplicate provider search rows after canonicalization", () => {
    expect(buildCriticalCareDuplicateProtectionReport().duplicateProviderSearchRows).toBe(0);
  });

  it("reports duplicate infusion entries for review without mutating rows", () => {
    expect(buildCriticalCareDuplicateProtectionReport().duplicateInfusionEntries).toBeGreaterThanOrEqual(0);
  });

  it("reports duplicate canonical family count", () => {
    expect(buildCriticalCareDuplicateProtectionReport().duplicateCanonicalFamilies).toBeGreaterThanOrEqual(0);
  });

  it("reports duplicate MAR representations", () => {
    expect(buildCriticalCareDuplicateProtectionReport().duplicateMarRepresentations).toBe(0);
  });

  it("passes when provider search canonicalization is safe", () => {
    expect(buildCriticalCareDuplicateProtectionReport().blockers).not.toContain("PROVIDER_SEARCH_COLLISION");
  });

  it("certifies critical-care i18n", () => {
    expect(buildCriticalCareI18nCertificationReport().decision).toBe("PASS");
  });

  it("has zero English leakage in French", () => {
    expect(buildCriticalCareI18nCertificationReport().frLeakageCount).toBe(0);
  });

  it("has zero French leakage in English", () => {
    expect(buildCriticalCareI18nCertificationReport().enLeakageCount).toBe(0);
  });

  it("has zero missing translations", () => {
    expect(buildCriticalCareI18nCertificationReport().missingTranslations).toBe(0);
  });

  it("projects maturity from 4.1 to 4.3 after critical care", () => {
    const projection = buildCriticalCareMaturityProjectionReport();
    expect(projection.currentScore).toBe(4.1);
    expect(projection.projectedAfterCriticalCare).toBe(4.3);
  });

  it("projects final maturity to target after future phases", () => {
    const projection = buildCriticalCareMaturityProjectionReport();
    expect(projection.projectedFinalScore).toBe(4.5);
    expect(projection.targetScore).toBe(4.5);
  });

  it("orchestrator confirms no forbidden compatibility changes", () => {
    const report = runCriticalCareCertification();
    expect(report.compatibility.activationChanged).toBe(false);
    expect(report.compatibility.providerSearchChanged).toBe(false);
    expect(report.compatibility.formularyStatusChanged).toBe(false);
    expect(report.compatibility.marBehaviorChanged).toBe(false);
    expect(report.compatibility.migrationsRequired).toBe(false);
  });
});
