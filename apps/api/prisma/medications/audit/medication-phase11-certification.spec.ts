import {
  PHASE11_ARTIFACTS,
  PHASE11_CERTIFICATION_ID,
  buildEnterpriseSummary,
  probePhase11Schema,
} from "./medication-phase11-certification";

describe("medication phase 11 certification", () => {
  it("uses the expected certification identifier", () => {
    expect(PHASE11_CERTIFICATION_ID).toBe(
      "MEDUI.MEDICATION_INTELLIGENCE_PHASE_11_SHADOW_VALIDATION_COVERAGE_PHARMACIST_REVIEW_ACTIVATION_READINESS"
    );
  });

  it("lists eight certification artifacts", () => {
    expect(PHASE11_ARTIFACTS).toHaveLength(8);
  });

  it("probes schema, migration, services, API, UI, CLI, and docs", () => {
    const schema = probePhase11Schema();
    expect(schema.migrationPresent).toBe(true);
    expect(schema.hasFamilyCoverageProfile).toBe(true);
    expect(schema.hasValidationCase).toBe(true);
    expect(schema.hasReadinessPolicy).toBe(true);
    expect(schema.hasAttestation).toBe(true);
    expect(schema.coverageServicePresent).toBe(true);
    expect(schema.caseServicePresent).toBe(true);
    expect(schema.controllerPresent).toBe(true);
    expect(schema.uiPresent).toBe(true);
    expect(schema.cliPresent).toBe(true);
    expect(schema.frenchI18nPresent).toBe(true);
    expect(schema.noProviderAlertEndpoint).toBe(true);
    expect(schema.noOrderBlockingHook).toBe(true);
    expect(schema.noActivationEndpoint).toBe(true);
    expect(schema.noOverrideEndpoint).toBe(true);
    expect(schema.blindReviewPresent).toBe(true);
    expect(schema.dualReviewPresent).toBe(true);
    expect(schema.alertsOffDbConstraint).toBe(true);
    expect(schema.clinicalActivationOffDbConstraint).toBe(true);
  });

  it("certifies when guards pass without clinical activation", () => {
    const summary = buildEnterpriseSummary({
      dataSource: "database",
      confidence: "HIGH",
      schema: probePhase11Schema(),
      metrics: {
        familyProfileCount: 0,
        validationCaseCount: 0,
        attestationClinicalActivations: 0,
        inventoryConcepts: 1377,
        inventoryProducts: 1429,
        inventoryPackages: 1428,
        emFamiliesPresent: 0,
        emFamilyNames: [],
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
      "MEDICATION_INTELLIGENCE_PHASE_11_CERTIFIED"
    );
    expect(summary.ProviderFacingAlertsEnabled).toBe("NO");
    expect(summary.OrderBlockingEnabled).toBe("NO");
    expect(summary.ClinicalActivationEnabled).toBe("NO");
    expect(summary.ActiveCdsModeAvailable).toBe("NO");
    expect(summary.AutomaticMedicationIdentityCreationEnabled).toBe("NO");
  });

  it("fails when attestations claim clinical activation", () => {
    const summary = buildEnterpriseSummary({
      dataSource: "database",
      confidence: "HIGH",
      schema: probePhase11Schema(),
      metrics: {
        familyProfileCount: 1,
        validationCaseCount: 1,
        attestationClinicalActivations: 1,
        inventoryConcepts: 1,
        inventoryProducts: 1,
        inventoryPackages: 1,
        emFamiliesPresent: 0,
        emFamilyNames: [],
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
      "MEDICATION_INTELLIGENCE_PHASE_11_NOT_CERTIFIED"
    );
  });
});
