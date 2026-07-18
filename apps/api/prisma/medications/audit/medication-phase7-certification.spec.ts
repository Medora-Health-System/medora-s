import {
  PHASE7_ARTIFACTS,
  PHASE7_CERTIFICATION_ID,
  buildEnterpriseSummary,
  probePhase7Schema,
} from "./medication-phase7-certification";

describe("medication phase 7 certification", () => {
  it("uses the expected certification identifier", () => {
    expect(PHASE7_CERTIFICATION_ID).toBe(
      "MEDUI.MEDICATION_INTELLIGENCE_PHASE_7_CONTROLLED_EMERGENCY_MEDICATION_BATCH_IMPLEMENTATION"
    );
  });

  it("lists fifteen certification artifacts", () => {
    expect(PHASE7_ARTIFACTS).toHaveLength(15);
  });

  it("probes schema, migration, batch service, CLI, and API", () => {
    const schema = probePhase7Schema();
    expect(schema.migrationPresent).toBe(true);
    expect(schema.hasBatchManifestModel).toBe(true);
    expect(schema.hasBatchItemModel).toBe(true);
    expect(schema.hasBatchCheckpointModel).toBe(true);
    expect(schema.batchServicePresent).toBe(true);
    expect(schema.batchCliPresent).toBe(true);
    expect(schema.batchControllerPresent).toBe(true);
    expect(schema.phase65MigrationPresent).toBe(true);
  });

  it("certifies when platform guards pass without executing authentic batch", () => {
    const summary = buildEnterpriseSummary({
      dataSource: "database",
      confidence: "HIGH",
      schema: probePhase7Schema(),
      metrics: {
        batchManifestCount: 0,
        batchItemCount: 0,
        autoVerifiedCandidates: 0,
        activeRealVerifiedMappings: 0,
        catalogMedication: 1042,
        identityCollisions: 0,
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
    expect(summary.FinalDecision).toBe("MEDICATION_INTELLIGENCE_PHASE_7_CERTIFIED");
    expect(summary.RealBatchExecutedDuringCertification).toBe("NO");
    expect(summary.RealVerifiedMappingsCreatedByCertification).toBe(0);
    expect(summary.ClinicalActivationEnabled).toBe("NO");
    expect(summary.AutomaticVerificationEnabled).toBe("NO");
    expect(summary.BulkRealMappingApprovalEnabled).toBe("NO");
  });

  it("fails when identity collisions exist", () => {
    const summary = buildEnterpriseSummary({
      dataSource: "database",
      confidence: "HIGH",
      schema: probePhase7Schema(),
      metrics: {
        batchManifestCount: 0,
        batchItemCount: 0,
        autoVerifiedCandidates: 0,
        activeRealVerifiedMappings: 0,
        catalogMedication: 1042,
        identityCollisions: 2,
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
    expect(summary.FinalDecision).toBe("MEDICATION_INTELLIGENCE_PHASE_7_NOT_CERTIFIED");
  });
});
