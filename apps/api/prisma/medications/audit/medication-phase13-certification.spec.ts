import {
  PHASE13_ARTIFACTS,
  PHASE13_CERTIFICATION_ID,
  buildEnterpriseSummary,
  probePhase13Schema,
} from "./medication-phase13-certification";

describe("medication-phase13-certification", () => {
  it("uses the expected certification identifier", () => {
    expect(PHASE13_CERTIFICATION_ID).toBe(
      "MEDUI.MEDICATION_INTELLIGENCE_PHASE_13_SOURCE_BACKED_REVIEW_APPROVAL_CONTROLLED_SHADOW_VALIDATION"
    );
  });

  it("lists eight certification artifacts", () => {
    expect(PHASE13_ARTIFACTS).toHaveLength(8);
  });

  it("probes schema, migration, services, API, UI, CLI, and safeguards", () => {
    const schema = probePhase13Schema();
    expect(schema.migrationPresent).toBe(true);
    expect(schema.hasIdentityCase).toBe(true);
    expect(schema.hasApprovalWave).toBe(true);
    expect(schema.hasShadowRun).toBe(true);
    expect(schema.identityServicePresent).toBe(true);
    expect(schema.acetaminophenInvestigationPresent).toBe(true);
    expect(schema.waveSelectionPresent).toBe(true);
    expect(schema.sourceReadinessPresent).toBe(true);
    expect(schema.placeholderDetectionPresent).toBe(true);
    expect(schema.approvalGatesPresent).toBe(true);
    expect(schema.shadowRunPresent).toBe(true);
    expect(schema.controllerPresent).toBe(true);
    expect(schema.uiPresent).toBe(true);
    expect(schema.cliPresent).toBe(true);
    expect(schema.frenchI18nPresent).toBe(true);
    expect(schema.sharedGovernancePresent).toBe(true);
    expect(schema.noProviderAlertEndpoint).toBe(true);
    expect(schema.noOrderBlockingHook).toBe(true);
    expect(schema.noActivationEndpoint).toBe(true);
    expect(schema.noOverrideEndpoint).toBe(true);
    expect(schema.noBulkPatientReplay).toBe(true);
    expect(schema.alertsOffDbConstraint).toBe(true);
  });

  it("certifies when guards pass with acetaminophen deferred", () => {
    const summary = buildEnterpriseSummary({
      dataSource: "database",
      confidence: "HIGH",
      schema: probePhase13Schema(),
      metrics: {
        requestedFamilies: 35,
        resolvedFamilies: 34,
        identityBlockedFamilies: 1,
        acetaminophenResolutionStatus: "DEFERRED_IDENTITY_BLOCKER",
        wave1SelectedFamilies: 8,
        sourceReadyFamilies: 0,
        clinicalApprovedForShadow: 0,
        shadowEvaluableFamilies: 0,
        referenceCases: 8,
        matchedFindings: 8,
        missedFindings: 0,
        unexpectedFindings: 0,
        confirmedFalsePositives: 0,
        criticalMisses: 0,
        draftKnowledgeUsedByShadow: 0,
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
      "MEDICATION_INTELLIGENCE_PHASE_13_CERTIFIED"
    );
    expect(summary.AcetaminophenAutoResolved).toBe("NO");
    expect(summary.DraftKnowledgeConsumedByShadowEngine).toBe("NO");
    expect(summary.ClinicalActivationEnabled).toBe("NO");
    expect(summary.AutomaticKnowledgeApprovalEnabled).toBe("NO");
  });

  it("fails when focused tests fail", () => {
    const summary = buildEnterpriseSummary({
      dataSource: "database",
      confidence: "HIGH",
      schema: probePhase13Schema(),
      metrics: null,
      evidence: {
        focusedTestsPass: false,
        focusedTestSummary: "fail",
        fullRegressionPass: null,
        fullRegressionSummary: "",
        buildPass: null,
        typecheckPass: null,
        diffCheckPass: null,
        certificationIdempotent: null,
        priorPhasesPass: true,
      },
      knownBlockingGaps: [],
      knownNonblockingGaps: [],
    });
    expect(summary.FinalDecision).toBe(
      "MEDICATION_INTELLIGENCE_PHASE_13_NOT_CERTIFIED"
    );
  });
});
