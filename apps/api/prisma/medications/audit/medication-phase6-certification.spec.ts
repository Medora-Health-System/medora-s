import {
  PHASE6_ARTIFACTS,
  PHASE6_CERTIFICATION_ID,
  buildEnterpriseSummary,
  probePhase6Schema,
} from "./medication-phase6-certification";

describe("medication phase 6 certification", () => {
  it("uses the expected certification identifier", () => {
    expect(PHASE6_CERTIFICATION_ID).toBe(
      "MEDUI.MEDICATION_INTELLIGENCE_PHASE_6_GOVERNED_REVIEW_OPERATIONS_ADMIN_PLATFORM"
    );
  });

  it("lists twenty-four certification artifacts", () => {
    expect(PHASE6_ARTIFACTS).toHaveLength(24);
  });

  it("probes schema, API, UI, and pilot config", () => {
    const schema = probePhase6Schema();
    expect(schema.migrationPresent).toBe(true);
    expect(schema.hasReviewAuditModel).toBe(true);
    expect(schema.hasMedicationReviewerRole).toBe(true);
    expect(schema.hasMedicationAdminRole).toBe(true);
    expect(schema.controllerPresent).toBe(true);
    expect(schema.uiPresent).toBe(true);
    expect(schema.pilotConfigPresent).toBe(true);
  });

  it("certifies when guards and focused tests pass", () => {
    const summary = buildEnterpriseSummary({
      dataSource: "database",
      confidence: "HIGH",
      schema: probePhase6Schema(),
      metrics: {
        candidatesTotal: 10,
        candidatesOpen: 8,
        deferredCount: 1,
        verifiedCount: 1,
        rejectedCount: 0,
        auditEvents: 3,
        autoVerifiedCandidates: 0,
        activeRealVerifiedMappings: 0,
        catalogMedication: 1042,
        pilotEnabled: false,
        pilotImportExecuted: false,
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
    expect(summary.FinalDecision).toBe("MEDICATION_INTELLIGENCE_PHASE_6_CERTIFIED");
    expect(summary.AutomaticVerificationEnabled).toBe("NO");
    expect(summary.ClinicalActivationEnabled).toBe("NO");
    expect(summary.HttpAdminApi).toBe("YES");
    expect(summary.EmPilotEnabled).toBe("NO");
  });

  it("fails when automatic verification candidates exist", () => {
    const summary = buildEnterpriseSummary({
      dataSource: "database",
      confidence: "HIGH",
      schema: probePhase6Schema(),
      metrics: {
        candidatesTotal: 1,
        candidatesOpen: 1,
        deferredCount: 0,
        verifiedCount: 0,
        rejectedCount: 0,
        auditEvents: 0,
        autoVerifiedCandidates: 1,
        activeRealVerifiedMappings: 0,
        catalogMedication: 1,
        pilotEnabled: false,
        pilotImportExecuted: false,
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
    expect(summary.FinalDecision).toBe("MEDICATION_INTELLIGENCE_PHASE_6_NOT_CERTIFIED");
  });

  it("fails when EM pilot import was executed", () => {
    const summary = buildEnterpriseSummary({
      dataSource: "database",
      confidence: "HIGH",
      schema: probePhase6Schema(),
      metrics: {
        candidatesTotal: 0,
        candidatesOpen: 0,
        deferredCount: 0,
        verifiedCount: 0,
        rejectedCount: 0,
        auditEvents: 0,
        autoVerifiedCandidates: 0,
        activeRealVerifiedMappings: 0,
        catalogMedication: 1,
        pilotEnabled: false,
        pilotImportExecuted: true,
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
    expect(summary.FinalDecision).toBe("MEDICATION_INTELLIGENCE_PHASE_6_NOT_CERTIFIED");
  });
});
