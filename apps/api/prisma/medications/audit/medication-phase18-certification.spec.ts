import {
  PHASE18_ARTIFACTS,
  PHASE18_CERTIFICATION_ID,
  decidePhase18Certification,
} from "./medication-phase18-certification";
import { PHASE18_RECOMMENDATION_DEFAULTS } from "@medora/shared";

function baseLive(
  overrides: Partial<Parameters<typeof decidePhase18Certification>[0]["live"]> = {}
) {
  return {
    Phase17Certified: true,
    SealedVersions: 8,
    ShadowDefinitions: 8,
    AcetaminophenDefinitions: 0,
    ReplayTotal: 8,
    ReplayFailures: 0,
    ReplayCareMutations: 0,
    OrderMutations: 0,
    MarMutations: 0,
    ChartMutations: 0,
    QualityScore: 75,
    ExplainabilityScore: 90,
    ReproducibilityScore: 100,
    OpsSnapshotPresent: true,
    RegulatoryArtifacts: 7,
    RegulatoryApprovalClaims: 0,
    DriftInterruptsProviders: 0,
    EnterpriseLifecycleDefinitions: 0,
    ProgramEnterpriseActiveAllowed: false,
    ProgramOrderFromRecommendationAllowed: false,
    ProgramClinicalActivation: false,
    ClinicalActivations: 0,
    ProviderAlerts: 0,
    OrderBlocks: 0,
    ProductionCds: "OFF" as const,
    Defaults: PHASE18_RECOMMENDATION_DEFAULTS,
    ...overrides,
  };
}

describe("Phase 18 certification", () => {
  it("uses Phase 18 certification id", () => {
    expect(PHASE18_CERTIFICATION_ID).toContain("PHASE_18");
    expect(PHASE18_ARTIFACTS.length).toBeGreaterThanOrEqual(4);
  });

  it("certifies operational ready when sealed + quality + replay ok", () => {
    expect(
      decidePhase18Certification({
        schemaOk: true,
        regressionOk: true,
        live: baseLive(),
      })
    ).toBe("MEDICATION_INTELLIGENCE_PHASE_18_CERTIFIED_OPERATIONAL_READY");
  });

  it("fails closed on replay failures or mutations", () => {
    expect(
      decidePhase18Certification({
        schemaOk: true,
        regressionOk: true,
        live: baseLive({ ReplayFailures: 1 }),
      })
    ).toBe("MEDICATION_INTELLIGENCE_PHASE_18_NOT_CERTIFIED");
    expect(
      decidePhase18Certification({
        schemaOk: true,
        regressionOk: true,
        live: baseLive({ OrderMutations: 1 }),
      })
    ).toBe("MEDICATION_INTELLIGENCE_PHASE_18_NOT_CERTIFIED");
  });

  it("can certify monitoring-ready with minimal governance", () => {
    expect(
      decidePhase18Certification({
        schemaOk: true,
        regressionOk: true,
        live: baseLive({
          SealedVersions: 0,
          RegulatoryArtifacts: 0,
          QualityScore: 20,
          OpsSnapshotPresent: false,
          ReplayTotal: 0,
        }),
      })
    ).toBe("MEDICATION_INTELLIGENCE_PHASE_18_CERTIFIED_MONITORING_READY");
  });
});
