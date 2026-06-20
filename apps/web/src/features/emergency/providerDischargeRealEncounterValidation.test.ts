import { describe, expect, it } from "vitest";
import { ED_DISCHARGE_USE_CONDITION_FAMILY_RESOLVER } from "./providerDischargeConditionFamilyFeatureFlag";
import { resolveClinicalConditionFamily } from "./providerDischargeConditionFamilyResolver";
import {
  ADULT_FEVER_TEMPLATE_ID,
  derivePatientAgeYears,
  evaluatePediatricFeverAgePolicy,
  PEDIATRIC_FEVER_TEMPLATE_ID,
} from "./providerDischargePediatricFeverAgePolicy";
import {
  buildRealEncounterShadowValidationReport,
  buildResolverContextFromEncounterRow,
  PRODUCTION_DEFAULT_SWITCH_THRESHOLDS,
  runRealEncounterShadowValidation,
  validateRealEncounterDiagnosisRow,
  type RealEncounterDiagnosisRow,
} from "./providerDischargeRealEncounterValidation";
import { resolveDischargeTemplateForDiagnosisGated } from "./providerDischargeTemplateResolverGate";
import {
  GENERIC_PROVIDER_DISCHARGE_TEMPLATE_ID,
  resolveProviderDischargeTemplateForDiagnosis,
} from "./providerDischargeTemplateRegistry";

