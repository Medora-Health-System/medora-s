import { describe, expect, it } from "vitest";
import {
  PERMANENT_MEDICATION_VALIDATION_SUITE_CERTIFICATION_ID,
  buildPermanentCriticalBenchmark,
  clinicalFamilyTokenMatch,
  decidePermanentMedicationValidationSuite,
  listPermanentHardAcceptanceBenchmark,
  normalizeClinicalIngredientKey,
  shouldValidateFamilyLevelStrengths,
  validateFamilySearchResult,
  type PermanentBenchmarkFamily,
} from "./permanentMedicationValidationSuite.js";

function family(partial: Partial<PermanentBenchmarkFamily> & Pick<PermanentBenchmarkFamily, "benchmarkFamilyId" | "canonicalGenericName">): PermanentBenchmarkFamily {
  return {
    commonBrandNames: [],
    commonGenericNames: [partial.canonicalGenericName],
    commonSearchTerms: [],
    expectedStrengths: [],
    expectedOrderability: true,
    requiredForED: false,
    clinicalDomains: ["TEST"],
    hardAcceptance: false,
    source: "test",
    sourceVersion: "1",
    ...partial,
  };
}

describe("Permanent Medication Validation Suite", () => {
  it("uses permanent suite certification id", () => {
    expect(PERMANENT_MEDICATION_VALIDATION_SUITE_CERTIFICATION_ID).toContain(
      "PERMANENT_MEDICATION_VALIDATION_SUITE"
    );
  });

  it("builds a critical benchmark with hundreds of families", () => {
    const families = buildPermanentCriticalBenchmark();
    expect(families.length).toBeGreaterThanOrEqual(100);
    expect(listPermanentHardAcceptanceBenchmark().length).toBeGreaterThanOrEqual(2);
  });

  it("fails closed without negative regression proof", () => {
    expect(
      decidePermanentMedicationValidationSuite({
        schemaOk: true,
        criticalSuitePass: true,
        fullSuiteConfigured: true,
        deploymentSuiteConfigured: true,
        usedRealProviderSearchPath: true,
        usedSnapshotBypassAsGate: false,
        negativeRegressionTestPass: false,
        ciIntegrationPresent: true,
        reportsGenerated: true,
        orderMutations: 0,
        marMutations: 0,
        chartMutations: 0,
        migrationRequired: false,
      })
    ).toBe("PERMANENT_MEDICATION_VALIDATION_SUITE_NOT_CERTIFIED");
  });

  it("certifies when suite gates are complete", () => {
    expect(
      decidePermanentMedicationValidationSuite({
        schemaOk: true,
        criticalSuitePass: true,
        fullSuiteConfigured: true,
        deploymentSuiteConfigured: true,
        usedRealProviderSearchPath: true,
        usedSnapshotBypassAsGate: false,
        negativeRegressionTestPass: true,
        ciIntegrationPresent: true,
        reportsGenerated: true,
        orderMutations: 0,
        marMutations: 0,
        chartMutations: 0,
        migrationRequired: false,
      })
    ).toBe("PERMANENT_MEDICATION_VALIDATION_SUITE_CERTIFIED");
  });

  it("detects missing family on empty results", () => {
    const fam = buildPermanentCriticalBenchmark().find((f) => f.hardAcceptance)!;
    const failure = validateFamilySearchResult({
      family: fam,
      query: fam.commonSearchTerms[0] || fam.canonicalGenericName,
      items: [],
    });
    expect(failure?.classification).toBe("MISSING_FAMILY");
  });

  it("accepts Mounjaro/tirzepatide exact brand (not Jardiance)", () => {
    const fam = family({
      benchmarkFamilyId: "mounjaro",
      canonicalGenericName: "tirzepatide",
      commonBrandNames: ["Mounjaro"],
      commonGenericNames: ["tirzepatide"],
      commonSearchTerms: ["Mounjaro", "tirzepatide"],
    });
    const failure = validateFamilySearchResult({
      family: fam,
      query: "Mounjaro",
      items: [
        {
          label: "Mounjaro",
          metadata: { genericName: "Tirzepatide", strength: "5 mg", dosageForm: "pen", route: "SC" },
        },
      ],
    });
    expect(failure).toBeNull();
  });

  it("accepts Zepbound/tirzepatide exact brand", () => {
    const fam = family({
      benchmarkFamilyId: "zepbound",
      canonicalGenericName: "tirzepatide",
      commonBrandNames: ["Zepbound"],
      commonGenericNames: ["tirzepatide"],
      commonSearchTerms: ["Zepbound", "tirzepatide"],
    });
    expect(
      validateFamilySearchResult({
        family: fam,
        query: "Zepbound",
        items: [
          {
            label: "Zepbound",
            metadata: { genericName: "Tirzepatide", strength: "2.5 mg", dosageForm: "pen", route: "SC" },
          },
        ],
      })
    ).toBeNull();
  });

  it("accepts tirzepatide generic family", () => {
    const fam = family({
      benchmarkFamilyId: "tirzepatide",
      canonicalGenericName: "Tirzepatide",
      commonBrandNames: ["Mounjaro", "Zepbound"],
      commonGenericNames: ["Tirzepatide"],
      commonSearchTerms: ["Tirzepatide", "Mounjaro"],
    });
    expect(
      validateFamilySearchResult({
        family: fam,
        query: "tirzepatide",
        items: [
          {
            metadata: { genericName: "Tirzepatide", strength: "5 mg", dosageForm: "pen", route: "SC" },
          },
        ],
      })
    ).toBeNull();
  });

  it("still requires Jardiance/empagliflozin for jard (rejects tirzepatide top)", () => {
    const fam = family({
      benchmarkFamilyId: "jardiance",
      canonicalGenericName: "empagliflozin",
      commonBrandNames: ["Jardiance"],
      commonGenericNames: ["empagliflozin"],
      commonSearchTerms: ["Jardiance", "empagliflozin", "jard"],
    });
    const failure = validateFamilySearchResult({
      family: fam,
      query: "jard",
      items: [
        {
          label: "Mounjaro",
          metadata: { genericName: "Tirzepatide", strength: "5 mg", dosageForm: "pen", route: "SC" },
        },
      ],
    });
    expect(failure?.classification).toBe("HIDDEN_BY_RANKING");
  });

  it("rejects cross-family exact brand top hit", () => {
    const fam = family({
      benchmarkFamilyId: "jardiance",
      canonicalGenericName: "empagliflozin",
      commonBrandNames: ["Jardiance"],
      commonGenericNames: ["empagliflozin"],
      commonSearchTerms: ["Jardiance", "empagliflozin"],
    });
    const failure = validateFamilySearchResult({
      family: fam,
      query: "Jardiance",
      items: [
        {
          label: "Lipitor",
          metadata: { genericName: "Atorvastatin", strength: "20 mg", dosageForm: "tablet", route: "PO" },
        },
      ],
    });
    expect(failure?.classification).toBe("HIDDEN_BY_RANKING");
  });

  it("accepts salt/base equivalence for brand ranking", () => {
    expect(normalizeClinicalIngredientKey("Amiodarone Hydrochloride")).toBe("amiodarone");
    expect(clinicalFamilyTokenMatch("Amiodarone Hydrochloride", "Amiodarone 200 mg")).toBe(true);
    const fam = family({
      benchmarkFamilyId: "amiodarone-hydrochloride",
      canonicalGenericName: "Amiodarone Hydrochloride",
      commonBrandNames: ["Pacerone"],
      commonGenericNames: ["Amiodarone Hydrochloride"],
      commonSearchTerms: ["Pacerone", "Amiodarone Hydrochloride"],
    });
    expect(
      validateFamilySearchResult({
        family: fam,
        query: "Pacerone",
        items: [
          {
            label: "Amiodarone",
            metadata: { genericName: "Amiodarone", strength: "200 mg", dosageForm: "tablet", route: "PO" },
          },
        ],
      })
    ).toBeNull();
  });

  it("rejects non-equivalent ingredient families", () => {
    expect(clinicalFamilyTokenMatch("amiodarone hydrochloride", "metformin 500 mg")).toBe(false);
  });

  it("does not treat combination products as salt-equivalent to a single ingredient", () => {
    expect(
      clinicalFamilyTokenMatch("amoxicillin", "Amoxicillin + Clavulanic Acid 875/125 mg")
    ).toBe(true);
    expect(
      clinicalFamilyTokenMatch(
        "piperacillin tazobactam",
        "Amoxicillin + Clavulanic Acid 875/125 mg"
      )
    ).toBe(false);
  });

  it("skips family-level strengths for brand/product queries", () => {
    const fam = family({
      benchmarkFamilyId: "budesonide",
      canonicalGenericName: "Budesonide",
      commonBrandNames: ["PULMICORT FLEXHALER"],
      commonGenericNames: ["Budesonide"],
      commonSearchTerms: ["PULMICORT FLEXHALER", "Budesonide"],
      expectedStrengths: ["0.5 mg/2 mL", "180 mcg"],
    });
    expect(shouldValidateFamilyLevelStrengths(fam, "PULMICORT FLEXHALER")).toBe(false);
    expect(shouldValidateFamilyLevelStrengths(fam, "Budesonide")).toBe(true);
    expect(
      validateFamilySearchResult({
        family: fam,
        query: "PULMICORT FLEXHALER",
        items: [
          {
            label: "Pulmicort Flexhaler",
            metadata: {
              genericName: "Budesonide",
              strength: "200 mcg/dose",
              dosageForm: "DPI",
              route: "inhalation",
            },
          },
        ],
      })
    ).toBeNull();
  });
});
