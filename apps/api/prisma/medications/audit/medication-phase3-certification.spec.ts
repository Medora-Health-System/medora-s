import {
  PHASE3_ARTIFACTS,
  PHASE3_CERTIFICATION_ID,
  buildCandidateMappingReport,
  buildEnterpriseSummary,
  buildSourceLicensing,
  probePhase3Schema,
} from "./medication-phase3-certification";

describe("medication phase 3 certification", () => {
  it("uses the expected certification identifier", () => {
    expect(PHASE3_CERTIFICATION_ID).toBe(
      "MEDUI.MEDICATION_INTELLIGENCE_PHASE_3_SCOPED_RXNORM_REFERENCE_INGESTION_STAGING_PROVENANCE_MAPPING"
    );
  });

  it("lists twenty-two certification artifacts", () => {
    expect(PHASE3_ARTIFACTS).toHaveLength(22);
  });

  it("probes schema and synthetic fixture", () => {
    const schema = probePhase3Schema();
    expect(schema.migrationPresent).toBe(true);
    expect(schema.hasReleaseModel).toBe(true);
    expect(schema.hasStagingModel).toBe(true);
    expect(schema.syntheticFixturePresent).toBe(true);
  });

  it("reports synthetic-only licensing", () => {
    const licensing = buildSourceLicensing();
    expect(licensing.RealRxNormDataUsed).toBe("NO");
    expect(licensing.SyntheticFixtureUsed).toBe("YES");
  });

  it("keeps automatic verification disabled", () => {
    const mapping = buildCandidateMappingReport(null);
    expect(mapping.AutomaticVerificationEnabled).toBe("NO");
    expect(mapping.unitAutoVerified).toBe(false);
  });

  it("certifies when schema and focused tests pass", () => {
    const summary = buildEnterpriseSummary({
      dataSource: "seed_files_only",
      confidence: "HIGH",
      schema: probePhase3Schema(),
      metrics: {
        releases: 1,
        activeReleases: 0,
        stagingRows: 28,
        candidates: 10,
        autoVerifiedCandidates: 0,
        conflicts: 0,
        conceptRxNormPopulated: 0,
        catalogMedication: 1042,
      },
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
      knownNonblockingGaps: ["synthetic only"],
    });
    expect(summary.FinalDecision).toBe("MEDICATION_INTELLIGENCE_PHASE_3_CERTIFIED");
    expect(summary.AutomaticVerificationEnabled).toBe("NO");
    expect(summary.RealRxNormDataUsed).toBe("NO");
    expect(summary.ClinicalSearchUnchanged).toBe("YES");
  });

  it("does not certify when auto-verified candidates exist", () => {
    const summary = buildEnterpriseSummary({
      dataSource: "database",
      confidence: "HIGH",
      schema: probePhase3Schema(),
      metrics: {
        releases: 1,
        activeReleases: 0,
        stagingRows: 1,
        candidates: 1,
        autoVerifiedCandidates: 1,
        conflicts: 0,
        conceptRxNormPopulated: 0,
        catalogMedication: 1,
      },
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
      knownNonblockingGaps: [],
    });
    expect(summary.FinalDecision).toBe("MEDICATION_INTELLIGENCE_PHASE_3_NOT_CERTIFIED");
  });
});
