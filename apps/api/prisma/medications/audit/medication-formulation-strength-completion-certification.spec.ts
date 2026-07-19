import {
  MEDICATION_FORMULATION_STRENGTH_COMPLETION_CERTIFICATION_ID,
  decideFormulationStrengthCompletionCertification,
} from "./medication-formulation-strength-completion-certification";

describe("Medication Formulation & Strength Completion certification", () => {
  it("uses formulation strength completion id", () => {
    expect(MEDICATION_FORMULATION_STRENGTH_COMPLETION_CERTIFICATION_ID).toContain(
      "FORMULATION_STRENGTH_COMPLETION"
    );
  });

  it("fails closed without hard acceptance", () => {
    expect(
      decideFormulationStrengthCompletionCertification({
        schemaOk: true,
        regressionOk: true,
        fabricatedData: false,
        createdNewGenerics: false,
        dualLayerActivated: false,
        familySearchPassRate: 1,
        formulationsCreated: 82,
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
      decideFormulationStrengthCompletionCertification({
        schemaOk: true,
        regressionOk: true,
        fabricatedData: false,
        createdNewGenerics: false,
        dualLayerActivated: false,
        familySearchPassRate: 1,
        formulationsCreated: 82,
        sourceApproved: true,
        orderMutations: 0,
        marMutations: 0,
        chartMutations: 0,
        completionIdempotent: true,
        hardAcceptancePass: true,
        exactRankingPassRate: 1,
        corpusSearchPassRate: 0.96,
        corpusSize: 200,
        absentHardAcceptanceCount: 0,
      })
    ).toBe("MEDICATION_FORMULATION_STRENGTH_COMPLETION_CERTIFIED_WITH_REVIEW_ITEMS");
  });
});
