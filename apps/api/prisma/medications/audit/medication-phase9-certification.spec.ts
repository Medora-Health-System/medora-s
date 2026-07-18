import {
  PHASE9_ARTIFACTS,
  PHASE9_CERTIFICATION_ID,
  buildEnterpriseSummary,
  probePhase9Schema,
} from "./medication-phase9-certification";

describe("medication phase 9 certification", () => {
  it("uses the expected certification identifier", () => {
    expect(PHASE9_CERTIFICATION_ID).toBe(
      "MEDUI.MEDICATION_INTELLIGENCE_PHASE_9_INTERACTION_ALLERGY_DUPLICATE_THERAPY_KNOWLEDGE_FOUNDATION"
    );
  });

  it("lists eight certification artifacts", () => {
    expect(PHASE9_ARTIFACTS).toHaveLength(8);
  });

  it("probes schema, migration, services, API, UI, and CLI", () => {
    const schema = probePhase9Schema();
    expect(schema.migrationPresent).toBe(true);
    expect(schema.hasDrugInteraction).toBe(true);
    expect(schema.hasSafetySource).toBe(true);
    expect(schema.hasAllergenConcept).toBe(true);
    expect(schema.hasDuplicateTherapyGroup).toBe(true);
    expect(schema.interactionServicePresent).toBe(true);
    expect(schema.controllerPresent).toBe(true);
    expect(schema.uiPresent).toBe(true);
    expect(schema.cliPresent).toBe(true);
    expect(schema.clinicalActivationDefaultFalse).toBe(true);
    expect(schema.noOrderBlockingHook).toBe(true);
    expect(schema.symmetricPairHelperWorks).toBe(true);
  });

  it("certifies when guards pass without clinical activation", () => {
    const summary = buildEnterpriseSummary({
      dataSource: "database",
      confidence: "HIGH",
      schema: probePhase9Schema(),
      metrics: {
        interactionCount: 0,
        approvedCount: 0,
        approvedWithActivationTrue: 0,
        allergenMappingCount: 0,
        duplicateTherapyRuleCount: 0,
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
    expect(summary.FinalDecision).toBe("MEDICATION_INTELLIGENCE_PHASE_9_CERTIFIED");
    expect(summary.AutomaticClinicalActivationEnabled).toBe("NO");
    expect(summary.PatientSpecificEvaluationEnabled).toBe("NO");
    expect(summary.OrderBlockingEnabled).toBe("NO");
    expect(summary.MedicationIdentityDuplicated).toBe("NO");
  });

  it("fails when approved interactions allow clinical activation", () => {
    const summary = buildEnterpriseSummary({
      dataSource: "database",
      confidence: "HIGH",
      schema: probePhase9Schema(),
      metrics: {
        interactionCount: 1,
        approvedCount: 1,
        approvedWithActivationTrue: 1,
        allergenMappingCount: 0,
        duplicateTherapyRuleCount: 0,
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
    expect(summary.FinalDecision).toBe(
      "MEDICATION_INTELLIGENCE_PHASE_9_NOT_CERTIFIED"
    );
  });
});
