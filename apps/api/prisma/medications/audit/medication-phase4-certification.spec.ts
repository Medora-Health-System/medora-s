import {
  PHASE4_ARTIFACTS,
  PHASE4_CERTIFICATION_ID,
  buildEnterpriseSummary,
  probePhase4Schema,
} from "./medication-phase4-certification";

describe("medication phase 4 certification", () => {
  it("uses the expected certification identifier", () => {
    expect(PHASE4_CERTIFICATION_ID).toBe(
      "MEDUI.MEDICATION_INTELLIGENCE_PHASE_4_CONTROLLED_CANONICAL_RECONCILIATION_HUMAN_VERIFICATION_RXCUI_ASSIGNMENT"
    );
  });

  it("lists twenty-nine certification artifacts", () => {
    expect(PHASE4_ARTIFACTS).toHaveLength(29);
  });

  it("probes schema and synthetic targets", () => {
    const schema = probePhase4Schema();
    expect(schema.migrationPresent).toBe(true);
    expect(schema.hasVerifiedMappingModel).toBe(true);
    expect(schema.syntheticTargetsPresent).toBe(true);
  });

  it("certifies when controls and focused tests pass", () => {
    const summary = buildEnterpriseSummary({
      dataSource: "database",
      confidence: "HIGH",
      schema: probePhase4Schema(),
      metrics: {
        concepts: 1365,
        products: 1428,
        catalog: 1042,
        conceptRxNormPopulated: 1,
        conceptRxNormVerified: 1,
        fixtureConcepts: 3,
        candidatesByStatus: { AMBIGUOUS: 644, VERIFIED: 1 },
        verifiedMappingsActive: 1,
        verifiedMappingsSynthetic: 1,
        verifiedMappingsToRealBlockedProbe: true,
        routePermissionCount: 0,
      },
      evidence: {
        focusedTestsPass: true,
        focusedTestSummary: "unit",
        fullRegressionPass: true,
        fullRegressionSummary: "verify",
        buildPass: true,
        typecheckPass: true,
        diffCheckPass: true,
      },
      knownBlockingGaps: [],
      knownNonblockingGaps: ["synthetic only"],
    });
    expect(summary.FinalDecision).toBe("MEDICATION_INTELLIGENCE_PHASE_4_CERTIFIED");
    expect(summary.AutomaticVerificationEnabled).toBe("NO");
    expect(summary.HumanVerificationRequired).toBe("YES");
    expect(summary.SyntheticToRealMappingBlocked).toBe("YES");
    expect(summary.RealRxNormDataUsed).toBe("NO");
  });

  it("does not certify when synthetic-to-real block fails", () => {
    const summary = buildEnterpriseSummary({
      dataSource: "database",
      confidence: "HIGH",
      schema: probePhase4Schema(),
      metrics: {
        concepts: 1,
        products: 1,
        catalog: 1,
        conceptRxNormPopulated: 0,
        conceptRxNormVerified: 0,
        fixtureConcepts: 0,
        candidatesByStatus: {},
        verifiedMappingsActive: 0,
        verifiedMappingsSynthetic: 0,
        verifiedMappingsToRealBlockedProbe: false,
        routePermissionCount: 0,
      },
      evidence: {
        focusedTestsPass: true,
        focusedTestSummary: "unit",
        fullRegressionPass: true,
        fullRegressionSummary: "verify",
        buildPass: true,
        typecheckPass: true,
        diffCheckPass: true,
      },
      knownBlockingGaps: [],
      knownNonblockingGaps: [],
    });
    expect(summary.FinalDecision).toBe("MEDICATION_INTELLIGENCE_PHASE_4_NOT_CERTIFIED");
  });
});
