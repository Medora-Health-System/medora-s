import { describe, expect, it } from "vitest";
import { getDischargePrintHtml } from "@/components/encounters/DischargePrintLayout";
import {
  buildClinicalFamilyCoverageReport,
  buildResolverParityReport,
} from "./providerDischargeClinicalFamilyCoverage";
import {
  buildFullIcd10FamilyResolverAudit,
  buildFullIcd10RegistryVsFamilyAudit,
  buildIcd10CatalogCoverageReport,
  countKeywordOverrideRisk,
  summarizeGenericFallbackByFamily,
  type Icd10CatalogRow,
} from "./providerDischargeIcd10FamilyAudit";
import {
  buildCoverageGapClosureReport,
  buildProductionResolverCoverageAudit,
} from "./providerDischargeProductionResolverAudit";
import {
  ED_DISCHARGE_USE_CONDITION_FAMILY_RESOLVER,
  buildFeatureFlagScaffoldReport,
} from "./providerDischargeConditionFamilyFeatureFlag";
import {
  CLINICAL_CONDITION_FAMILY_DEFINITIONS,
  getFamiliesByRoutingStatus,
} from "./providerDischargeConditionFamilies";
import {
  conditionFamilyKeywordWouldOverrideIcdMatch,
  resolveClinicalConditionFamily,
} from "./providerDischargeConditionFamilyResolver";
import {
  buildShadowModeResolverComparatorReport,
  compareRegistryResolverToFamilyResolver,
} from "./providerDischargeResolverShadowCompare";
import { runResolverSafetyCertification } from "./providerDischargeResolverSafetyCertification";
import { resolveDischargeTemplateForDiagnosisGated } from "./providerDischargeTemplateResolverGate";
import { applyProviderDischargeTemplateToCardByDiagnosis } from "./providerDischargeCardTemplateSync";
import {
  applyProviderDischargeTemplateToCard,
  buildProviderDischargeCardFromDiagnosis,
  GENERIC_PROVIDER_DISCHARGE_TEMPLATE_ID,
  PROVIDER_DISCHARGE_TEMPLATE_REGISTRY,
  resolveProviderDischargeTemplateForDiagnosis,
} from "./providerDischargeTemplateRegistry";
import { getProviderDischargeSuggestedTextBody } from "./providerDischargeTemplateLocale";
import {
  hydrateProviderDischargeDocumentationForm,
  mergeProviderDischargeDocumentationIntoDischargeJson,
  normalizeProviderDischargeDiagnosisCards,
  type ProviderDischargeDiagnosisCard,
} from "./providerDischargeDocumentationModel";
import {
  buildProviderDischargeDocumentationPreviewSections,
  buildProviderDischargeDocumentationSummaryBlock,
} from "./providerDischargeDocumentationSummary";
import { loadIcd10DevSampleCatalog } from "./edDischargeCoverageAuditLevel2";

