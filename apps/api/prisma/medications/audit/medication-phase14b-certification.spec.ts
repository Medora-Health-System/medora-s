import {
  PHASE14B_ARTIFACTS,
  PHASE14B_CERTIFICATION_ID,
  buildEnterpriseSummary,
  probePhase14BSchema,
} from "./medication-phase14b-certification";

describe("medication-phase14b-certification", () => {
  it("uses the Part 3 certification identifier", () => {
    expect(PHASE14B_CERTIFICATION_ID).toBe(
      "MEDUI.MEDICATION_INTELLIGENCE_PHASE_14B_CONTROLLED_SYNTHETIC_SHADOW_EVALUATION_GAP_ANALYSIS_REPORTING"
    );
  });

  it("lists nine certification artifacts", () => {
    expect(PHASE14B_ARTIFACTS).toHaveLength(9);
  });

  it("probes Part 2 and Part 3 schema, Phase 10 reuse, and isolation", () => {
    const schema = probePhase14BSchema();
    expect(schema.migrationPart2Present).toBe(true);
    expect(schema.migrationPart3Present).toBe(true);
    expect(schema.hasSyntheticBatch).toBe(true);
    expect(schema.hasSyntheticExecution).toBe(true);
    expect(schema.syntheticServicePresent).toBe(true);
    expect(schema.reusesPhase10Engine).toBe(true);
    expect(schema.rejectsDraftConsumption).toBe(true);
    expect(schema.controllerPresent).toBe(true);
    expect(schema.uiPresent).toBe(true);
    expect(schema.cliPresent).toBe(true);
    expect(schema.frenchI18nPresent).toBe(true);
    expect(schema.noCareControlDbConstraint).toBe(true);
  });

  it("certifies when synthetic execution completes without critical misses", () => {
    const summary = buildEnterpriseSummary({
      dataSource: "database",
      confidence: "HIGH",
      schema: probePhase14BSchema(),
      metrics: {
        expertReviewBatchStatus: "COMPLETED",
        familiesReviewed: 8,
        familiesApprovedForShadow: 8,
        qualityScores: 8,
        shadowSnapshots: 8,
        openConflicts: 0,
        syntheticBatchStatus: "CERTIFIED",
        syntheticReadiness: "QUALIFIED_WITH_GAPS",
        familiesExecuted: 8,
        familiesPassed: 8,
        referenceCases: 40,
        matchedFindings: 32,
        missedFindings: 0,
        unexpectedFindings: 0,
        criticalMisses: 0,
        deferredDomainSkips: 8,
        openGaps: 8,
        acetaminophenInWave1: false,
        clinicalActivations: 0,
      },
      evidence: {
        focusedTestsPass: true,
        focusedTestSummary: "unit",
        fullRegressionPass: true,
        fullRegressionSummary: "verify",
        buildPass: true,
        typecheckPass: true,
        diffCheckPass: true,
        certificationIdempotent: true,
        priorPhasesPass: true,
      },
      knownBlockingGaps: [],
      knownNonblockingGaps: [],
    });
    expect(summary.FinalDecision).toBe(
      "MEDICATION_INTELLIGENCE_PHASE_14B_CERTIFIED"
    );
    expect(summary.MutableDraftKnowledgeConsumed).toBe("NO");
    expect(summary.AcetaminophenIdentityBlocked).toBe("YES");
  });
});
