import { describe, expect, it } from "vitest";
import {
  ED_DISCHARGE_MODE_ADMISSION,
  ED_DISCHARGE_MODE_HOME,
} from "../edEncounterLifecycle.js";
import { buildChartCertificationB1, stageB1AdvisoryFindingsIndependentlyBlock } from "./buildChartCertificationB1.js";
import { runChartCertificationB1Benchmark } from "./benchmark.js";
import { enterpriseChartCertificationStageB1Enabled } from "./featureFlag.js";
import { ChartCertificationSourceAuthority, type ChartCertificationB1Context } from "./types.js";

function ctx(
  overrides: {
    encounterId?: string;
    facilityId?: string;
    encounterVersion?: number;
    evaluatedAt?: string;
    encounter?: Partial<ChartCertificationB1Context["encounter"]>;
    provider?: Partial<ChartCertificationB1Context["provider"]>;
    patient?: Partial<ChartCertificationB1Context["patient"]>;
    nursing?: Partial<ChartCertificationB1Context["nursing"]>;
    triage?: ChartCertificationB1Context["triage"];
    established?: Partial<ChartCertificationB1Context["established"]>;
  } = {}
): ChartCertificationB1Context {
  return {
    encounterId: overrides.encounterId ?? "e1",
    facilityId: overrides.facilityId ?? "f1",
    encounterVersion: overrides.encounterVersion ?? 3,
    evaluatedAt: overrides.evaluatedAt ?? "2026-07-20T12:00:00.000Z",
    encounter: {
      status: "OPEN",
      workflowState: "IN_TREATMENT",
      type: "EMERGENCY",
      createdAt: "2026-07-20T10:00:00.000Z",
      dischargedAt: null,
      dischargeStatus: null,
      disposition: null,
      chiefComplaint: "Pain",
      providerDocumentationStatus: "SIGNED",
      providerDocumentationSignedAt: "2026-07-20T11:00:00.000Z",
      providerDocumentationSignedByUserId: "p1",
      providerNotePresent: true,
      treatmentPlanPresent: true,
      physicianAssignedUserId: "p1",
      nurseAssignedUserId: "n1",
      roomLabel: "2",
      billingFinalizationStatus: "READY_FOR_REVIEW",
      billingReadinessSnapshot: { isReady: true },
      dischargeSummaryJson: {
        dischargeMode: ED_DISCHARGE_MODE_HOME,
        instructions: "Return",
        followUp: "PCP",
        patientInstructionsGiven: true,
      },
      admissionSummaryJson: null,
      nursingAssessment: {
        nursingEvalV1: { sections: { assessment: { text: "OK" } } },
        erDispositionExecutionV1: {
          dischargeSortieCompletedAt: "2026-07-20T11:30:00.000Z",
          dischargeSortieCompletedByDisplayName: "RN",
        },
      },
      ...overrides.encounter,
    },
    patient: {
      dob: "1990-01-01",
      sexAtBirth: "F",
      mrn: "1",
      phone: "1",
      firstNamePresent: true,
      lastNamePresent: true,
      ageYears: 36,
      ...overrides.patient,
    },
    triage:
      overrides.triage === undefined
        ? {
            present: true,
            triageCompleteAt: "2026-07-20T10:05:00.000Z",
            esi: 3,
            chiefComplaint: "Pain",
            vitalsPresent: true,
            activeVitalsReadingCount: 1,
            strokeScreenPresent: true,
            sepsisScreenPresent: true,
            updatedAt: null,
          }
        : overrides.triage,
    nursing: {
      assessmentPresent: true,
      reassessmentPresent: false,
      clinicalDocActiveCount: 0,
      noteActiveCount: 0,
      ...overrides.nursing,
    },
    provider: {
      signed: true,
      contentPresent: true,
      hasMdm: true,
      hasPhysicalExamSignal: true,
      hasHistorySignal: true,
      diagnosisCount: 1,
      supervisingAttestationRequired: false,
      supervisingAttestationPresent: false,
      ...overrides.provider,
    },
    established: {
      dispositionCanClose: true,
      dispositionBlockers: [],
      dispositionLoadError: false,
      physicalDepartureComplete: true,
      closeCheckLoadError: false,
      ...overrides.established,
    },
  };
}

