import {
  PHASE10_ARTIFACTS,
  PHASE10_CERTIFICATION_ID,
  buildEnterpriseSummary,
  probePhase10Schema,
} from "./medication-phase10-certification";

describe("medication phase 10 certification", () => {
  it("uses the expected certification identifier", () => {
    expect(PHASE10_CERTIFICATION_ID).toBe(
      "MEDUI.MEDICATION_INTELLIGENCE_PHASE_10_PATIENT_SPECIFIC_MEDICATION_SAFETY_EVALUATION_SHADOW_MODE"
    );
  });

  it("lists eight certification artifacts", () => {
    expect(PHASE10_ARTIFACTS).toHaveLength(8);
  });

  it("probes schema, migration, services, API, UI, and CLI", () => {
    const schema = probePhase10Schema();
    expect(schema.migrationPresent).toBe(true);
    expect(schema.hasEvaluationRun).toBe(true);
    expect(schema.hasFinding).toBe(true);
    expect(schema.orchestratorPresent).toBe(true);
    expect(schema.controllerPresent).toBe(true);
    expect(schema.uiPresent).toBe(true);
    expect(schema.cliPresent).toBe(true);
    expect(schema.shadowOnlyConstraint).toBe(true);
    expect(schema.modeFailClosedWorks).toBe(true);
    expect(schema.noOrderBlockingHook).toBe(true);
    expect(schema.noOverrideEndpoint).toBe(true);
  });

  it("certifies when guards pass without provider alerts", () => {
    const summary = buildEnterpriseSummary({
      dataSource: "database",
      confidence: "HIGH",
      schema: probePhase10Schema(),
      metrics: {
        runCount: 0,
        findingCount: 0,
        findingsWithShadowOnlyFalse: 0,
        providerFacingAlertRoutes: 0,
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
    expect(summary.FinalDecision).toBe("MEDICATION_INTELLIGENCE_PHASE_10_CERTIFIED");
    expect(summary.ProviderFacingAlertsEnabled).toBe("NO");
    expect(summary.OrderBlockingEnabled).toBe("NO");
    expect(summary.ActiveCdsModeAvailable).toBe("NO");
  });

  it("fails when findings allow shadowOnly=false", () => {
    const summary = buildEnterpriseSummary({
      dataSource: "database",
      confidence: "HIGH",
      schema: probePhase10Schema(),
      metrics: {
        runCount: 1,
        findingCount: 1,
        findingsWithShadowOnlyFalse: 1,
        providerFacingAlertRoutes: 0,
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
      "MEDICATION_INTELLIGENCE_PHASE_10_NOT_CERTIFIED"
    );
  });
});