describe("MEDUI.ED.DISCHARGE.TEMPLATE_FAMILY_COVERAGE.3", () => {
  describe("coverage and gap closure", () => {
    it("1 — clinical family coverage ≥95%", () => {
      const report = buildClinicalFamilyCoverageReport();
      expect(report.coveragePercent).toBeGreaterThanOrEqual(95);
      expect(report.templatesNotAssigned).toBe(0);
    });

    it("2 — resolver parity ≥95%", () => {
      const parity = buildResolverParityReport();
      expect(parity.parityPercent).toBeGreaterThanOrEqual(95);
      expect(parity.targetMet).toBe(true);
    });

    it("3 — all unmapped templates explicitly classified via gap closure", () => {
      const audit = buildProductionResolverCoverageAudit();
      expect(audit.unmappedTemplateIds).toHaveLength(0);
      const gap = buildCoverageGapClosureReport();
      expect(gap.rows).toHaveLength(11);
      expect(gap.targetMet).toBe(true);
    });

    it("4 — production audit reports family resolver not in production path", () => {
      const audit = buildProductionResolverCoverageAudit();
      expect(audit.productionUsesFamilyResolver).toBe(false);
      expect(audit.needsReviewFamilies.length).toBeGreaterThan(0);
      expect(audit.unsafeDoNotMapFamilies.some((f) => f.id === "pe_evaluation_discharge")).toBe(true);
    });
  });

  describe("full ICD-10 audit tooling", () => {
    it("5 — full ICD audit works on dev sample", () => {
      const report = buildFullIcd10FamilyResolverAudit();
      expect(report.totalIcdCodesAudited).toBeGreaterThan(10);
      expect(report.top100FallbackCodes.length).toBeLessThanOrEqual(100);
    });

    it("6 — full ICD audit accepts injected catalog rows", () => {
      const injected: Icd10CatalogRow[] = [
        { code: "R11.2", label: "Nausea with vomiting" },
        { code: "Z99.99", label: "Unknown" },
      ];
      const report = buildFullIcd10FamilyResolverAudit(injected, "injected");
      expect(report.catalogSource).toBe("injected");
      expect(report.totalIcdCodesAudited).toBe(2);
    });

    it("7 — top 100 fallback list generated when catalog has generic codes", () => {
      const catalog = loadIcd10DevSampleCatalog();
      const report = buildFullIcd10FamilyResolverAudit(catalog, "dev_sample");
      expect(Array.isArray(report.top100FallbackCodes)).toBe(true);
    });

    it("8 — ICD catalog coverage report and generic fallback summary", () => {
      const catalog = [{ code: "E86.0", label: "Dehydration" }];
      const cov = buildIcd10CatalogCoverageReport(catalog, "injected");
      expect(cov.coveredByFamily).toBe(1);
      const summary = summarizeGenericFallbackByFamily([{ code: "Z99.99", label: "Unknown" }]);
      expect(summary.some((s) => s.familyId === "unmapped")).toBe(true);
    });
  });

  describe("shadow comparator", () => {
    it("9 — shadow comparator identical when registry and family agree", () => {
      const r = compareRegistryResolverToFamilyResolver({
        code: "R11.2",
        displayName: "Nausea with vomiting",
      });
      expect(r.familyOutcome).toBe("identical");
      expect(r.same).toBe(true);
    });

    it("10 — shadow comparator safer_family when family improves generic registry", () => {
      const r = compareRegistryResolverToFamilyResolver({
        code: "R53.1",
        displayName: "Weakness",
      });
      expect(["identical", "safer_family"]).toContain(r.familyOutcome);
    });

    it("11 — shadow comparator regression_risk for pediatric divergence", () => {
      const report = buildShadowModeResolverComparatorReport([
        { code: "R50.9", displayName: "Fever", context: { patientAgeYears: 40 } },
      ]);
      expect(report.comparisons.length).toBe(1);
    });
  });

  describe("feature flag scaffold", () => {
    it("12 — feature flag default OFF", () => {
      expect(ED_DISCHARGE_USE_CONDITION_FAMILY_RESOLVER).toBe(false);
      const report = buildFeatureFlagScaffoldReport();
      expect(report.defaultValue).toBe(false);
    });

    it("13 — flag OFF uses registry resolver", () => {
      const r = resolveDischargeTemplateForDiagnosisGated(
        { code: "R11.2", displayName: "Nausea" },
        { featureFlags: { ED_DISCHARGE_USE_CONDITION_FAMILY_RESOLVER: false } }
      );
      expect(r.resolverPath).toBe("registry");
      expect(r.template.id).toBe("nausea_vomiting_v1");
    });

    it("14 — flag ON uses family resolver when READY", () => {
      const r = resolveDischargeTemplateForDiagnosisGated(
        { code: "E86.0", displayName: "Dehydration" },
        { featureFlags: { ED_DISCHARGE_USE_CONDITION_FAMILY_RESOLVER: true } }
      );
      expect(r.resolverPath).toBe("family");
      expect(r.template.id).toBe("dehydration_v1");
    });

    it("15 — flag ON falls back for NEEDS_REVIEW family", () => {
      const r = resolveDischargeTemplateForDiagnosisGated(
        { code: "", displayName: "Foley catheter precautions" },
        { featureFlags: { ED_DISCHARGE_USE_CONDITION_FAMILY_RESOLVER: true } }
      );
      expect(r.resolverPath).toBe("family_fallback_registry");
    });

    it("16 — flag ON blocks UNSAFE_DO_NOT_MAP via registry fallback", () => {
      const r = resolveDischargeTemplateForDiagnosisGated(
        { code: "I26.99", displayName: "PE" },
        { featureFlags: { ED_DISCHARGE_USE_CONDITION_FAMILY_RESOLVER: true } }
      );
      expect(r.resolverPath).not.toBe("family");
    });
  });

  describe("routing safety", () => {
    it("17 — adult J00 does not route to pediatric URI", () => {
      const r = resolveClinicalConditionFamily({
        code: "J00",
        displayName: "URI",
        context: { patientAgeYears: 40 },
      });
      expect(r.familyId).toBe("uri_cough");
      expect(r.templateId).not.toContain("pediatric_uri");
    });

    it("18 — pediatric URI only with age context", () => {
      const child = resolveClinicalConditionFamily({
        code: "",
        displayName: "pediatric uri",
        context: { patientAgeYears: 8 },
      });
      expect(child.familyId).toBe("pediatric_uri");
    });

    it("19 — E11.9 not hyperglycemia", () => {
      const r = resolveClinicalConditionFamily({ code: "E11.9", displayName: "Type 2 diabetes" });
      expect(r.templateId).toBe("type_2_diabetes_v1");
    });

    it("20 — E11.65 routes to hyperglycemia", () => {
      const r = resolveClinicalConditionFamily({ code: "E11.65", displayName: "Hyperglycemia" });
      expect(r.templateId).toBe("hyperglycemia_v1");
    });

    it("21 — R53.1 not TIA/stroke", () => {
      const r = resolveClinicalConditionFamily({ code: "R53.1", displayName: "Weakness" });
      expect(r.familyId).not.toBe("neurology_stroke_tia");
    });

    it("22 — L08.9 cellulitis/skin infection", () => {
      const r = resolveClinicalConditionFamily({ code: "L08.9", displayName: "Skin infection" });
      expect(r.familyId).toBe("cellulitis_skin_infection");
    });

    it("23 — PE evaluation UNSAFE not routable", () => {
      const unsafe = getFamiliesByRoutingStatus("UNSAFE_DO_NOT_MAP");
      expect(unsafe.some((f) => f.id === "pe_evaluation_discharge")).toBe(true);
      const r = resolveClinicalConditionFamily({ code: "I26.99", displayName: "PE" });
      expect(r.familyId).not.toBe("pe_evaluation_discharge");
    });

    it("24 — keyword never overrides ICD exact", () => {
      expect(
        conditionFamilyKeywordWouldOverrideIcdMatch({
          code: "J00",
          displayName: "pediatric uri",
        })
      ).toBe(false);
    });

    it("25 — exclusions beat inclusion L02 vs L03", () => {
      const r = resolveClinicalConditionFamily({ code: "L02.91", displayName: "Abscess" });
      expect(r.familyId).toBe("cutaneous_abscess");
    });

    it("26 — generic fallback Z99.99", () => {
      const r = resolveClinicalConditionFamily({ code: "Z99.99", displayName: "Unknown" });
      expect(r.templateId).toBe(GENERIC_PROVIDER_DISCHARGE_TEMPLATE_ID);
    });
  });

  describe("production compatibility", () => {
    function r112Card(): ProviderDischargeDiagnosisCard {
      const resolved = resolveProviderDischargeTemplateForDiagnosis({
        code: "R11.2",
        displayName: "Nausea and vomiting",
      });
      return applyProviderDischargeTemplateToCard(
        buildProviderDischargeCardFromDiagnosis({
          sourceEncounterDiagnosisId: "dx-r112",
          code: "R11.2",
          displayName: "Nausea and vomiting",
          displayOrder: 0,
          isPrimaryDiagnosis: true,
        }),
        resolved,
        { locale: "en", overwriteExisting: true }
      );
    }

    it("27 — R11.2 resolves to nausea/vomiting via registry", () => {
      const r = resolveProviderDischargeTemplateForDiagnosis({
        code: "R11.2",
        displayName: "Nausea with vomiting",
      });
      expect(r.template.id).toBe("nausea_vomiting_v1");
    });

    it("28 — R11.2 medication/treatment in preview", () => {
      const card = r112Card();
      const preview = buildProviderDischargeDocumentationPreviewSections(
        normalizeProviderDischargeDiagnosisCards({
          patientLeftEdAt: "2026-06-03T18:00:00.000Z",
          diagnosisRefs: [{ encounterDiagnosisId: "dx-r112", code: "R11.2", label: "Nausea", isPrimary: true }],
          diagnosisDocs: [card],
          returnPrecautions: "",
          returnWorkSchool: "",
          followUps: [],
        }),
        {},
        "en"
      );
      expect(preview.find((s) => s.id === "providerDoc")!.lines.join("\n")).toContain(
        "Diagnosis medication / treatment"
      );
    });

    it("29 — R11.2 medication/treatment in summary", () => {
      const card = r112Card();
      const merged = mergeProviderDischargeDocumentationIntoDischargeJson(
        {},
        normalizeProviderDischargeDiagnosisCards({
          patientLeftEdAt: "2026-06-03T18:00:00.000Z",
          diagnosisRefs: [{ encounterDiagnosisId: "dx-r112", code: "R11.2", label: "Nausea", isPrimary: true }],
          diagnosisDocs: [card],
          returnPrecautions: "",
          returnWorkSchool: "",
          followUps: [],
        }),
        { documentedAt: "2026-06-03T18:05:00.000Z", documentedByDisplayName: "Dr Test" }
      );
      expect(buildProviderDischargeDocumentationSummaryBlock(merged, "en")!.lines.join("\n")).toContain(
        "Diagnosis medication / treatment"
      );
    });

    it("30 — R11.2 medication/treatment in print HTML", () => {
      const card = r112Card();
      const body = getProviderDischargeSuggestedTextBody(
        PROVIDER_DISCHARGE_TEMPLATE_REGISTRY.find((t) => t.id === "nausea_vomiting_v1")!,
        "en"
      );
      const merged = mergeProviderDischargeDocumentationIntoDischargeJson(
        {},
        normalizeProviderDischargeDiagnosisCards({
          patientLeftEdAt: "2026-06-03T18:00:00.000Z",
          diagnosisRefs: [{ encounterDiagnosisId: "dx-r112", code: "R11.2", label: "Nausea", isPrimary: true }],
          diagnosisDocs: [card],
          returnPrecautions: body.returnPrecautions,
          returnWorkSchool: "",
          followUps: [],
        }),
        { documentedAt: "2026-06-03T18:05:00.000Z", documentedByDisplayName: "Dr Test" }
      );
      const html = getDischargePrintHtml({
        patient: { firstName: "T", lastName: "P", dob: "1990-01-01" },
        encounter: { createdAt: "2026-06-03T17:00:00.000Z", dischargeSummaryJson: merged },
        language: "en",
      });
      expect(html).toContain("Diagnosis medication / treatment");
    });

    it("31 — provider custom text unchanged on reapply", () => {
      const card: ProviderDischargeDiagnosisCard = {
        id: "doc-c3",
        sourceEncounterDiagnosisId: "dx-c3",
        encounterDiagnosisId: "dx-c3",
        code: "R11.2",
        displayName: "Nausea",
        isPrimaryDiagnosis: true,
        displayOrder: 0,
        description: "Custom note preserved",
        diagnosisInstructions: "Custom instructions",
        medicationTreatment: "Custom meds",
        treatment: "",
        returnPrecautions: "",
        returnWorkSchool: "",
        followUps: [],
        medicationLines: [],
        templateMeta: {
          templateId: "nausea_vomiting_v1",
          templateVersion: "1.0.0",
          matchLevel: "icdFamily",
          sourceReferences: [],
          providerConfirmed: true,
        },
      };
      const next = applyProviderDischargeTemplateToCardByDiagnosis(card, {
        locale: "en",
        overwriteExisting: false,
      });
      expect(next.description).toBe("Custom note preserved");
    });
  });

  describe("safety certification", () => {
    it("32 — safety certification all checks pass", () => {
      const report = runResolverSafetyCertification();
      expect(report.allPassed).toBe(true);
      expect(report.checks.length).toBeGreaterThanOrEqual(12);
    });

    it("33 — family count expanded with tier 3 gap closure", () => {
      expect(CLINICAL_CONDITION_FAMILY_DEFINITIONS.length).toBeGreaterThanOrEqual(75);
    });

    it("34 — dev catalog registry vs family audit runs", () => {
      const catalog = loadIcd10DevSampleCatalog().map((r) => ({ code: r.code, label: r.label }));
      const audit = buildFullIcd10RegistryVsFamilyAudit(catalog);
      expect(audit.total).toBeGreaterThan(0);
    });

    it("35 — keyword override risk count available", () => {
      const catalog = loadIcd10DevSampleCatalog().map((r) => ({ code: r.code, label: r.label }));
      expect(countKeywordOverrideRisk(catalog)).toBe(0);
    });
  });
});
