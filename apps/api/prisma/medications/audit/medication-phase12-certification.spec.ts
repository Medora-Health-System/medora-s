import {
  PHASE12_ARTIFACTS,
  PHASE12_CERTIFICATION_ID,
  buildEnterpriseSummary,
  probePhase12Schema,
} from "./medication-phase12-certification";

describe("medication-phase12-certification", () => {
  it("uses the expected certification identifier", () => {
    expect(PHASE12_CERTIFICATION_ID).toBe(
      "MEDUI.MEDICATION_INTELLIGENCE_PHASE_12_CONTROLLED_EMERGENCY_MEDICATION_CLINICAL_SAFETY_KNOWLEDGE_POPULATION"
    );
  });

  it("lists eight certification artifacts", () => {
    expect(PHASE12_ARTIFACTS).toHaveLength(8);
  });

  it("probes schema, migration, services, API, UI, CLI, and safeguards", () => {
    const schema = probePhase12Schema();
    expect(schema.migrationPresent).toBe(true);
    expect(schema.hasPopulationBatch).toBe(true);
    expect(schema.hasBatchItem).toBe(true);
    expect(schema.hasConflict).toBe(true);
    expect(schema.hasImportRun).toBe(true);
    expect(schema.batchServicePresent).toBe(true);
    expect(schema.identityResolutionPresent).toBe(true);
    expect(schema.previewPresent).toBe(true);
    expect(schema.dryRunPresent).toBe(true);
    expect(schema.draftExecutePresent).toBe(true);
    expect(schema.rollbackPresent).toBe(true);
    expect(schema.manifestPresent).toBe(true);
    expect(schema.clinicalSchemaPresent).toBe(true);
    expect(schema.safetySchemaPresent).toBe(true);
    expect(schema.controllerPresent).toBe(true);
    expect(schema.uiPresent).toBe(true);
    expect(schema.cliPresent).toBe(true);
    expect(schema.frenchI18nPresent).toBe(true);
    expect(schema.sharedGovernancePresent).toBe(true);
    expect(schema.noProviderAlertEndpoint).toBe(true);
    expect(schema.noOrderBlockingHook).toBe(true);
    expect(schema.noActivationEndpoint).toBe(true);
    expect(schema.noOverrideEndpoint).toBe(true);
    expect(schema.noAutoApprovePath).toBe(true);
    expect(schema.alertsOffDbConstraint).toBe(true);
    expect(schema.blocksOffDbConstraint).toBe(true);
    expect(schema.activationOffDbConstraint).toBe(true);
  });

  it("certifies when guards pass without clinical activation", () => {
    const summary = buildEnterpriseSummary({
      dataSource: "database",
      confidence: "HIGH",
      schema: probePhase12Schema(),
      metrics: {
        batchKey: "EM_KNOWLEDGE_POPULATION_V1",
        batchStatus: "CONTENT_CREATED",
        familiesRequested: 35,
        familiesResolved: 34,
        familiesUnresolved: 1,
        unresolvedFamilyNames: ["acetaminophen"],
        clinicalDraftProfiles: 34,
        clinicalApprovedProfiles: 0,
        safetyDraftMappings: 0,
        safetyApprovedMappings: 0,
        conflictsOpen: 0,
        conflictsBlocking: 0,
        shadowEvaluableFamilies: 0,
        recordsWithoutSources: 0,
        importRunsCreatingApproved: 0,
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
      "MEDICATION_INTELLIGENCE_PHASE_12_CERTIFIED"
    );
    expect(summary.ProviderFacingAlertsEnabled).toBe("NO");
    expect(summary.OrderBlockingEnabled).toBe("NO");
    expect(summary.ClinicalActivationEnabled).toBe("NO");
    expect(summary.AutomaticKnowledgeApprovalEnabled).toBe("NO");
    expect(summary.AutomaticMedicationIdentityCreationEnabled).toBe("NO");
    expect(summary.DraftOnlyImportImplemented).toBe("YES");
  });

  it("fails certification when focused tests fail", () => {
    const summary = buildEnterpriseSummary({
      dataSource: "database",
      confidence: "HIGH",
      schema: probePhase12Schema(),
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
      "MEDICATION_INTELLIGENCE_PHASE_12_NOT_CERTIFIED"
    );
  });
});
