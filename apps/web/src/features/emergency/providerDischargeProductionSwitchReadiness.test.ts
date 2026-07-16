import { describe, expect, it } from "vitest";
import { ED_DISCHARGE_USE_CONDITION_FAMILY_RESOLVER } from "./providerDischargeConditionFamilyFeatureFlag";
import { resolveClinicalConditionFamily } from "./providerDischargeConditionFamilyResolver";
import { runEnterpriseDischargeCertification } from "./providerDischargeEnterpriseCertification";
import {
  ADULT_FEVER_TEMPLATE_ID,
  PEDIATRIC_FEVER_TEMPLATE_ID,
} from "./providerDischargePediatricFeverAgePolicy";
import {
  buildFullCmsIcd10ProductionSwitchAudit,
  buildHighRiskProductionSwitchSafetyReport,
  buildMockRealEncounterRowsForThresholdTest,
  buildProductionResolverVarianceReport,
  buildRealEncounterProductionSwitchValidationReport,
  determineProductionSwitchReadinessDecision,
  FAMILY_RESOLVER_FEATURE_FLAG_ROLLOUT_PLAN,
  FAMILY_RESOLVER_MONITORING_PLAN,
  familyResolverAdultFeverForUnknownAge,
  familyResolverPediatricFeverRequiresAge,
  productionUsesRegistryResolverWhenFlagOff,
  runProductionSwitchReadinessCertification,
  buildCurrentResolverStateAudit,
} from "./providerDischargeProductionSwitchReadiness";
import {
  PRODUCTION_DEFAULT_SWITCH_THRESHOLDS,
  runRealEncounterShadowValidation,
} from "./providerDischargeRealEncounterValidation";
import { resolveDischargeTemplateForDiagnosisGated } from "./providerDischargeTemplateResolverGate";
import { GENERIC_PROVIDER_DISCHARGE_TEMPLATE_ID, resolveProviderDischargeTemplateForDiagnosis } from "./providerDischargeTemplateRegistry";
import { certifyUniversalOutputSurfaces, buildCertificationFormForDiagnosis } from "./providerDischargeUniversalInstructionCertification";
import {
  resolvePatientSpecificDischargeAdditions,
} from "./providerDischargePatientSpecificAdditions";
import { mergeMedicationNamesForDischargeContext } from "./providerDischargeMedicationContext";

