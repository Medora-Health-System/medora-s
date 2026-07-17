import {
  PHASE3_ARTIFACTS,
  PHASE3_CERTIFICATION_ID,
  buildCandidateMappingReport,
  buildEnterpriseSummary,
  buildSourceLicensing,
  classifyCanonicalRxNormAssignment,
  isPhase3CanonicalAssignmentGatePassing,
  probePhase3Schema,
  summarizeCanonicalRxNormAssignments,
  type CanonicalRxNormAssignmentInput,
  type Phase3LiveMetrics,
} from "./medication-phase3-certification";

function syntheticFixtureAssignment(
  overrides: Partial<CanonicalRxNormAssignmentInput> = {}
): CanonicalRxNormAssignmentInput {
  return {
    conceptId: "concept-synth-1",
    conceptCode: "SYNTH_MC_ACETAMINOPHEN",
    dataClassification: "FIXTURE",
    rxNormConceptId: "SYNTH000001",
    verifiedMapping: {
      rxcui: "SYNTH000001",
      isSynthetic: true,
      isActive: true,
      targetKind: "MEDICATION_CONCEPT",
      targetId: "concept-synth-1",
      releaseIsSynthetic: true,
      releaseSourceClassification: "SYNTHETIC_FIXTURE",
    },
    ...overrides,
  };
}

function baseMetrics(overrides: Partial<Phase3LiveMetrics> = {}): Phase3LiveMetrics {
  const autoVerifiedCandidates = overrides.autoVerifiedCandidates ?? 0;
  const assignmentSummary =
    overrides.assignmentSummary ??
    summarizeCanonicalRxNormAssignments({
      assignments: [],
      autoVerifiedCandidates,
    });

  return {
    releases: 1,
    activeReleases: 0,
    stagingRows: 28,
    candidates: 10,
    conflicts: 0,
    catalogMedication: 1042,
    ...overrides,
    autoVerifiedCandidates,
    conceptRxNormPopulated:
      overrides.conceptRxNormPopulated ?? assignmentSummary.CanonicalRxNormAssignmentsTotal,
    assignmentSummary,
  };
}

