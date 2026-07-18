import {
  PHASE14A_ARTIFACTS,
  PHASE14A_CERTIFICATION_ID,
  buildEnterpriseSummary,
  probePhase14ASchema,
} from "./medication-phase14a-certification";

describe("medication-phase14a-certification", () => {
  it("uses the expected certification identifier", () => {
    expect(PHASE14A_CERTIFICATION_ID).toBe(
      "MEDUI.MEDICATION_INTELLIGENCE_PHASE_14A_SOURCE_ACQUISITION_EVIDENCE_GOVERNANCE_KNOWLEDGE_COMPLETION"
    );
  });

  it("lists eight certification artifacts", () => {
    expect(PHASE14A_ARTIFACTS).toHaveLength(8);
  });

  it("probes schema, services, API, UI, CLI, and workflow isolation", () => {
    const schema = probePhase14ASchema();
    expect(schema.migrationPresent).toBe(true);
    expect(schema.hasAcquisitionBatch).toBe(true);
    expect(schema.hasSourceRegistration).toBe(true);
    expect(schema.hasEvidenceLink).toBe(true);
    expect(schema.hasCompletenessScore).toBe(true);
    expect(schema.servicePresent).toBe(true);
    expect(schema.sourceRegistrationPresent).toBe(true);
    expect(schema.provenanceLinkingPresent).toBe(true);
    expect(schema.reusesPhase8Sources).toBe(true);
    expect(schema.controllerPresent).toBe(true);
    expect(schema.uiPresent).toBe(true);
    expect(schema.cliPresent).toBe(true);
    expect(schema.frenchI18nPresent).toBe(true);
    expect(schema.sharedGovernancePresent).toBe(true);
    expect(schema.noProviderAlertEndpoint).toBe(true);
    expect(schema.noOrderBlockingHook).toBe(true);
    expect(schema.noActivationEndpoint).toBe(true);
    expect(schema.noCareControlDbConstraint).toBe(true);
  });

  it("certifies when provenance is established without care-workflow control", () => {
    const summary = buildEnterpriseSummary({
      dataSource: "database",
      confidence: "HIGH",
      schema: probePhase14ASchema(),
      metrics: {
        batchStatus: "COMPLETENESS_SCORED",
        targetFamilyCount: 8,
        familiesWithProvenance: 8,
        evidenceLinks: 40,
        placeholdersRetired: 8,
        sourceRegistrations: 2,
        knowledgeWithoutProvenance: 0,
        avgProvenanceScore: 60,
        clinicalApprovedForShadow: 0,
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
      "MEDICATION_INTELLIGENCE_PHASE_14A_CERTIFIED"
    );
    expect(summary.KnowledgeControlsPatientCare).toBe("NO");
    expect(summary.OrderingChanged).toBe("NO");
    expect(summary.ClinicalActivationEnabled).toBe("NO");
  });
});
