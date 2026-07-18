import {
  PHASE14B_ARTIFACTS,
  PHASE14B_CERTIFICATION_ID,
  buildEnterpriseSummary,
  probePhase14BSchema,
} from "./medication-phase14b-certification";

describe("medication-phase14b-certification", () => {
  it("uses the expected certification identifier", () => {
    expect(PHASE14B_CERTIFICATION_ID).toBe(
      "MEDUI.MEDICATION_INTELLIGENCE_PHASE_14B_EXPERT_KNOWLEDGE_REVIEW_APPROVAL_FOR_SHADOW_AND_WAVE1_QUALIFICATION"
    );
  });

  it("lists eight certification artifacts", () => {
    expect(PHASE14B_ARTIFACTS).toHaveLength(8);
  });

  it("probes schema, Phase 13 reuse, services, API, UI, CLI", () => {
    const schema = probePhase14BSchema();
    expect(schema.migrationPresent).toBe(true);
    expect(schema.hasExpertReviewBatch).toBe(true);
    expect(schema.hasDomainReview).toBe(true);
    expect(schema.hasShadowSnapshot).toBe(true);
    expect(schema.servicePresent).toBe(true);
    expect(schema.reusesPhase13Approval).toBe(true);
    expect(schema.controllerPresent).toBe(true);
    expect(schema.uiPresent).toBe(true);
    expect(schema.cliPresent).toBe(true);
    expect(schema.frenchI18nPresent).toBe(true);
    expect(schema.sharedGovernancePresent).toBe(true);
    expect(schema.noCareControlDbConstraint).toBe(true);
  });

  it("certifies when review and shadow qualification exist without care control", () => {
    const summary = buildEnterpriseSummary({
      dataSource: "database",
      confidence: "HIGH",
      schema: probePhase14BSchema(),
      metrics: {
        batchStatus: "COMPLETED",
        familiesReviewed: 8,
        familiesApprovedForShadow: 8,
        familiesDeferred: 0,
        clinicalDomainsReviewed: 100,
        safetyDomainsReviewed: 60,
        qualityScores: 8,
        shadowSnapshots: 8,
        openConflicts: 0,
        auditEntries: 20,
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
    expect(summary.ApprovedForShadowImpliesProduction).toBe("NO");
    expect(summary.ClinicalActivationEnabled).toBe("NO");
  });
});