const passingEvidence = {
  focusedTestsPass: true,
  focusedTestSummary: "unit",
  fullRegressionPass: true,
  fullRegressionSummary: "verify",
  buildPass: true,
  typecheckPass: true,
  diffCheckPass: true,
} as const;

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

  it("1. certifies when no populated RxNorm fields exist", () => {
    const summary = buildEnterpriseSummary({
      dataSource: "seed_files_only",
      confidence: "HIGH",
      schema: probePhase3Schema(),
      metrics: baseMetrics(),
      evidence: { ...passingEvidence },
      knownBlockingGaps: [],
      knownNonblockingGaps: ["synthetic only"],
    });
    expect(summary.FinalDecision).toBe("MEDICATION_INTELLIGENCE_PHASE_3_CERTIFIED");
    expect(summary.CanonicalRxNormAssignmentsTotal).toBe(0);
    expect(summary.SyntheticFixtureAssignments).toBe(0);
    expect(summary.AutomaticAssignmentsDetected).toBe(0);
    expect(summary.Phase4GovernedSyntheticAssignmentsAccepted).toBe("NO");
    expect(summary.AutomaticVerificationEnabled).toBe("NO");
    expect(summary.ClinicalSearchUnchanged).toBe("YES");
  });

  it("2. certifies governed synthetic fixture assignment", () => {
    const assignmentSummary = summarizeCanonicalRxNormAssignments({
      assignments: [syntheticFixtureAssignment()],
      autoVerifiedCandidates: 0,
    });
    const summary = buildEnterpriseSummary({
      dataSource: "database",
      confidence: "HIGH",
      schema: probePhase3Schema(),
      metrics: baseMetrics({
        conceptRxNormPopulated: 1,
        assignmentSummary,
      }),
      evidence: { ...passingEvidence },
      knownBlockingGaps: [],
      knownNonblockingGaps: [],
    });
    expect(classifyCanonicalRxNormAssignment(syntheticFixtureAssignment())).toBe(
      "SYNTHETIC_FIXTURE_ASSIGNMENT"
    );
    expect(summary.FinalDecision).toBe("MEDICATION_INTELLIGENCE_PHASE_3_CERTIFIED");
    expect(summary.CanonicalRxNormAssignmentsTotal).toBe(1);
    expect(summary.SyntheticFixtureAssignments).toBe(1);
    expect(summary.RealProductionAssignments).toBe(0);
    expect(summary.UnexplainedAssignments).toBe(0);
    expect(summary.InvalidSyntheticToRealAssignments).toBe(0);
    expect(summary.InvalidRealToFixtureAssignments).toBe(0);
    expect(summary.AutomaticAssignmentsDetected).toBe(0);
    expect(summary.Phase4GovernedSyntheticAssignmentsAccepted).toBe("YES");
  });

  it("3. fails synthetic assignment to production target", () => {
    const assignment = syntheticFixtureAssignment({
      conceptCode: "ACETAMINOPHEN",
      dataClassification: "PRODUCTION",
    });
    expect(classifyCanonicalRxNormAssignment(assignment)).toBe(
      "INVALID_SYNTHETIC_TO_REAL_ASSIGNMENT"
    );
    const assignmentSummary = summarizeCanonicalRxNormAssignments({
      assignments: [assignment],
      autoVerifiedCandidates: 0,
    });
    const summary = buildEnterpriseSummary({
      dataSource: "database",
      confidence: "HIGH",
      schema: probePhase3Schema(),
      metrics: baseMetrics({ assignmentSummary }),
      evidence: { ...passingEvidence },
      knownBlockingGaps: [],
      knownNonblockingGaps: [],
    });
    expect(summary.FinalDecision).toBe("MEDICATION_INTELLIGENCE_PHASE_3_NOT_CERTIFIED");
    expect(summary.InvalidSyntheticToRealAssignments).toBe(1);
  });

  it("4. fails real assignment to fixture target", () => {
    const assignment = syntheticFixtureAssignment({
      rxNormConceptId: "861004",
      verifiedMapping: {
        rxcui: "861004",
        isSynthetic: false,
        isActive: true,
        targetKind: "MEDICATION_CONCEPT",
        targetId: "concept-synth-1",
        releaseIsSynthetic: false,
        releaseSourceClassification: "NLM_OFFICIAL",
      },
    });
    expect(classifyCanonicalRxNormAssignment(assignment)).toBe(
      "INVALID_REAL_TO_FIXTURE_ASSIGNMENT"
    );
    const assignmentSummary = summarizeCanonicalRxNormAssignments({
      assignments: [assignment],
      autoVerifiedCandidates: 0,
    });
    const summary = buildEnterpriseSummary({
      dataSource: "database",
      confidence: "HIGH",
      schema: probePhase3Schema(),
      metrics: baseMetrics({ assignmentSummary }),
      evidence: { ...passingEvidence },
      knownBlockingGaps: [],
      knownNonblockingGaps: [],
    });
    expect(summary.FinalDecision).toBe("MEDICATION_INTELLIGENCE_PHASE_3_NOT_CERTIFIED");
    expect(summary.InvalidRealToFixtureAssignments).toBe(1);
  });

  it("5. fails assignment without verified mapping history", () => {
    const assignment = syntheticFixtureAssignment({ verifiedMapping: null });
    expect(classifyCanonicalRxNormAssignment(assignment)).toBe("UNEXPLAINED_ASSIGNMENT");
    const assignmentSummary = summarizeCanonicalRxNormAssignments({
      assignments: [assignment],
      autoVerifiedCandidates: 0,
    });
    expect(isPhase3CanonicalAssignmentGatePassing(assignmentSummary)).toBe(false);
    const summary = buildEnterpriseSummary({
      dataSource: "database",
      confidence: "HIGH",
      schema: probePhase3Schema(),
      metrics: baseMetrics({ assignmentSummary }),
      evidence: { ...passingEvidence },
      knownBlockingGaps: [],
      knownNonblockingGaps: [],
    });
    expect(summary.FinalDecision).toBe("MEDICATION_INTELLIGENCE_PHASE_3_NOT_CERTIFIED");
    expect(summary.UnexplainedAssignments).toBe(1);
  });

  it("6. reports real production assignment distinctly and fails certification", () => {
    const assignment: CanonicalRxNormAssignmentInput = {
      conceptId: "concept-prod-1",
      conceptCode: "ACETAMINOPHEN",
      dataClassification: "PRODUCTION",
      rxNormConceptId: "861004",
      verifiedMapping: {
        rxcui: "861004",
        isSynthetic: false,
        isActive: true,
        targetKind: "MEDICATION_CONCEPT",
        targetId: "concept-prod-1",
        releaseIsSynthetic: false,
        releaseSourceClassification: "NLM_OFFICIAL",
      },
    };
    expect(classifyCanonicalRxNormAssignment(assignment)).toBe("REAL_PRODUCTION_ASSIGNMENT");
    const assignmentSummary = summarizeCanonicalRxNormAssignments({
      assignments: [assignment],
      autoVerifiedCandidates: 0,
    });
    const summary = buildEnterpriseSummary({
      dataSource: "database",
      confidence: "HIGH",
      schema: probePhase3Schema(),
      metrics: baseMetrics({ assignmentSummary }),
      evidence: { ...passingEvidence },
      knownBlockingGaps: [],
      knownNonblockingGaps: [],
    });
    expect(summary.FinalDecision).toBe("MEDICATION_INTELLIGENCE_PHASE_3_NOT_CERTIFIED");
    expect(summary.RealProductionAssignments).toBe(1);
    expect(summary.SyntheticFixtureAssignments).toBe(0);
    expect(summary.Phase4GovernedSyntheticAssignmentsAccepted).toBe("NO");
  });

  it("7. fails when automatic verification is detected", () => {
    const summary = buildEnterpriseSummary({
      dataSource: "database",
      confidence: "HIGH",
      schema: probePhase3Schema(),
      metrics: baseMetrics({
        autoVerifiedCandidates: 1,
        assignmentSummary: summarizeCanonicalRxNormAssignments({
          assignments: [],
          autoVerifiedCandidates: 1,
        }),
      }),
      evidence: { ...passingEvidence },
      knownBlockingGaps: [],
      knownNonblockingGaps: [],
    });
    expect(summary.FinalDecision).toBe("MEDICATION_INTELLIGENCE_PHASE_3_NOT_CERTIFIED");
    expect(summary.AutomaticAssignmentsDetected).toBe(1);
  });

  it("8. keeps existing Phase 3 staging protections intact", () => {
    const schema = probePhase3Schema();
    expect(schema.migrationPresent).toBe(true);
    expect(schema.hasReleaseModel).toBe(true);
    expect(schema.hasImportJobModel).toBe(true);
    expect(schema.hasStagingModel).toBe(true);
    expect(schema.hasCandidateModel).toBe(true);
    expect(schema.hasConflictModel).toBe(true);
    expect(schema.syntheticFixturePresent).toBe(true);

    const mapping = buildCandidateMappingReport(
      baseMetrics({
        candidates: 10,
        autoVerifiedCandidates: 0,
      })
    );
    expect(mapping.AutomaticVerificationEnabled).toBe("NO");
    expect(mapping.unitAutoVerified).toBe(false);

    const licensing = buildSourceLicensing();
    expect(licensing.RealRxNormDataUsed).toBe("NO");
  });
});
