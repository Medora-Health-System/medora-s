import {
  PHASE2_ARTIFACTS,
  PHASE2_CERTIFICATION_ID,
  buildEnterpriseCertificationSummary,
  buildHistoricalIdentityPreservation,
  buildRxNormReadiness,
  probePhase2Schema,
} from "./medication-phase2-certification";

describe("medication phase 2 certification", () => {
  it("uses the expected certification identifier", () => {
    expect(PHASE2_CERTIFICATION_ID).toBe(
      "MEDUI.MEDICATION_INTELLIGENCE_PHASE_2_CANONICAL_IDENTITY_RXNORM_ROUTE_MAR_BILLING_FOUNDATION"
    );
  });

  it("lists sixteen certification artifacts", () => {
    expect(PHASE2_ARTIFACTS).toHaveLength(16);
  });

  it("probes schema for additive Phase 2 fields", () => {
    const schema = probePhase2Schema();
    expect(schema.migrationPresent).toBe(true);
    expect(schema.schemaHasRxNormMappingStatus).toBe(true);
    expect(schema.schemaHasDualLayerLinkageStatus).toBe(true);
    expect(schema.schemaHasProductRoutePermission).toBe(true);
    expect(schema.schemaHasDataClassification).toBe(true);
    expect(schema.schemaHasBillingMappingStatus).toBe(true);
  });

  it("keeps RxNormDataImported false in readiness artifact", () => {
    const artifact = buildRxNormReadiness("seed_files_only", "HIGH", null);
    expect(artifact.rxNormDataImported).toBe(false);
  });

  it("preserves historical snapshot identity", () => {
    const artifact = buildHistoricalIdentityPreservation("seed_files_only", "HIGH");
    expect(artifact.unitCheck.pass).toBe(true);
    expect(artifact.destructiveIdentityMigration).toBe(false);
  });

  it("certifies when schema and focused tests pass with no blockers", () => {
    const summary = buildEnterpriseCertificationSummary({
      dataSource: "seed_files_only",
      confidence: "HIGH",
      schema: probePhase2Schema(),
      metrics: null,
      evidence: {
        focusedTestsPass: true,
        focusedTestSummary: "unit",
        fullRegressionPass: true,
        fullRegressionSummary: "verify",
        buildPass: true,
        typecheckPass: true,
        diffCheckPass: true,
      },
      knownBlockingGaps: [],
      knownNonblockingGaps: ["RxNorm not imported"],
    });
    expect(summary.FinalDecision).toBe("MEDICATION_INTELLIGENCE_PHASE_2_CERTIFIED");
    expect(summary.RxNormDataImported).toBe("NO");
    expect(summary.SeedRequired).toBe("NO");
  });

  it("does not certify when focused tests fail", () => {
    const summary = buildEnterpriseCertificationSummary({
      dataSource: "seed_files_only",
      confidence: "HIGH",
      schema: probePhase2Schema(),
      metrics: null,
      evidence: {
        focusedTestsPass: false,
        focusedTestSummary: "fail",
        fullRegressionPass: true,
        fullRegressionSummary: "verify",
        buildPass: true,
        typecheckPass: true,
        diffCheckPass: true,
      },
      knownBlockingGaps: [],
      knownNonblockingGaps: [],
    });
    expect(summary.FinalDecision).toBe("MEDICATION_INTELLIGENCE_PHASE_2_NOT_CERTIFIED");
  });
});
