import { describe, expect, it } from "vitest";
import {
  MEDICATION_FORMULATION_STRENGTH_COMPLETION_CERTIFICATION_ID,
  decideMedicationFormulationStrengthCompletion,
  normalizeFormulationStrengthKey,
} from "./medicationFormulationStrengthCompletion.js";
import { MEDICATION_PROVIDER_CLINICAL_CORPUS } from "./medicationProviderClinicalCorpus.js";

describe("Medication Formulation & Strength Completion", () => {
  it("uses formulation completion certification id", () => {
    expect(MEDICATION_FORMULATION_STRENGTH_COMPLETION_CERTIFICATION_ID).toContain(
      "FORMULATION_STRENGTH_COMPLETION"
    );
  });

  it("normalizes UI and units strength keys", () => {
    expect(normalizeFormulationStrengthKey("100 UI/mL")).toBe("100 units/ml");
    expect(normalizeFormulationStrengthKey("100 units/mL")).toBe("100 units/ml");
  });

  it("requires a broad clinical corpus", () => {
    expect(MEDICATION_PROVIDER_CLINICAL_CORPUS.length).toBeGreaterThanOrEqual(100);
  });

  it("fails closed without hard acceptance", () => {
    expect(
      decideMedicationFormulationStrengthCompletion({
        schemaOk: true,
        regressionOk: true,
        fabricatedData: false,
        createdNewGenerics: false,
        dualLayerActivated: false,
        familySearchPassRate: 1,
        formulationsCreated: 80,
        sourceApproved: true,
        orderMutations: 0,
        marMutations: 0,
        chartMutations: 0,
        completionIdempotent: true,
        hardAcceptancePass: false,
        exactRankingPassRate: 1,
        corpusSearchPassRate: 1,
        corpusSize: 200,
        absentHardAcceptanceCount: 1,
      })
    ).toBe("MEDICATION_FORMULATION_STRENGTH_COMPLETION_NOT_CERTIFIED");
  });

  it("certifies with review items when corpus is incomplete", () => {
    expect(
      decideMedicationFormulationStrengthCompletion({
        schemaOk: true,
        regressionOk: true,
        fabricatedData: false,
        createdNewGenerics: false,
        dualLayerActivated: false,
        familySearchPassRate: 1,
        formulationsCreated: 80,
        sourceApproved: true,
        orderMutations: 0,
        marMutations: 0,
        chartMutations: 0,
        completionIdempotent: true,
        hardAcceptancePass: true,
        exactRankingPassRate: 1,
        corpusSearchPassRate: 0.97,
        corpusSize: 200,
        absentHardAcceptanceCount: 0,
      })
    ).toBe("MEDICATION_FORMULATION_STRENGTH_COMPLETION_CERTIFIED_WITH_REVIEW_ITEMS");
  });

  it("certifies fully when provider-facing evidence is complete", () => {
    expect(
      decideMedicationFormulationStrengthCompletion({
        schemaOk: true,
        regressionOk: true,
        fabricatedData: false,
        createdNewGenerics: false,
        dualLayerActivated: false,
        familySearchPassRate: 1,
        formulationsCreated: 80,
        sourceApproved: true,
        orderMutations: 0,
        marMutations: 0,
        chartMutations: 0,
        completionIdempotent: true,
        hardAcceptancePass: true,
        exactRankingPassRate: 1,
        corpusSearchPassRate: 1,
        corpusSize: 200,
        absentHardAcceptanceCount: 0,
      })
    ).toBe("MEDICATION_FORMULATION_STRENGTH_COMPLETION_CERTIFIED");
  });
});
