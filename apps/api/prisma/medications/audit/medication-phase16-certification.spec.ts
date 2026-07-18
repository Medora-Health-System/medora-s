import {
  PHASE16_ARTIFACTS,
  PHASE16_CERTIFICATION_ID,
  decidePhase16Certification,
} from "./medication-phase16-certification";
import { PHASE16_RECOMMENDATION_DEFAULTS } from "@medora/shared";

describe("Phase 16 certification", () => {
  it("uses Phase 16 certification id and artifact set", () => {
    expect(PHASE16_CERTIFICATION_ID).toContain("PHASE_16");
    expect(PHASE16_ARTIFACTS.length).toBeGreaterThanOrEqual(3);
  });

  it("certifies shadow-only when engine is ready and Pilot/Active off", () => {
    const decision = decidePhase16Certification({
      schemaOk: true,
      regressionOk: true,
      live: {
        Wave1FamiliesRequested: 8,
        DefinitionCount: 8,
        ShadowRecommendationCount: 8,
        ControlledPilotCount: 0,
        EnterpriseActiveCount: 0,
        AcetaminophenDefinitions: 0,
        ShadowEvaluations: 1,
        MutatingEvaluations: 0,
        EvidenceLinks: 8,
        ProgramStatus: "SHADOW_READY",
        ProgramClinicalActivationAllowed: false,
        ProgramControlledPilotAllowed: false,
        ProgramEnterpriseActiveAllowed: false,
        ProgramOrderFromRecommendationAllowed: false,
        ClinicalActivations: 0,
        ProviderAlerts: 0,
        OrderBlocks: 0,
        ProductionCds: "OFF",
        Defaults: PHASE16_RECOMMENDATION_DEFAULTS,
      },
    });
    expect(decision).toBe(
      "MEDICATION_INTELLIGENCE_PHASE_16_CERTIFIED_SHADOW_ONLY"
    );
  });

  it("refuses certification when Pilot or mutating evals exist", () => {
    expect(
      decidePhase16Certification({
        schemaOk: true,
        regressionOk: true,
        live: {
          Wave1FamiliesRequested: 8,
          DefinitionCount: 8,
          ShadowRecommendationCount: 8,
          ControlledPilotCount: 1,
          EnterpriseActiveCount: 0,
          AcetaminophenDefinitions: 0,
          ShadowEvaluations: 1,
          MutatingEvaluations: 0,
          EvidenceLinks: 8,
          ProgramStatus: "SHADOW_READY",
          ProgramClinicalActivationAllowed: false,
          ProgramControlledPilotAllowed: false,
          ProgramEnterpriseActiveAllowed: false,
          ProgramOrderFromRecommendationAllowed: false,
          ClinicalActivations: 0,
          ProviderAlerts: 0,
          OrderBlocks: 0,
          ProductionCds: "OFF",
          Defaults: PHASE16_RECOMMENDATION_DEFAULTS,
        },
      })
    ).toBe("MEDICATION_INTELLIGENCE_PHASE_16_NOT_CERTIFIED");
  });
});
