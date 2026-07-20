import { describe, expect, it } from "vitest";
import { ChartCertificationSourceAuthority } from "../chartCertificationB1/types.js";
import { buildChartCertificationB2, stageB2AdvisoryFindingsIndependentlyBlock } from "./buildChartCertificationB2.js";
import { runChartCertificationB2Benchmark } from "./benchmark.js";
import { enterpriseChartCertificationStageB2Enabled } from "./featureFlag.js";
import { classifyDiagnosticCategory, normalizeDiagnosticOrderItem } from "./lifecycle.js";
import type { ChartCertificationB2Context, DiagnosticOrderItemSnapshot } from "./types.js";

function item(partial: Partial<DiagnosticOrderItemSnapshot>): DiagnosticOrderItemSnapshot {
  return {
    orderId: "o1",
    orderItemId: "i1",
    orderType: "LAB",
    catalogItemType: "LAB_TEST",
    enterpriseProcedureId: null,
    orderStatus: "PLACED",
    itemStatus: "PLACED",
    lifecycleState: "ORDERED",
    priority: "ROUTINE",
    placedAt: "2026-07-20T11:00:00.000Z",
    updatedAt: "2026-07-20T11:00:00.000Z",
    cancelledAt: null,
    cancellationReason: null,
    orderedBy: "p1",
    replacesOrderItemId: null,
    supersededByOrderItemId: null,
    documentedCollectedAt: null,
    effectiveCollectedAt: null,
    documentedPerformedAt: null,
    effectivePerformedAt: null,
    documentedCompletedAt: null,
    completedAt: null,
    medicationLifecycleStatus: null,
    result: null,
    ...partial,
  };
}

function baseCtx(items: DiagnosticOrderItemSnapshot[]): ChartCertificationB2Context {
  return {
    encounterId: "e1",
    facilityId: "f1",
    encounterVersion: 2,
    evaluatedAt: "2026-07-20T15:00:00.000Z",
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
      providerDocumentationSignedAt: "2026-07-20T14:00:00.000Z",
      providerDocumentationSignedByUserId: "p1",
      providerNotePresent: true,
      treatmentPlanPresent: true,
      physicianAssignedUserId: "p1",
      nurseAssignedUserId: "n1",
      roomLabel: "1",
      billingFinalizationStatus: "READY_FOR_REVIEW",
      billingReadinessSnapshot: { isReady: true },
      dischargeSummaryJson: {
        dischargeMode: "Domicile",
        instructions: "x",
        followUp: "y",
        patientInstructionsGiven: true,
      },
      admissionSummaryJson: null,
      nursingAssessment: {
        nursingEvalV1: { sections: { assessment: { text: "OK" } } },
        erDispositionExecutionV1: {
          dischargeSortieCompletedAt: "2026-07-20T14:30:00.000Z",
          dischargeSortieCompletedByDisplayName: "RN",
        },
      },
    },
    patient: {
      dob: "1990-01-01",
      sexAtBirth: "F",
      mrn: "1",
      phone: "1",
      firstNamePresent: true,
      lastNamePresent: true,
      ageYears: 36,
    },
    triage: {
      present: true,
      triageCompleteAt: "2026-07-20T10:05:00.000Z",
      esi: 3,
      chiefComplaint: "Pain",
      vitalsPresent: true,
      activeVitalsReadingCount: 1,
      strokeScreenPresent: true,
      sepsisScreenPresent: true,
      updatedAt: null,
    },
    nursing: {
      assessmentPresent: true,
      reassessmentPresent: false,
      clinicalDocActiveCount: 0,
      noteActiveCount: 0,
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
    },
    established: {
      dispositionCanClose: true,
      dispositionBlockers: [],
      dispositionLoadError: false,
      physicalDepartureComplete: true,
      closeCheckLoadError: false,
    },
    diagnostics: {
      orderItems: items,
      ecgDocumentation: [],
      diagnosticRevision: "2026-07-20T12:00:00.000Z",
      sendOutFollowUpModelPresent: false,
      loadError: null,
    },
  };
}

