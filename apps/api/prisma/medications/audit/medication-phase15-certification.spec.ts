import {
  PHASE15_ARTIFACTS,
  PHASE15_CERTIFICATION_ID,
  decidePhase15Certification,
} from "./medication-phase15-certification";

describe("Phase 15 certification", () => {
  it("uses Part 15 certification id and artifact set", () => {
    expect(PHASE15_CERTIFICATION_ID).toContain("PHASE_15");
    expect(PHASE15_ARTIFACTS.length).toBeGreaterThanOrEqual(8);
  });

  it("certifies with governed deferrals when Tier-1 gaps remain open", () => {
    const decision = decidePhase15Certification({
      schemaOk: true,
      regressionOk: true,
      live: {
        waveKey: "EM_WAVE1_SOURCE_BACKED_V1",
        Wave1FamiliesRequested: 8,
        Wave1FamiliesResolved: 8,
        AcetaminophenInWave1: false,
        AcetaminophenIdentityBlocked: true,
        ShadowSnapshots: 8,
        SyntheticBatchStatus: "CERTIFIED",
        SyntheticReadiness: "QUALIFIED_WITH_GAPS",
        CriticalMisses: 0,
        UnexpectedFindings: 0,
        MissedFindings: 0,
        MatchedFindings: 24,
        FamiliesExecuted: 8,
        OpenGapsAfter: 8,
        OpenTier1KnowledgeGaps: 8,
        DeferredWorkItems: 8,
        RemediatedWorkItems: 0,
        BlockedWorkItems: 0,
        WorkItemsByStatus: { DEFERRED: 8 },
        AuthoritativeSourceRegistrations: 2,
        QualityScores: 8,
        OpenCriticalConflicts: 0,
        ProgramStatus: "COMPLETED",
        ClinicalActivations: 0,
        ProviderAlerts: 0,
        OrderBlocks: 0,
        ProductionCds: "OFF",
      },
    });
    expect(decision).toBe(
      "MEDICATION_INTELLIGENCE_PHASE_15_CERTIFIED_WITH_GOVERNED_DEFERRALS"
    );
  });

  it("refuses certification when critical misses or acetaminophen in Wave 1", () => {
    expect(
      decidePhase15Certification({
        schemaOk: true,
        regressionOk: true,
        live: {
          waveKey: "EM_WAVE1_SOURCE_BACKED_V1",
          Wave1FamiliesRequested: 8,
          Wave1FamiliesResolved: 8,
          AcetaminophenInWave1: true,
          AcetaminophenIdentityBlocked: false,
          ShadowSnapshots: 8,
          SyntheticBatchStatus: "CERTIFIED",
          SyntheticReadiness: "QUALIFIED_WITH_GAPS",
          CriticalMisses: 0,
          UnexpectedFindings: 0,
          MissedFindings: 0,
          MatchedFindings: 24,
          FamiliesExecuted: 8,
          OpenGapsAfter: 0,
          OpenTier1KnowledgeGaps: 0,
          DeferredWorkItems: 0,
          RemediatedWorkItems: 8,
          BlockedWorkItems: 0,
          WorkItemsByStatus: {},
          AuthoritativeSourceRegistrations: 2,
          QualityScores: 8,
          OpenCriticalConflicts: 0,
          ProgramStatus: "COMPLETED",
          ClinicalActivations: 0,
          ProviderAlerts: 0,
          OrderBlocks: 0,
          ProductionCds: "OFF",
        },
      })
    ).toBe("MEDICATION_INTELLIGENCE_PHASE_15_NOT_CERTIFIED");
  });
});
