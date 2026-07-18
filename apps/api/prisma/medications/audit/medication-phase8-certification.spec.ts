import {
  PHASE8_ARTIFACTS,
  PHASE8_CERTIFICATION_ID,
  buildEnterpriseSummary,
  probePhase8Schema,
} from "./medication-phase8-certification";

describe("medication phase 8 certification", () => {
  it("uses the expected certification identifier", () => {
    expect(PHASE8_CERTIFICATION_ID).toBe(
      "MEDUI.MEDICATION_INTELLIGENCE_PHASE_8_CLINICAL_KNOWLEDGE_FOUNDATION"
    );
  });

  it("lists eight certification artifacts", () => {
    expect(PHASE8_ARTIFACTS).toHaveLength(8);
  });

  it("probes schema, migration, service, API, and UI", () => {
    const schema = probePhase8Schema();
    expect(schema.migrationPresent).toBe(true);
    expect(schema.hasClinicalProfile).toBe(true);
    expect(schema.hasKnowledgeSource).toBe(true);
    expect(schema.hasDoseRecommendation).toBe(true);
    expect(schema.servicePresent).toBe(true);
    expect(schema.controllerPresent).toBe(true);
    expect(schema.uiPresent).toBe(true);
    expect(schema.clinicalActivationDefaultFalse).toBe(true);
  });

  it("certifies when guards pass without clinical activation", () => {
    const summary = buildEnterpriseSummary({
      dataSource: "database",
      confidence: "HIGH",
      schema: probePhase8Schema(),
      metrics: {
        profileCount: 0,
        approvedCount: 0,
        approvedWithActivationTrue: 0,
        sourceCount: 0,
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
    expect(summary.FinalDecision).toBe("MEDICATION_INTELLIGENCE_PHASE_8_CERTIFIED");
    expect(summary.AutomaticClinicalActivationEnabled).toBe("NO");
    expect(summary.OrderingBehaviorChanged).toBe("NO");
    expect(summary.MedicationIdentitySeparated).toBe("YES");
  });

  it("fails when approved profiles allow clinical activation", () => {
    const summary = buildEnterpriseSummary({
      dataSource: "database",
      confidence: "HIGH",
      schema: probePhase8Schema(),
      metrics: {
        profileCount: 1,
        approvedCount: 1,
        approvedWithActivationTrue: 1,
        sourceCount: 1,
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
    expect(summary.FinalDecision).toBe("MEDICATION_INTELLIGENCE_PHASE_8_NOT_CERTIFIED");
  });
});