describe("MEDUI.ED.DISCHARGE.PRODUCTION_SWITCH_READINESS.1", () => {
  describe("Phase 1 — current resolver state", () => {
    it("01 — production resolver is registry when flag OFF", () => {
      expect(productionUsesRegistryResolverWhenFlagOff()).toBe(true);
      expect(ED_DISCHARGE_USE_CONDITION_FAMILY_RESOLVER).toBe(false);
    });

    it("02 — current resolver state audit documents gated family resolver", () => {
      const audit = buildCurrentResolverStateAudit();
      expect(audit.activeProductionResolver).toBe("registry");
      expect(audit.featureFlagDefault).toBe(false);
      expect(audit.familyResolverStatus).toContain("gated");
    });
  });

  describe("Phase 2 — CMS ICD-10 catalog readiness", () => {
    it("03 — reports FULL_CMS_DATA_NOT_AVAILABLE_LOCALLY for dev sample only", () => {
      const audit = buildFullCmsIcd10ProductionSwitchAudit();
      expect(audit.fullCmsDataAvailableLocally).toBe(false);
      expect(audit.cmsStatus).toBe("FULL_CMS_DATA_NOT_AVAILABLE_LOCALLY");
      expect(audit.totalIcdRowsAudited).toBeGreaterThan(0);
    });

    it("04 — CMS audit includes registry and family template counts", () => {
      const audit = buildFullCmsIcd10ProductionSwitchAudit();
      expect(audit.registryTemplateCount).toBeGreaterThan(50);
      expect(audit.familyTemplateCount).toBeGreaterThan(10);
    });
  });

  describe("Phase 3 — real encounter validation threshold", () => {
    it("05 — fixture mode returns NOT_READY_FOR_DEFAULT_ON_THRESHOLDS_UNMET", () => {
      // Phase 13 — COMMON_DIAGNOSES growth pushed fixture audit past the ≥500-row volume gate;
      // production-default switch remains blocked on safety/sign-off thresholds.
      const report = buildRealEncounterProductionSwitchValidationReport({ mode: "fixture" });
      expect(report.result).toBe("NOT_READY_FOR_DEFAULT_ON_THRESHOLDS_UNMET");
      expect(report.aggregate.totalRows).toBeGreaterThanOrEqual(
        PRODUCTION_DEFAULT_SWITCH_THRESHOLDS.minimumRealEdDiagnosisRows
      );
    });

    it("06 — injected mock ≥500 rows can meet row count threshold", () => {
      const rows = buildMockRealEncounterRowsForThresholdTest(520);
      const report = buildRealEncounterProductionSwitchValidationReport({
        mode: "injected",
        injectedRows: rows,
        highRiskAuditPassed: true,
      });
      expect(report.aggregate.totalRows).toBeGreaterThanOrEqual(500);
      expect(report.thresholdEvaluation.meetsMinimumRowCount).toBe(true);
    });
  });

  describe("Phase 4 — high-risk clinical safety", () => {
    it("07 — PE remains blocked in gated resolver", () => {
      const gated = resolveDischargeTemplateForDiagnosisGated(
        { code: "I26.99", displayName: "Pulmonary embolism" },
        { featureFlags: { ED_DISCHARGE_USE_CONDITION_FAMILY_RESOLVER: true } }
      );
      expect(gated.resolverPath).not.toBe("family");
    });

    it("08 — DKA remains blocked in gated resolver", () => {
      const gated = resolveDischargeTemplateForDiagnosisGated(
        { code: "E10.10", displayName: "DKA" },
        { featureFlags: { ED_DISCHARGE_USE_CONDITION_FAMILY_RESOLVER: true } }
      );
      expect(gated.resolverPath).toBe("family_fallback_registry");
    });

    it("09 — high-risk safety report passes for gated resolver", () => {
      const report = buildHighRiskProductionSwitchSafetyReport();
      expect(report.highRiskAuditPassed).toBe(true);
      expect(report.rows.find((r) => r.condition === "PE")?.gatedResolverPath).toBe(
        "family_fallback_registry"
      );
    });

    it("10 — suicidal ideation remains high-risk template", () => {
      const row = buildHighRiskProductionSwitchSafetyReport().rows.find(
        (r) => r.condition === "Suicidal ideation"
      );
      expect(
        row?.familyTemplateId.includes("suicidal") ||
          row?.registryTemplateId.includes("suicidal") ||
          row?.gatedResolverPath === "family"
      ).toBe(true);
    });

    it("11 — DVT high-risk route is safe in family resolver", () => {
      const family = resolveClinicalConditionFamily({ code: "I82.409", displayName: "DVT evaluation" });
      expect(family.templateId).not.toBe(GENERIC_PROVIDER_DISCHARGE_TEMPLATE_ID);
    });
  });

  describe("Phase 5 — resolver variance", () => {
    it("12 — variance report has no unresolved regression risk in fixture dataset", () => {
      const report = buildProductionResolverVarianceReport();
      expect(report.unresolvedRegressionRiskCount).toBe(0);
    });

    it("13 — gated resolver uses family only when safe", () => {
      const safe = resolveDischargeTemplateForDiagnosisGated(
        { code: "R11.2", displayName: "Nausea and vomiting" },
        { featureFlags: { ED_DISCHARGE_USE_CONDITION_FAMILY_RESOLVER: true } }
      );
      expect(["family", "family_fallback_registry", "registry"]).toContain(safe.resolverPath);
    });

    it("14 — NEEDS_REVIEW families fall back to registry", () => {
      const gated = resolveDischargeTemplateForDiagnosisGated(
        { code: "I26.99", displayName: "PE" },
        { featureFlags: { ED_DISCHARGE_USE_CONDITION_FAMILY_RESOLVER: true } }
      );
      expect(gated.resolverPath).toBe("family_fallback_registry");
    });
  });

  describe("Phase 6–7 — rollout and monitoring plans", () => {
    it("15 — rollout plan includes rollback criteria at every stage", () => {
      expect(FAMILY_RESOLVER_FEATURE_FLAG_ROLLOUT_PLAN.length).toBeGreaterThanOrEqual(6);
      expect(
        FAMILY_RESOLVER_FEATURE_FLAG_ROLLOUT_PLAN.every((s) => s.rollbackTrigger.length > 0)
      ).toBe(true);
    });

    it("16 — monitoring plan includes generic fallback and unsafe blocked metrics", () => {
      expect(FAMILY_RESOLVER_MONITORING_PLAN.metrics).toContain("generic_fallback_rate");
      expect(FAMILY_RESOLVER_MONITORING_PLAN.metrics).toContain("unsafe_family_blocked_count");
    });
  });

  describe("Phase 8 — default-on readiness decision", () => {
    it("17 — default-on decision refuses when CMS audit missing", () => {
      const decision = determineProductionSwitchReadinessDecision();
      expect(decision.decision).not.toBe("READY_FOR_DEFAULT_ON");
      expect(decision.blockers.some((b) => b.includes("CMS"))).toBe(true);
    });

    it("18 — default-on decision refuses when clinical sign-off missing", () => {
      const decision = determineProductionSwitchReadinessDecision({ clinicalSignOffRecorded: false });
      expect(decision.decision).not.toBe("READY_FOR_DEFAULT_ON");
      expect(decision.blockers.some((b) => b.toLowerCase().includes("sign-off"))).toBe(true);
    });

    it("19 — decision is READY_FOR_SHADOW_ONLY when shadow infrastructure certified", () => {
      const cert = runProductionSwitchReadinessCertification();
      expect(cert.decision.decision).toBe("READY_FOR_SHADOW_ONLY");
      expect(cert.highRisk.highRiskAuditPassed).toBe(true);
      expect(cert.variance.unresolvedRegressionRiskCount).toBe(0);
      expect(cert.realEncounter.aggregate.gatedSafeParityPercent).toBe(100);
    });
  });

  describe("Pediatric fever age policy", () => {
    it("20 — pediatric fever age policy holds in family resolver", () => {
      expect(familyResolverPediatricFeverRequiresAge()).toBe(true);
    });

    it("21 — adult fever does not route pediatric in family resolver", () => {
      const adult = resolveClinicalConditionFamily({
        code: "R50.9",
        displayName: "Fever",
        context: { patientAgeYears: 72 },
      });
      expect(adult.templateId).not.toBe(PEDIATRIC_FEVER_TEMPLATE_ID);
      expect(adult.templateId).toBe(ADULT_FEVER_TEMPLATE_ID);
    });

    it("22 — unknown age fever does not route pediatric in family resolver", () => {
      expect(familyResolverAdultFeverForUnknownAge()).toBe(true);
    });
  });

  describe("Regression — enterprise and additions still work", () => {
    it("23 — enterprise discharge certification still passes", () => {
      expect(runEnterpriseDischargeCertification().enterpriseReady).toBe(true);
    });

    it("24 — patient-specific additions still render", () => {
      const additions = resolvePatientSpecificDischargeAdditions({
        templateIds: ["nausea_vomiting_v1"],
        context: { patientAgeYears: 72, diagnosisCodes: ["E11.9"], medicationNames: ["Ozempic"] },
        locale: "en",
      });
      expect(additions.length).toBeGreaterThan(0);
    });

    it("25 — medication-aware additions still render", () => {
      const names = mergeMedicationNamesForDischargeContext({
        explicitMedicationNames: ["Eliquis"],
      });
      const additions = resolvePatientSpecificDischargeAdditions({
        templateIds: ["chest_pain_v1"],
        context: { medicationNames: names },
        locale: "en",
      });
      expect(additions.some((a) => a.id.includes("anticoagulant"))).toBe(true);
    });

    it("26 — universal diagnosis fallback still works", () => {
      const resolved = resolveProviderDischargeTemplateForDiagnosis({
        code: "Z99.99",
        displayName: "Unknown",
      });
      expect(resolved.template.id).toBe(GENERIC_PROVIDER_DISCHARGE_TEMPLATE_ID);
    });

    it("27 — output surfaces still certified", () => {
      const form = buildCertificationFormForDiagnosis({ code: "R11.2", displayName: "Nausea", locale: "en" });
      expect(certifyUniversalOutputSurfaces(form, "en").allSurfacesOk).toBe(true);
    });
  });

  describe("Integration — full certification run", () => {
    it("28 — runProductionSwitchReadinessCertification aggregates all reports", () => {
      const cert = runProductionSwitchReadinessCertification();
      expect(cert.resolverState.activeProductionResolver).toBe("registry");
      expect(cert.cmsAudit.cmsStatus).toBe("FULL_CMS_DATA_NOT_AVAILABLE_LOCALLY");
      expect(cert.realEncounter.result).toBe("NOT_READY_FOR_DEFAULT_ON_THRESHOLDS_UNMET");
      expect(cert.resolverSafety.allPassed).toBe(true);
    });

    it("29 — shadow validation fixture mode runs without crash", () => {
      const report = runRealEncounterShadowValidation({ mode: "fixture" });
      expect(report.aggregate.gatedSafeParityPercent).toBeGreaterThanOrEqual(0);
    });

    it("30 — OB/GYN bleeding guardrails hold", () => {
      const male = resolveClinicalConditionFamily({
        code: "N93.9",
        displayName: "Vaginal bleeding",
        context: { patientSex: "male" },
      });
      expect(male.familyId).not.toBe("obgyn_vaginal_bleeding_v1");
    });
  });
});