describe("MEDUI.ED.DISCHARGE.TEMPLATE_FAMILY_COVERAGE.6", () => {
  describe("Real encounter shadow validation", () => {
    it("1 — accepts fixture rows", () => {
      const report = runRealEncounterShadowValidation({ mode: "fixture" });
      expect(report.mode).toBe("fixture");
      expect(report.aggregate.totalRows).toBeGreaterThan(0);
      expect(report.rows.length).toBe(report.aggregate.totalRows);
    });

    it("2 — accepts injected export rows", () => {
      const injected: RealEncounterDiagnosisRow[] = [
        {
          encounterId: "enc-1",
          diagnosisCode: "R11.2",
          diagnosisLabel: "Nausea with vomiting",
          encounterClass: "ED",
        },
      ];
      const report = runRealEncounterShadowValidation({
        mode: "injected",
        injectedRows: injected,
      });
      expect(report.rows).toHaveLength(1);
      expect(report.rows[0].row.diagnosisCode).toBe("R11.2");
    });

    it("3 — reports aggregate metrics", () => {
      const report = runRealEncounterShadowValidation({ mode: "fixture" });
      expect(report.aggregate.uniqueIcdCodes).toBeGreaterThan(0);
      expect(report.aggregate.registryFamilyParityPercent).toBeGreaterThanOrEqual(0);
      expect(report.aggregate.gatedSafeParityPercent).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(report.aggregate.topVarianceRows)).toBe(true);
    });

    it("16 — identifies regression risk rows", () => {
      const row: RealEncounterDiagnosisRow = {
        encounterId: "enc-regression",
        diagnosisCode: "S00.93XA",
        diagnosisLabel: "Head injury",
        patientAgeYears: 4,
        encounterClass: "ED",
      };
      const result = validateRealEncounterDiagnosisRow(row);
      expect(result.outcome).not.toBe("regression_risk");
    });

    it("17 — identifies generic fallback rows", () => {
      const row: RealEncounterDiagnosisRow = {
        encounterId: "enc-generic",
        diagnosisCode: "Z99.99",
        diagnosisLabel: "Unmapped synthetic code",
        encounterClass: "ED",
      };
      const result = validateRealEncounterDiagnosisRow(row);
      expect(result.familyTemplateId).toBe(GENERIC_PROVIDER_DISCHARGE_TEMPLATE_ID);
    });
  });

  describe("Pediatric fever age policy", () => {
    it("4 — R50.9 age 10 routes pediatric fever", () => {
      const result = resolveClinicalConditionFamily({
        code: "R50.9",
        displayName: "Fever",
        context: { patientAgeYears: 10 },
      });
      expect(result.templateId).toBe(PEDIATRIC_FEVER_TEMPLATE_ID);
    });

    it("5 — R50.9 age 72 routes adult fever", () => {
      const result = resolveClinicalConditionFamily({
        code: "R50.9",
        displayName: "Fever",
        context: { patientAgeYears: 72 },
      });
      expect(result.templateId).toBe(ADULT_FEVER_TEMPLATE_ID);
    });

    it("6 — R50.9 unknown age does not route pediatric", () => {
      const result = resolveClinicalConditionFamily({
        code: "R50.9",
        displayName: "Fever",
      });
      expect(result.templateId).not.toBe(PEDIATRIC_FEVER_TEMPLATE_ID);
      expect(result.templateId).toBe(ADULT_FEVER_TEMPLATE_ID);
    });

    it("7 — pediatric label with unknown age follows NEEDS_REVIEW policy", () => {
      const policy = evaluatePediatricFeverAgePolicy({
        code: "R50.9",
        displayName: "Pediatric fever",
      });
      expect(policy.status).toBe("needs_review_pediatric_label_no_age");
      const result = resolveClinicalConditionFamily({
        code: "R50.9",
        displayName: "Pediatric fever",
      });
      expect(result.templateId).toBe(GENERIC_PROVIDER_DISCHARGE_TEMPLATE_ID);
    });

    it("8 — adult label with unknown age routes adult fever", () => {
      const result = resolveClinicalConditionFamily({
        code: "R50.9",
        displayName: "Adult fever",
      });
      expect(result.templateId).toBe(ADULT_FEVER_TEMPLATE_ID);
    });

    it("9 — patient DOB derives age correctly", () => {
      const age = derivePatientAgeYears({
        patientDob: "2015-06-01",
        referenceDate: "2025-06-03",
      });
      expect(age).toBe(10);
    });

    it("10 — invalid DOB does not crash", () => {
      expect(
        derivePatientAgeYears({ patientDob: "not-a-date" })
      ).toBeUndefined();
      expect(() =>
        resolveClinicalConditionFamily({
          code: "R50.9",
          displayName: "Fever",
          context: { patientDob: "not-a-date" },
        })
      ).not.toThrow();
    });

    it("11 — adult-to-pediatric prevented count increments", () => {
      const row: RealEncounterDiagnosisRow = {
        encounterId: "enc-fever-unknown",
        diagnosisCode: "R50.9",
        diagnosisLabel: "Fever",
        encounterClass: "ED",
      };
      const result = validateRealEncounterDiagnosisRow(row);
      expect(result.adultToPediatricPrevented).toBe(true);
      expect(result.unsafeAdultToPediatricRoute).toBe(false);

      const report = buildRealEncounterShadowValidationReport({
        mode: "injected",
        rows: [row],
      });
      expect(report.aggregate.adultToPediatricPreventedCount).toBe(1);
      expect(report.aggregate.unsafeAdultToPediatricRouteCount).toBe(0);
    });

    it("12 — shadow audit includes age-context status", () => {
      const row: RealEncounterDiagnosisRow = {
        encounterId: "enc-age-status",
        diagnosisCode: "R50.9",
        diagnosisLabel: "Fever",
        patientAgeYears: 8,
        encounterClass: "ED",
      };
      const result = validateRealEncounterDiagnosisRow(row);
      expect(result.ageContextUsed).toBe(8);
      expect(result.feverAgePolicyStatus).toBe("pediatric_confirmed");
    });
  });

  describe("Resolver safety and compatibility", () => {
    it("13 — gated resolver remains safe with flag OFF", () => {
      const gated = resolveDischargeTemplateForDiagnosisGated(
        { code: "R50.9", displayName: "Fever" },
        { featureFlags: { ED_DISCHARGE_USE_CONDITION_FAMILY_RESOLVER: false } }
      );
      expect(gated.resolverPath).toBe("registry");
      expect(gated.template.id).toBe(PEDIATRIC_FEVER_TEMPLATE_ID);
    });

    it("14 — feature flag OFF remains registry-only", () => {
      expect(ED_DISCHARGE_USE_CONDITION_FAMILY_RESOLVER).toBe(false);
      const production = resolveProviderDischargeTemplateForDiagnosis({
        code: "R50.9",
        displayName: "Fever",
      });
      expect(production.template.id).toBe(PEDIATRIC_FEVER_TEMPLATE_ID);
    });

    it("15 — production registry resolver unchanged", () => {
      const before = resolveProviderDischargeTemplateForDiagnosis({
        code: "J06.9",
        displayName: "URI",
      });
      expect(before.template.id).not.toBe(GENERIC_PROVIDER_DISCHARGE_TEMPLATE_ID);
    });

    it("18 — high-risk diagnoses remain protected", () => {
      const row: RealEncounterDiagnosisRow = {
        encounterId: "enc-stemi",
        diagnosisCode: "I21.3",
        diagnosisLabel: "STEMI",
        encounterClass: "ED",
      };
      const result = validateRealEncounterDiagnosisRow(row);
      expect(result.riskStatus).not.toBe("READY");
    });

    it("19 — R11.2 remains unchanged", () => {
      const registry = resolveProviderDischargeTemplateForDiagnosis({
        code: "R11.2",
        displayName: "Nausea with vomiting",
      });
      const family = resolveClinicalConditionFamily({
        code: "R11.2",
        displayName: "Nausea with vomiting",
      });
      expect(registry.template.id).toBe(family.templateId);
    });

    it("resolver context builder maps sex and encounter class", () => {
      const context = buildResolverContextFromEncounterRow({
        encounterId: "enc-ctx",
        diagnosisCode: "R50.9",
        diagnosisLabel: "Fever",
        patientSex: "female",
        encounterClass: "ED",
      });
      expect(context.patientSex).toBe("female");
      expect(context.encounterClass).toBe("ED");
    });

    it("production default switch thresholds not met on fixture-only audit", () => {
      const report = runRealEncounterShadowValidation({ mode: "fixture" });
      expect(report.productionDefaultSwitchEvaluation.readyForProductionDefaultSwitch).toBe(
        false
      );
      expect(
        report.productionDefaultSwitchEvaluation.blockers.some((b) =>
          b.includes(String(PRODUCTION_DEFAULT_SWITCH_THRESHOLDS.minimumRealEdDiagnosisRows))
        )
      ).toBe(true);
    });
  });
});
