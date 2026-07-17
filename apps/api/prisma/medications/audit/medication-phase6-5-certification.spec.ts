import {
  PHASE65_ARTIFACTS,
  PHASE65_CERTIFICATION_ID,
  buildEnterpriseSummary,
  probePhase65Schema,
} from "./medication-phase6-5-certification";

describe("medication phase 6.5 certification", () => {
  it("uses the expected certification identifier", () => {
    expect(PHASE65_CERTIFICATION_ID).toBe(
      "MEDUI.MEDICATION_INTELLIGENCE_PHASE_6_5_CONTROLLED_EMERGENCY_MEDICATION_PILOT_DUPLICATE_PREVENTION"
    );
  });

  it("lists eight certification artifacts", () => {
    expect(PHASE65_ARTIFACTS).toHaveLength(8);
  });

  it("probes schema, migration, pilot service, and CLI", () => {
    const schema = probePhase65Schema();
    expect(schema.migrationPresent).toBe(true);
    expect(schema.hasPilotManifestModel).toBe(true);
    expect(schema.hasDuplicateAssessmentModel).toBe(true);
    expect(schema.hasActiveIdentityPartialUniques).toBe(true);
    expect(schema.pilotServicePresent).toBe(true);
    expect(schema.pilotCliPresent).toBe(true);
    expect(schema.sharedDedupePresent).toBe(true);
  });

  it("certifies when duplicate prevention guards pass", () => {
    const summary = buildEnterpriseSummary({
      dataSource: "database",
      confidence: "HIGH",
      schema: probePhase65Schema(),
      metrics: {
        pilotManifestCount: 0,
        pilotItemCount: 0,
        duplicateAssessmentCount: 0,
        openDuplicateAssessments: 0,
        activeRealVerifiedMappings: 0,
        autoVerifiedCandidates: 0,
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
        certificationIdempotent: true,
        priorPhasesPass: true,
      },
      knownBlockingGaps: [],
      knownNonblockingGaps: [],
    });
    expect(summary.FinalDecision).toBe("MEDICATION_INTELLIGENCE_PHASE_6_5_CERTIFIED");
    expect(summary.DuplicatePreventionEnabled).toBe("YES");
    expect(summary.ExactDuplicateAutoCreationAllowed).toBe("NO");
    expect(summary.ProbableDuplicateAutoMergeAllowed).toBe("NO");
    expect(summary.ExistingEntityReuseEnabled).toBe("YES");
    expect(summary.HumanVerificationRequired).toBe("YES");
    expect(summary.AutomaticVerificationEnabled).toBe("NO");
    expect(summary.ClinicalActivationEnabled).toBe("NO");
    expect(summary.BulkRealMappingApprovalEnabled).toBe("NO");
    expect(summary.PilotImportExecutedDuringCertification).toBe("NO");
    expect(summary.RealVerifiedMappingsCreatedByCertification).toBe(0);
  });

  it("fails when auto-verified candidates exist", () => {
    const summary = buildEnterpriseSummary({
      dataSource: "database",
      confidence: "HIGH",
      schema: probePhase65Schema(),
      metrics: {
        pilotManifestCount: 0,
        pilotItemCount: 0,
        duplicateAssessmentCount: 0,
        openDuplicateAssessments: 0,
        activeRealVerifiedMappings: 0,
        autoVerifiedCandidates: 1,
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
        certificationIdempotent: true,
        priorPhasesPass: true,
      },
      knownBlockingGaps: [],
      knownNonblockingGaps: [],
    });
    expect(summary.FinalDecision).toBe("MEDICATION_INTELLIGENCE_PHASE_6_5_NOT_CERTIFIED");
  });
});
