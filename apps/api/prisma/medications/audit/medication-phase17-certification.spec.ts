import {
  PHASE17_ARTIFACTS,
  PHASE17_CERTIFICATION_ID,
  decidePhase17Certification,
} from "./medication-phase17-certification";
import { PHASE17_RECOMMENDATION_DEFAULTS } from "@medora/shared";

function baseLive(
  overrides: Partial<Parameters<typeof decidePhase17Certification>[0]["live"]> = {}
) {
  return {
    Phase16Certified: true,
    Wave1ShadowDefinitions: 8,
    AcetaminophenDefinitions: 0,
    EnterpriseLifecycleDefinitions: 0,
    EligibleQualifications: 8,
    QualificationRows: 8,
    PilotProgramCount: 0,
    ActivePilotCount: 0,
    FacilityScopeCount: 0,
    ProviderCohortSize: 0,
    ActiveDefinitionCount: 0,
    AdvisoryExposureCount: 0,
    Acknowledgements: 0,
    Dismissals: 0,
    Disagreements: 0,
    SafetyEventCount: 0,
    AutomaticSuspensions: 0,
    OrderMutations: 0,
    MarMutations: 0,
    ChartMutations: 0,
    EnterpriseActivations: 0,
    OrderFromRecommendationPrograms: 0,
    ProductionCdsPrograms: 0,
    ProgramClinicalActivation: false,
    ProgramControlledPilotAllowed: false,
    ProgramEnterpriseActiveAllowed: false,
    ProgramOrderFromRecommendationAllowed: false,
    ClinicalActivations: 0,
    ProviderAlerts: 0,
    OrderBlocks: 0,
    ProductionCds: "OFF" as const,
    Defaults: PHASE17_RECOMMENDATION_DEFAULTS,
    ...overrides,
  };
}

describe("Phase 17 certification", () => {
  it("uses Phase 17 certification id and artifact set", () => {
    expect(PHASE17_CERTIFICATION_ID).toContain("PHASE_17");
    expect(PHASE17_ARTIFACTS.length).toBeGreaterThanOrEqual(4);
  });

  it("certifies pilot-ready when qualified and not activated", () => {
    expect(
      decidePhase17Certification({
        schemaOk: true,
        regressionOk: true,
        live: baseLive(),
      })
    ).toBe(
      "MEDICATION_INTELLIGENCE_PHASE_17_CERTIFIED_PILOT_READY_NOT_ACTIVATED"
    );
  });

  it("continues shadow-only when no qualifications", () => {
    expect(
      decidePhase17Certification({
        schemaOk: true,
        regressionOk: true,
        live: baseLive({ EligibleQualifications: 0, QualificationRows: 0 }),
      })
    ).toBe(
      "MEDICATION_INTELLIGENCE_PHASE_17_CERTIFIED_CONTINUE_SHADOW_ONLY"
    );
  });

  it("certifies controlled pilot only with scoped active authorization", () => {
    expect(
      decidePhase17Certification({
        schemaOk: true,
        regressionOk: true,
        live: baseLive({
          ActivePilotCount: 1,
          FacilityScopeCount: 1,
          ProviderCohortSize: 2,
          ActiveDefinitionCount: 8,
        }),
      })
    ).toBe("MEDICATION_INTELLIGENCE_PHASE_17_CERTIFIED_CONTROLLED_PILOT");
  });

  it("fails closed on mutations or enterprise", () => {
    expect(
      decidePhase17Certification({
        schemaOk: true,
        regressionOk: true,
        live: baseLive({ OrderMutations: 1 }),
      })
    ).toBe("MEDICATION_INTELLIGENCE_PHASE_17_NOT_CERTIFIED");

    expect(
      decidePhase17Certification({
        schemaOk: true,
        regressionOk: true,
        live: baseLive({ EnterpriseActivations: 1 }),
      })
    ).toBe("MEDICATION_INTELLIGENCE_PHASE_17_NOT_CERTIFIED");
  });
});
