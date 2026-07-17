import {
  PHASE5_ARTIFACTS,
  PHASE5_CERTIFICATION_ID,
  buildEnterpriseSummary,
  probePhase5Schema,
} from "./medication-phase5-certification";

describe("medication phase 5 certification", () => {
  it("uses the expected certification identifier", () => {
    expect(PHASE5_CERTIFICATION_ID).toBe(
      "MEDUI.MEDICATION_INTELLIGENCE_PHASE_5_CONTROLLED_REAL_RXNORM_REFERENCE_INGESTION_RELEASE_GOVERNANCE_NONCLINICAL_VALIDATION"
    );
  });

  it("lists twenty-nine certification artifacts", () => {
    expect(PHASE5_ARTIFACTS).toHaveLength(29);
  });

  it("probes schema, fixtures, and gitignore", () => {
    const schema = probePhase5Schema();
    expect(schema.migrationPresent).toBe(true);
    expect(schema.hasSourceClassification).toBe(true);
    expect(schema.structuralFixturePresent).toBe(true);
    expect(schema.gitignoreBlocksRrf).toBe(true);
    expect(schema.phase4VerifiedMappingPresent).toBe(true);
  });

  it("certifies when real verified mappings remain zero", () => {
    const summary = buildEnterpriseSummary({
      dataSource: "database",
      confidence: "HIGH",
      schema: probePhase5Schema(),
      metrics: {
        releases: 2,
        syntheticReleases: 1,
        realClassifiedReleases: 0,
        stagingRows: 33,
        referenceClassifiedStaging: 0,
        candidates: 650,
        verifiedActiveSynthetic: 1,
        verifiedActiveReal: 0,
        conceptRxNormPopulated: 1,
        conceptRealRxNormPopulated: 0,
        catalogMedication: 1042,
        routePermissions: 0,
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
      },
      knownBlockingGaps: [],
      knownNonblockingGaps: ["structural fixture only"],
    });
    expect(summary.FinalDecision).toBe("MEDICATION_INTELLIGENCE_PHASE_5_CERTIFIED");
    expect(summary.AutomaticVerificationEnabled).toBe("NO");
    expect(summary.HumanVerificationRequired).toBe("YES");
    expect(summary.RealRxNormDataUsedDuringCertification).toBe("NO");
    expect(summary.ClinicalActivationEnabled).toBe("NO");
    expect(summary.RealVerifiedMappingsCreatedByCertification).toBe(0);
  });

  it("does not certify when real verified mappings exist", () => {
    const summary = buildEnterpriseSummary({
      dataSource: "database",
      confidence: "HIGH",
      schema: probePhase5Schema(),
      metrics: {
        releases: 1,
        syntheticReleases: 0,
        realClassifiedReleases: 1,
        stagingRows: 1,
        referenceClassifiedStaging: 1,
        candidates: 1,
        verifiedActiveSynthetic: 0,
        verifiedActiveReal: 1,
        conceptRxNormPopulated: 1,
        conceptRealRxNormPopulated: 1,
        catalogMedication: 1042,
        routePermissions: 0,
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
      },
      knownBlockingGaps: [],
      knownNonblockingGaps: [],
    });
    expect(summary.FinalDecision).toBe("MEDICATION_INTELLIGENCE_PHASE_5_NOT_CERTIFIED");
  });
});
