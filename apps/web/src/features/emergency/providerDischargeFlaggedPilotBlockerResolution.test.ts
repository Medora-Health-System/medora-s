import { describe, expect, it } from "vitest";
import {
  buildClinicalTrafficDataset,
  buildFeatureFlagProductionReadinessReport,
  buildGatedShadowParityReport,
  buildShadowModeValidationReport,
} from "./providerDischargeShadowModeValidation";
import { compareRegistryResolverToFamilyResolver } from "./providerDischargeResolverShadowCompare";
import { getClinicalConditionFamilyById } from "./providerDischargeConditionFamilies";
import { resolveClinicalConditionFamily } from "./providerDischargeConditionFamilyResolver";
import { resolveDischargeTemplateForDiagnosisGated } from "./providerDischargeTemplateResolverGate";
import {
  ED_DISCHARGE_USE_CONDITION_FAMILY_RESOLVER,
} from "./providerDischargeConditionFamilyFeatureFlag";
import { resolveProviderDischargeTemplateForDiagnosis } from "./providerDischargeTemplateRegistry";

describe("MEDUI.ED.DISCHARGE.TEMPLATE_FAMILY_COVERAGE.5", () => {
  describe("blocker resolution", () => {
    it("1 — DVT family routes to high-risk leg swelling, not low-risk", () => {
      const family = getClinicalConditionFamilyById("dvt_evaluation");
      expect(family?.routingStatus).toBe("READY");
      const r = resolveClinicalConditionFamily({ code: "I82.409", displayName: "DVT" });
      expect(r.templateId).toBe("high_risk_medical_leg_swelling_v1");
      expect(r.templateId).not.toBe("generic_ed_discharge_v1");
    });

    it("2 — PE remains UNSAFE_DO_NOT_MAP", () => {
      const pe = getClinicalConditionFamilyById("pe_evaluation_discharge");
      expect(pe?.routingStatus).toBe("UNSAFE_DO_NOT_MAP");
      const r = resolveClinicalConditionFamily({ code: "I26.99", displayName: "PE" });
      expect(r.familyId).not.toBe("pe_evaluation_discharge");
    });

    it("3 — confirmed DVT does not route to low-risk template", () => {
      const cmp = compareRegistryResolverToFamilyResolver({ code: "I82.409", displayName: "DVT" });
      expect(cmp.familyTemplateId).toBe("high_risk_medical_leg_swelling_v1");
      expect(["identical", "safer_family"]).toContain(cmp.familyOutcome);
    });

    it("4 — OB/GYN N93.9 routes safely for female patients", () => {
      const r = resolveClinicalConditionFamily({
        code: "N93.9",
        displayName: "Abnormal uterine bleeding",
        context: { patientSex: "female" },
      });
      expect(r.templateId).toBe("obgyn_vaginal_bleeding_v1");
      expect(getClinicalConditionFamilyById("obgyn_bleeding_pelvic_pain")?.routingStatus).toBe("READY");
    });

    it("5 — OB/GYN R10.2 routes to pelvic pain template", () => {
      const r = resolveClinicalConditionFamily({
        code: "R10.2",
        displayName: "Pelvic pain",
        context: { patientSex: "female" },
      });
      expect(r.templateId).toBe("obgyn_pelvic_pain_v1");
    });

    it("6 — pregnancy bleeding O20.0 does not downgrade to generic", () => {
      const r = resolveClinicalConditionFamily({
        code: "O20.0",
        displayName: "Threatened miscarriage",
        context: { patientSex: "female", isPregnant: true },
      });
      expect(r.templateId).toBe("obgyn_threatened_miscarriage_precautions_v1");
      expect(r.templateId).not.toBe("generic_ed_discharge_v1");
    });

    it("7 — behavioral health anxiety/panic routes safely", () => {
      const cmp = compareRegistryResolverToFamilyResolver({ code: "F41.9", displayName: "Anxiety" });
      expect(cmp.familyOutcome).toBe("identical");
      expect(getClinicalConditionFamilyById("behavioral_health_crisis")?.routingStatus).toBe("READY");
    });

    it("8 — suicidal ideation remains crisis-protected", () => {
      const r = resolveClinicalConditionFamily({ code: "R45.851", displayName: "Suicidal ideation" });
      expect(r.templateId).toBe("behavioral_health_suicidal_ideation_precautions_v1");
      const cmp = compareRegistryResolverToFamilyResolver({ code: "R45.851", displayName: "Suicidal ideation" });
      expect(cmp.familyOutcome).not.toBe("regression_risk");
    });

    it("9 — alcohol withdrawal does not route to intoxication", () => {
      const withdrawal = resolveClinicalConditionFamily({ code: "F10.239", displayName: "Alcohol withdrawal" });
      expect(withdrawal.templateId).toBe("alcohol_withdrawal_post_acute_v1");
      expect(withdrawal.templateId).not.toBe("alcohol_intoxication_v1");
      expect(withdrawal.templateId).not.toBe("behavioral_health_alcohol_withdrawal_precautions_v1");
    });

    it("10 — opioid overdose does not route to generic substance use only", () => {
      const r = resolveClinicalConditionFamily({ code: "T40.2X5A", displayName: "Opioid overdose" });
      expect(r.templateId).toBe("behavioral_health_opioid_overdose_aftercare_v1");
      expect(r.templateId).not.toBe("behavioral_health_substance_use_resources_v1");
    });

    it("11 — pediatric head injury regression fixed", () => {
      const cmp = compareRegistryResolverToFamilyResolver({
        code: "S00.93XA",
        displayName: "Pediatric minor head injury discharge documentation",
      });
      expect(cmp.familyOutcome).toBe("identical");
      expect(cmp.familyTemplateId).toBe("pediatric_minor_head_injury_v1");
    });

    it("12 — pediatric wheezing regression fixed", () => {
      const cmp = compareRegistryResolverToFamilyResolver({
        code: "R06.2",
        displayName: "Pediatric wheezing discharge documentation",
      });
      expect(cmp.familyOutcome).toBe("identical");
      expect(cmp.familyTemplateId).toBe("pediatric_wheezing_v1");
    });

    it("13 — regression risk count is 0 on full dataset", () => {
      const full = buildShadowModeValidationReport();
      expect(full.outcomeCounts.REGRESSION_RISK).toBe(0);
    });

    it("14 — gated safe parity remains 100%", () => {
      expect(buildGatedShadowParityReport().gatedParityPercent).toBe(100);
    });

    it("15 — clinical raw parity ≥85%", () => {
      const clinical = buildShadowModeValidationReport(buildClinicalTrafficDataset());
      expect(clinical.parityPercent).toBeGreaterThanOrEqual(85);
    });

    it("16 — full-dataset raw parity ≥80%", () => {
      const full = buildShadowModeValidationReport();
      expect(full.parityPercent).toBeGreaterThanOrEqual(80);
      expect(full.outcomeCounts.REGRESSION_RISK).toBe(0);
      expect(full.outcomeCounts.UNSAFE).toBe(0);
    });

    it("17 — feature flag OFF remains registry-only", () => {
      expect(ED_DISCHARGE_USE_CONDITION_FAMILY_RESOLVER).toBe(false);
      const r = resolveDischargeTemplateForDiagnosisGated(
        { code: "R11.2", displayName: "Nausea" },
        { featureFlags: { ED_DISCHARGE_USE_CONDITION_FAMILY_RESOLVER: false } }
      );
      const registry = resolveProviderDischargeTemplateForDiagnosis({ code: "R11.2", displayName: "Nausea" });
      expect(r.resolverPath).toBe("registry");
      expect(r.template.id).toBe(registry.template.id);
    });

    it("18 — feature flag ON falls back for remaining NEEDS_REVIEW families", () => {
      const r = resolveDischargeTemplateForDiagnosisGated(
        { code: "", displayName: "Foley catheter precautions" },
        { featureFlags: { ED_DISCHARGE_USE_CONDITION_FAMILY_RESOLVER: true } }
      );
      expect(r.resolverPath).toBe("family_fallback_registry");
    });

    it("19 — feature flag ON blocks UNSAFE PE", () => {
      const r = resolveDischargeTemplateForDiagnosisGated(
        { code: "I26.99", displayName: "PE" },
        { featureFlags: { ED_DISCHARGE_USE_CONDITION_FAMILY_RESOLVER: true } }
      );
      expect(r.resolverPath).not.toBe("family");
    });

    it("20 — R11.2 registry path unchanged", () => {
      const registry = resolveProviderDischargeTemplateForDiagnosis({
        code: "R11.2",
        displayName: "Nausea with vomiting",
      });
      expect(registry.template.id).toBe("nausea_vomiting_v1");
      const cmp = compareRegistryResolverToFamilyResolver({
        code: "R11.2",
        displayName: "Nausea with vomiting",
      });
      expect(cmp.familyOutcome).toBe("identical");
    });
  });

  describe("feature flag safety recheck", () => {
    it("all production readiness checks pass", () => {
      const report = buildFeatureFlagProductionReadinessReport();
      expect(report.allChecksPassed).toBe(true);
      expect(report.onBlocksUnsafe).toBe(true);
      expect(report.onBlocksDeferred).toBe(true);
    });
  });
});