describe("Stage B2 chart certification", () => {
  it("feature flag defaults OFF", () => {
    expect(enterpriseChartCertificationStageB2Enabled(null)).toBe(false);
    expect(
      enterpriseChartCertificationStageB2Enabled({
        ENTERPRISE_CHART_CERTIFICATION_STAGE_B2: "true",
      })
    ).toBe(true);
  });

  it("classifies and excludes medication orders", () => {
    expect(
      classifyDiagnosticCategory(
        item({ orderType: "MEDICATION", catalogItemType: "MEDICATION" })
      )
    ).toBe("MEDICATION");
    const n = normalizeDiagnosticOrderItem(
      item({ orderType: "MEDICATION", catalogItemType: "MEDICATION" })
    );
    expect(n.normalizedLifecycle).toBe("EXCLUDED_MEDICATION");
    const result = buildChartCertificationB2(
      baseCtx([item({ orderType: "MEDICATION", catalogItemType: "MEDICATION" })])
    );
    expect(result.deficiencies).toHaveLength(0);
    expect(result.unevaluatedModules).toContain("MEDICATION_ORDERS");
    expect(result.unevaluatedModules).toContain("MAR");
  });

  it("cancelled lab produces no missing-result deficiency", () => {
    const result = buildChartCertificationB2(
      baseCtx([
        item({
          orderStatus: "CANCELLED",
          itemStatus: "CANCELLED",
          lifecycleState: "CANCELLED",
          cancelledAt: "2026-07-20T11:00:00.000Z",
        }),
      ])
    );
    expect(result.deficiencies.some((d) => d.stableCode.includes("MISSING"))).toBe(false);
  });

  it("machine ECG interpretation does not satisfy provider interpretation", () => {
    const result = buildChartCertificationB2({
      ...baseCtx([
        item({
          orderType: "CARE",
          catalogItemType: "CARE",
          enterpriseProcedureId: "ekg_ecg",
          effectivePerformedAt: "2026-07-20T11:00:00.000Z",
        }),
      ]),
      diagnostics: {
        orderItems: [
          item({
            orderType: "CARE",
            catalogItemType: "CARE",
            enterpriseProcedureId: "ekg_ecg",
            effectivePerformedAt: "2026-07-20T11:00:00.000Z",
          }),
        ],
        ecgDocumentation: [
          {
            entryId: "d1",
            cardId: "ecg_12_lead_documentation",
            performed: true,
            providerReviewed: false,
            criticalFindingPresent: false,
            providerNotified: false,
            interpretationPresent: false,
            interpretationSigned: false,
            machineInterpretationOnly: true,
            updatedAt: "2026-07-20T11:01:00.000Z",
          },
        ],
        diagnosticRevision: "r1",
        sendOutFollowUpModelPresent: false,
        loadError: null,
      },
    });
    expect(result.deficiencies.map((d) => d.stableCode)).toContain("ECG_INTERPRETATION_MISSING");
  });

  it("critical ack is not satisfied by review alone", () => {
    const result = buildChartCertificationB2(
      baseCtx([
        item({
          effectiveCollectedAt: "2026-07-20T11:00:00.000Z",
          itemStatus: "VERIFIED",
          lifecycleState: "REVIEWED",
          result: {
            id: "r1",
            criticalValue: true,
            verifiedAt: "2026-07-20T12:00:00.000Z",
            verifiedByUserId: "p1",
            acknowledgedByProviderAt: null,
            acknowledgedByUserId: null,
            updatedAt: "2026-07-20T12:00:00.000Z",
            hasResultPayload: true,
          },
        }),
      ])
    );
    expect(result.deficiencies.map((d) => d.stableCode)).toEqual([
      "LAB_CRITICAL_RESULT_UNACKNOWLEDGED",
    ]);
  });

  it("B2 advisory findings never independently block", () => {
    const result = buildChartCertificationB2(
      baseCtx([item({ effectiveCollectedAt: null })])
    );
    expect(stageB2AdvisoryFindingsIndependentlyBlock(result)).toBe(false);
    expect(
      result.deficiencies
        .filter((d) => d.sourceAuthority !== ChartCertificationSourceAuthority.ESTABLISHED_WORKFLOW)
        .every((d) => !d.effects.blocksClinicalClosure)
    ).toBe(true);
  });

  it("evaluator error cannot produce READY", () => {
    const result = buildChartCertificationB2(baseCtx([]), {
      forceB2EvaluationError: {
        code: "X",
        messageKey: "edLifecycle.certification.b2.errors.forced",
      },
    });
    expect(result.coverageStatus).toBe("ERROR");
    expect(result.evaluatedReadiness.laboratoryReady).toBeNull();
    expect(result.evaluatedReadiness.ordersReady).toBeNull();
  });

  it("returns B2 stage and keeps B3 modules unevaluated", () => {
    const result = buildChartCertificationB2(baseCtx([]));
    expect(result.certificationStage).toBe("B2");
    expect(result.evaluatedModules).toContain("LAB_RESULTS");
    expect(result.unevaluatedModules).toContain("PROCEDURES");
    expect(result.unevaluatedModules).toContain("CLINICAL_PATHWAYS");
  });

  it("runs Stage B2 synthetic engineering benchmark", () => {
    const metrics = runChartCertificationB2Benchmark();
    expect(metrics.cases).toBeGreaterThanOrEqual(40);
    expect(metrics.falseNegatives).toBe(0);
    expect(metrics.duplicateRate).toBe(0);
    expect(metrics.evaluatorErrorFalseReady).toBe(0);
    expect(metrics.precision).toBeGreaterThan(0.85);
    expect(metrics.recall).toBe(1);
  });
});