describe("Stage B1 chart certification foundation", () => {
  it("feature flag defaults OFF", () => {
    expect(enterpriseChartCertificationStageB1Enabled(null)).toBe(false);
    expect(
      enterpriseChartCertificationStageB1Enabled({
        ENTERPRISE_CHART_CERTIFICATION_STAGE_B1: "true",
      })
    ).toBe(true);
  });

  it("exposes B1 advisory contract and unevaluated modules", () => {
    const result = buildChartCertificationB1(ctx());
    expect(result.certificationStage).toBe("B1");
    expect(result.certificationAuthority).toBe("ADVISORY");
    expect(result.coverageStatus).toBe("PARTIAL");
    expect(result.unevaluatedModules).toContain("ORDERS");
    expect(result.unevaluatedModules).toContain("MAR");
    expect(result.encounterVersion).toBe(3);
  });

  it("one unsigned provider note → one root-cause deficiency", () => {
    const result = buildChartCertificationB1(
      ctx({
        encounter: { providerDocumentationStatus: "DRAFT", providerDocumentationSignedAt: null },
        provider: { signed: false, contentPresent: true },
      })
    );
    const unsigned = result.deficiencies.filter((d) => d.deduplicationKey === "PROVIDER_NOTE_UNSIGNED");
    expect(unsigned).toHaveLength(1);
  });

  it("keeps supervising attestation distinct from provider signature", () => {
    const result = buildChartCertificationB1(
      ctx({
        encounter: { providerDocumentationStatus: "DRAFT", providerDocumentationSignedAt: null },
        provider: {
          signed: false,
          contentPresent: true,
          supervisingAttestationRequired: true,
          supervisingAttestationPresent: false,
        },
      })
    );
    expect(result.deficiencies.some((d) => d.deduplicationKey === "PROVIDER_NOTE_UNSIGNED")).toBe(true);
    expect(result.deficiencies.some((d) => d.deduplicationKey === "SUPERVISING_ATTESTATION_MISSING")).toBe(
      true
    );
  });

  it("admission excludes home-discharge instruction deficiency", () => {
    const result = buildChartCertificationB1(
      ctx({
        encounter: {
          dischargeSummaryJson: { dischargeMode: ED_DISCHARGE_MODE_ADMISSION },
          admissionSummaryJson: { admittingService: "Med" },
          nursingAssessment: {
            nursingEvalV1: { sections: { assessment: { text: "OK" } } },
            erHandoffV1: { reportGiven: true },
          },
        },
      })
    );
    expect(result.deficiencies.some((d) => d.deduplicationKey === "DISCHARGE_INSTRUCTIONS_MISSING")).toBe(
      false
    );
    expect(
      result.informationalItems.some((i) => i.stableCode === "ADMISSION_EXCLUDES_HOME_DISCHARGE_RULES")
    ).toBe(true);
  });

  it("Stage B1 advisory findings never independently block", () => {
    const result = buildChartCertificationB1(
      ctx({
        patient: { dob: null },
        provider: { signed: false, contentPresent: true },
        encounter: { providerDocumentationStatus: "DRAFT" },
      })
    );
    expect(stageB1AdvisoryFindingsIndependentlyBlock(result)).toBe(false);
    expect(
      result.deficiencies
        .filter((d) => d.sourceAuthority !== ChartCertificationSourceAuthority.ESTABLISHED_WORKFLOW)
        .every((d) => !d.effects.blocksClinicalClosure && !d.effects.blocksDisposition)
    ).toBe(true);
  });

  it("evaluator error cannot produce READY evaluated modules", () => {
    const result = buildChartCertificationB1(ctx(), {
      forceEvaluationError: { code: "X", messageKey: "edLifecycle.certification.b1.errors.forced" },
    });
    expect(result.coverageStatus).toBe("ERROR");
    expect(result.evaluatedReadiness.providerReady).toBeNull();
    expect(result.evaluatedReadiness.nursingReady).toBeNull();
  });

  it("missing physical exam produces one specific deficiency", () => {
    const result = buildChartCertificationB1(ctx({ provider: { hasPhysicalExamSignal: false } }));
    expect(
      result.deficiencies.filter((d) => d.stableCode === "PROVIDER_PHYSICAL_EXAM_MISSING")
    ).toHaveLength(1);
  });

  it("runs Stage B1 synthetic engineering benchmark with zero critical false negatives", () => {
    const metrics = runChartCertificationB1Benchmark();
    expect(metrics.cases).toBeGreaterThanOrEqual(20);
    expect(metrics.falseNegatives).toBe(0);
    expect(metrics.duplicateRate).toBe(0);
    expect(metrics.evaluatorErrorFalseReady).toBe(0);
    expect(metrics.crossFacilityLeakage).toBe(0);
    expect(metrics.precision).toBeGreaterThan(0.5);
    expect(metrics.recall).toBe(1);
  });
});
