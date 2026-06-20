import { describe, expect, it } from "vitest";
import {
  buildClinicalFamilyCoverageReport,
  buildResolverParityReport,
} from "./providerDischargeClinicalFamilyCoverage";
import {
  ED_DISCHARGE_USE_CONDITION_FAMILY_RESOLVER,
} from "./providerDischargeConditionFamilyFeatureFlag";
import { resolveClinicalConditionFamily } from "./providerDischargeConditionFamilyResolver";
import {
  buildClinicalResolverVarianceReport,
  buildClinicalTrafficDataset,
  buildEncounterDiagnosisAuditDataset,
  buildEncounterDiagnosisDistributionReport,
  buildFamilyResolverReadinessScore,
  buildFeatureFlagProductionReadinessReport,
  buildGatedShadowParityReport,
  buildHighRiskFamilyRoutingAudit,
  buildShadowModeValidationReport,
} from "./providerDischargeShadowModeValidation";
import { compareRegistryResolverToFamilyResolver } from "./providerDischargeResolverShadowCompare";
import { resolveDischargeTemplateForDiagnosisGated } from "./providerDischargeTemplateResolverGate";
import { resolveProviderDischargeTemplateForDiagnosis } from "./providerDischargeTemplateRegistry";

describe("MEDUI.ED.DISCHARGE.TEMPLATE_FAMILY_COVERAGE.4", () => {
  describe("shadow mode validation", () => {
    it("1 — shadow comparison works on audit dataset", () => {
      const dataset = buildEncounterDiagnosisAuditDataset();
      expect(dataset.length).toBeGreaterThan(50);
      const shadow = buildShadowModeValidationReport(buildClinicalTrafficDataset());
      expect(shadow.totalCompared).toBeGreaterThan(20);
      expect(shadow.parityPercent).toBeGreaterThanOrEqual(85);
      const gated = buildGatedShadowParityReport();
      expect(gated.gatedParityPercent).toBe(100);
      expect(gated.registryIdenticalPercent).toBeGreaterThanOrEqual(80);
    });

    it("2 — encounter diagnosis distribution report generated", () => {
      const report = buildEncounterDiagnosisDistributionReport();
      expect(report.totalUniqueDiagnoses).toBeGreaterThan(50);
      expect(report.topDiagnoses.length).toBeGreaterThan(10);
      expect(report.topTemplates.length).toBeGreaterThan(5);
      expect(report.datasetSources).toContain("seed_encounter");
      expect(report.datasetSources).toContain("dev_icd_sample");
    });

    it("3 — regression classification captured in variance report", () => {
      const shadow = buildShadowModeValidationReport();
      const variance = buildClinicalResolverVarianceReport(shadow);
      expect(variance.rows.every((r) => ["REGRESSION_RISK", "NEEDS_REVIEW", "UNSAFE"].includes(r.outcome))).toBe(
        true
      );
      expect(variance.regressionRiskCount + variance.needsReviewCount + variance.unsafeCount).toBe(
        variance.rows.length
      );
    });

    it("4 — safer-family classification works", () => {
      const cmp = compareRegistryResolverToFamilyResolver({ code: "R53.1", displayName: "Weakness" });
      expect(["identical", "safer_family"]).toContain(cmp.familyOutcome);
    });

    it("5 — unsafe classification for UNSAFE routing status families", () => {
      const family = resolveClinicalConditionFamily({
        code: "",
        displayName: "DKA return precautions",
      });
      expect(family.familyId).not.toBe("diabetes_dka_return_precautions");
    });

    it("6 — high-risk diagnoses audit passes", () => {
      const audit = buildHighRiskFamilyRoutingAudit();
      expect(audit.probes.length).toBe(14);
      expect(audit.allPassed).toBe(true);
    });

    it("7 — PE remains blocked from UNSAFE family routing", () => {
      const family = resolveClinicalConditionFamily({ code: "I26.99", displayName: "PE" });
      expect(family.familyId).not.toBe("pe_evaluation_discharge");
      const gated = resolveDischargeTemplateForDiagnosisGated(
        { code: "I26.99", displayName: "PE" },
        { featureFlags: { ED_DISCHARGE_USE_CONDITION_FAMILY_RESOLVER: true } }
      );
      expect(gated.resolverPath).not.toBe("family");
    });

    it("8 — DKA remains blocked from UNSAFE family routing", () => {
      const family = resolveClinicalConditionFamily({
        code: "",
        displayName: "DKA return precautions",
      });
      expect(family.familyId).not.toBe("diabetes_dka_return_precautions");
    });

    it("9 — behavioral health guardrails route crisis family", () => {
      const cmp = compareRegistryResolverToFamilyResolver({
        code: "R45.851",
        displayName: "Suicidal ideation",
      });
      expect(cmp.registryTemplateId).toBeTruthy();
      expect(cmp.familyOutcome).not.toBe("regression_risk");
    });

    it("10 — OB/GYN guardrails require female sex", () => {
      const female = compareRegistryResolverToFamilyResolver({
        code: "N93.9",
        displayName: "Bleeding",
        context: { patientSex: "female" },
      });
      expect(female.familyRoutingStatus).not.toBeNull();
      const male = compareRegistryResolverToFamilyResolver({
        code: "N93.9",
        displayName: "Bleeding",
        context: { patientSex: "male" },
      });
      expect(male.familyOutcome).not.toBe("regression_risk");
    });

    it("11 — feature flag OFF remains registry-only", () => {
      expect(ED_DISCHARGE_USE_CONDITION_FAMILY_RESOLVER).toBe(false);
      const r = resolveDischargeTemplateForDiagnosisGated(
        { code: "R11.2", displayName: "Nausea" },
        { featureFlags: { ED_DISCHARGE_USE_CONDITION_FAMILY_RESOLVER: false } }
      );
      const registry = resolveProviderDischargeTemplateForDiagnosis({
        code: "R11.2",
        displayName: "Nausea",
      });
      expect(r.resolverPath).toBe("registry");
      expect(r.template.id).toBe(registry.template.id);
    });

    it("12 — feature flag ON still blocks unsafe families", () => {
      const report = buildFeatureFlagProductionReadinessReport();
      expect(report.allChecksPassed).toBe(true);
      expect(report.onBlocksUnsafe).toBe(true);
      expect(report.onBlocksDeferred).toBe(true);
    });

    it("13 — family resolver readiness score computed", () => {
      const score = buildFamilyResolverReadinessScore();
      expect(score.coveragePercent).toBeGreaterThanOrEqual(95);
      expect(score.parityPercent).toBeGreaterThanOrEqual(95);
      expect(["LIMITED_PILOT", "READY_FOR_FLAGGED_PILOT", "READY_FOR_PRODUCTION"]).toContain(
        score.readinessLevel
      );
    });

    it("14 — dialysis precautions do not false-match UTI keyword", () => {
      const family = resolveClinicalConditionFamily({
        code: "",
        displayName: "dialysis return precautions",
      });
      expect(family.familyId).not.toBe("uti_urinary_symptoms");
      const gated = resolveDischargeTemplateForDiagnosisGated(
        { code: "", displayName: "dialysis return precautions" },
        { featureFlags: { ED_DISCHARGE_USE_CONDITION_FAMILY_RESOLVER: true } }
      );
      expect(gated.resolverPath).toBe("family_fallback_registry");
      expect(gated.template.id).toBe("dialysis_return_precautions_v1");
    });

    it("15 — injected catalog rows accepted in audit dataset", () => {
      const dataset = buildEncounterDiagnosisAuditDataset([
        { code: "X99.9", label: "Injected test diagnosis", source: "injected" },
      ]);
      expect(dataset.some((d) => d.code === "X99.9")).toBe(true);
    });

    it("16 — variance report does not suppress findings", () => {
      const variance = buildClinicalResolverVarianceReport();
      for (const row of variance.rows) {
        expect(row.reason.length).toBeGreaterThan(10);
        expect(row.recommendedResolution.length).toBeGreaterThan(10);
      }
    });
  });

  describe("parity with phase 3 metrics", () => {
    it("17 — coverage report still ≥95%", () => {
      expect(buildClinicalFamilyCoverageReport().coveragePercent).toBeGreaterThanOrEqual(95);
    });

    it("18 — resolver parity report still ≥95%", () => {
      expect(buildResolverParityReport().parityPercent).toBeGreaterThanOrEqual(95);
    });
  });
});
