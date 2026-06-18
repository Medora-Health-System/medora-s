import { describe, expect, it } from "vitest";

import { ED_DISCHARGE_MODE_HOME } from "./edEncounterLifecycle.js";
import {
  buildEdClosedEncounterCertification,
  EdClosedEncounterCertificationResponsibleRole,
  EdClosedEncounterCertificationStatus,
  isEdAllEncountersEligible,
} from "./edClosedEncounterCertification.js";

function departedOpenSnapshot(overrides: Record<string, unknown> = {}) {
  return {
    status: "OPEN",
    providerDocumentationStatus: "DRAFT",
    chiefComplaint: "Abdominal pain",
    providerNote: "Stable",
    encounterType: "EMERGENCY",
    dischargeSummaryJson: { dischargeMode: ED_DISCHARGE_MODE_HOME },
    nursingAssessment: {
      nursingEvalV1: { sections: { assessment: { text: "Nursing documented" } } },
      erDispositionExecutionV1: {
        dischargeSortieCompletedAt: "2026-06-03T12:00:00.000Z",
        dischargeSortieCompletedByDisplayName: "RN One",
      },
    },
    ...overrides,
  };
}

describe("edClosedEncounterCertification (MEDUI.ED.LIFECYCLE.6)", () => {
  it("unsigned provider note blocks closure", () => {
    const result = buildEdClosedEncounterCertification({
      lifecycleSnapshot: departedOpenSnapshot({ providerDocumentationStatus: "DRAFT" }),
    });
    expect(result.closureReady).toBe(false);
    expect(result.closureBlockers.some((d) => d.id === "provider:unsigned")).toBe(true);
  });

  it("missing diagnosis blocks billing/coding readiness when diagnosisCount is zero", () => {
    const result = buildEdClosedEncounterCertification({
      lifecycleSnapshot: departedOpenSnapshot({
        providerDocumentationStatus: "SIGNED",
        dispositionSafetyReadiness: { canClose: true },
      }),
      diagnosisCount: 0,
    });
    expect(result.billingReady).toBe(false);
    expect(result.billingBlockers.some((d) => d.id === "billing:diagnosis-missing")).toBe(true);
  });

  it("missing physical departure blocks closure", () => {
    const result = buildEdClosedEncounterCertification({
      lifecycleSnapshot: {
        status: "OPEN",
        dischargeSummaryJson: { dischargeMode: ED_DISCHARGE_MODE_HOME },
        nursingAssessment: {},
        providerDocumentationStatus: "SIGNED",
      },
    });
    expect(result.closureBlockers.some((d) => d.id === "disposition:departure-incomplete")).toBe(true);
  });

  it("nursing discharge documentation deficiency blocks closure", () => {
    const result = buildEdClosedEncounterCertification({
      lifecycleSnapshot: departedOpenSnapshot({
        nursingAssessment: {
          erDispositionExecutionV1: {
            dischargeSortieCompletedAt: "2026-06-03T12:00:00.000Z",
            dischargeSortieCompletedByDisplayName: "RN One",
          },
        },
        dischargeSummaryJson: null,
      }),
    });
    expect(result.closureBlockers.some((d) => d.id === "doc:DISCHARGE_SUMMARY")).toBe(true);
  });

  it("active medication orders block closure via disposition readiness", () => {
    const result = buildEdClosedEncounterCertification({
      lifecycleSnapshot: departedOpenSnapshot({ providerDocumentationStatus: "SIGNED" }),
      dispositionReadiness: {
        canClose: false,
        blockers: [
          {
            code: "ACTIVE_ORDERS_UNRESOLVED",
            severity: "error",
            message: "Active orders remain",
          },
        ],
        warnings: [],
        activeOrderCounts: { lab: 0, imaging: 0, medication: 2, care: 0 },
      },
    });
    expect(result.closureBlockers.some((d) => d.id === "disposition:ACTIVE_ORDERS_UNRESOLVED")).toBe(true);
  });

  it("unresolved MAR actions block closure when disposition readiness reports medication administration incomplete", () => {
    const result = buildEdClosedEncounterCertification({
      lifecycleSnapshot: departedOpenSnapshot({ providerDocumentationStatus: "SIGNED" }),
      dispositionReadiness: {
        canClose: false,
        blockers: [
          {
            code: "MEDICATION_ADMINISTRATION_INCOMPLETE",
            severity: "error",
            message: "MAR incomplete",
          },
        ],
        warnings: [],
        activeOrderCounts: { lab: 0, imaging: 0, medication: 1, care: 0 },
      },
    });
    expect(
      result.closureBlockers.some((d) => d.id === "disposition:MEDICATION_ADMINISTRATION_INCOMPLETE")
    ).toBe(true);
  });

  it("billing code missing blocks billing readiness from snapshot", () => {
    const result = buildEdClosedEncounterCertification({
      lifecycleSnapshot: departedOpenSnapshot({
        providerDocumentationStatus: "SIGNED",
        billingFinalizationStatus: "NOT_READY",
      }),
      billingReadinessSnapshot: { isReady: false, requiresManualReview: true },
    });
    expect(result.billingReady).toBe(false);
    expect(result.billingBlockers.length).toBeGreaterThan(0);
  });

  it("insurance/payer missing creates billing deficiency when snapshot reason exists", () => {
    const result = buildEdClosedEncounterCertification({
      lifecycleSnapshot: departedOpenSnapshot({ providerDocumentationStatus: "SIGNED" }),
      billingReadinessSnapshot: {
        isReady: false,
        reasons: ["MISSING_PAYER"],
      },
    });
    expect(result.billingBlockers.some((d) => d.id === "billing:MISSING_PAYER")).toBe(true);
  });

  it("closureReady true when no closure blockers", () => {
    const result = buildEdClosedEncounterCertification({
      lifecycleSnapshot: departedOpenSnapshot({
        providerDocumentationStatus: "SIGNED",
        dispositionSafetyReadiness: { canClose: true },
      }),
      dispositionReadiness: { canClose: true, blockers: [], warnings: [], activeOrderCounts: { lab: 0, imaging: 0, medication: 0, care: 0 } },
    });
    expect(result.closureReady).toBe(true);
  });

  it("billingReady true when no billing blockers", () => {
    const result = buildEdClosedEncounterCertification({
      lifecycleSnapshot: departedOpenSnapshot({
        providerDocumentationStatus: "SIGNED",
        billingFinalizationStatus: "READY_FOR_REVIEW",
      }),
      billingReadinessSnapshot: { isReady: true, requiresManualReview: false },
      diagnosisCount: 2,
    });
    expect(result.billingReady).toBe(true);
  });

  it("READY_FOR_CLOSURE status resolves correctly", () => {
    const result = buildEdClosedEncounterCertification({
      lifecycleSnapshot: departedOpenSnapshot({
        providerDocumentationStatus: "SIGNED",
        dispositionSafetyReadiness: { canClose: true },
      }),
      dispositionReadiness: { canClose: true, blockers: [], warnings: [], activeOrderCounts: { lab: 0, imaging: 0, medication: 0, care: 0 } },
      diagnosisCount: 0,
    });
    expect(result.status).toBe(EdClosedEncounterCertificationStatus.READY_FOR_CLOSURE);
  });

  it("READY_FOR_BILLING status resolves for closed encounter without billing blockers", () => {
    const result = buildEdClosedEncounterCertification({
      lifecycleSnapshot: {
        ...departedOpenSnapshot({ providerDocumentationStatus: "SIGNED" }),
        status: "CLOSED",
      },
      billingReadinessSnapshot: { isReady: true },
      diagnosisCount: 1,
    });
    expect(result.status).toBe(EdClosedEncounterCertificationStatus.CERTIFIED_CLOSED);
  });

  it("CERTIFIED_CLOSED status resolves correctly", () => {
    const result = buildEdClosedEncounterCertification({
      lifecycleSnapshot: {
        ...departedOpenSnapshot({ providerDocumentationStatus: "SIGNED" }),
        status: "CLOSED",
      },
      diagnosisCount: 1,
      billingReadinessSnapshot: { isReady: true },
    });
    expect(result.status).toBe(EdClosedEncounterCertificationStatus.CERTIFIED_CLOSED);
    expect(result.certifiedClosed).toBe(true);
  });

  it("deficiencies grouped by responsible role", () => {
    const result = buildEdClosedEncounterCertification({
      lifecycleSnapshot: departedOpenSnapshot({ providerDocumentationStatus: "DRAFT" }),
      trackboardOps: { openOrderCount: 1 },
      diagnosisCount: 0,
    });
    expect(result.providerDeficiencies.length).toBeGreaterThan(0);
    expect(result.providerDeficiencies[0]?.responsibleRole).toBe(
      EdClosedEncounterCertificationResponsibleRole.PROVIDER
    );
    expect(result.billingDeficiencies.length + result.codingDeficiencies.length).toBeGreaterThan(0);
  });

  it("allEncountersEligible false until certified closed", () => {
    const open = buildEdClosedEncounterCertification({
      lifecycleSnapshot: departedOpenSnapshot(),
    });
    expect(open.allEncountersEligible).toBe(false);
    expect(isEdAllEncountersEligible(open)).toBe(false);
  });

  it("allEncountersEligible true after closed signed certified", () => {
    const closed = buildEdClosedEncounterCertification({
      lifecycleSnapshot: {
        ...departedOpenSnapshot({ providerDocumentationStatus: "SIGNED" }),
        status: "CLOSED",
      },
      diagnosisCount: 1,
      billingReadinessSnapshot: { isReady: true },
    });
    expect(closed.allEncountersEligible).toBe(true);
  });
});
