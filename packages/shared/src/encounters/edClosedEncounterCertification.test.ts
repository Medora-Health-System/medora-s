import { describe, expect, it } from "vitest";

import { ED_DISCHARGE_MODE_ADMISSION, ED_DISCHARGE_MODE_HOME } from "./edEncounterLifecycle.js";
import {
  buildEdClosedEncounterCertification,
  EdChartCertificationAuthority,
  EdChartCertificationSourceAuthority,
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
    dischargeSummaryJson: {
      dischargeMode: ED_DISCHARGE_MODE_HOME,
      instructions: "Return if worse",
      followUp: "PCP in 2 days",
      patientInstructionsGiven: true,
    },
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

describe("edClosedEncounterCertification (MEDUI.ED.LIFECYCLE.6 Stage A advisory)", () => {
  it("unsigned provider note is Stage A advisory (not authoritative closure block)", () => {
    const result = buildEdClosedEncounterCertification({
      lifecycleSnapshot: departedOpenSnapshot({ providerDocumentationStatus: "DRAFT" }),
    });
    expect(result.certificationAuthority).toBe(EdChartCertificationAuthority.ADVISORY);
    expect(result.advisoryFindings.some((d) => d.id === "provider:unsigned")).toBe(true);
    expect(result.authoritativeReadiness.clinicalClosureReady).toBe(true);
    expect(result.closureReady).toBe(true);
  });

  it("missing diagnosis is Stage A advisory billing suggestion", () => {
    const result = buildEdClosedEncounterCertification({
      lifecycleSnapshot: departedOpenSnapshot({
        providerDocumentationStatus: "SIGNED",
        dispositionSafetyReadiness: { canClose: true },
        billingFinalizationStatus: "READY_FOR_REVIEW",
      }),
      billingReadinessSnapshot: { isReady: true },
      diagnosisCount: 0,
    });
    expect(result.advisoryFindings.some((d) => d.id === "billing:diagnosis-missing")).toBe(true);
    expect(result.authoritativeReadiness.billingReady).toBe(true);
    expect(result.billingReady).toBe(true);
  });

  it("missing physical departure is established closure blocker", () => {
    const result = buildEdClosedEncounterCertification({
      lifecycleSnapshot: {
        status: "OPEN",
        dischargeSummaryJson: { dischargeMode: ED_DISCHARGE_MODE_HOME },
        nursingAssessment: {},
        providerDocumentationStatus: "SIGNED",
      },
    });
    expect(result.closureBlockers.some((d) => d.id === "disposition:departure-incomplete")).toBe(true);
    expect(result.authoritativeReadiness.clinicalClosureReady).toBe(false);
  });

  it("nursing discharge documentation deficiency is Stage A advisory", () => {
    const result = buildEdClosedEncounterCertification({
      lifecycleSnapshot: departedOpenSnapshot({
        nursingAssessment: {
          erDispositionExecutionV1: {
            dischargeSortieCompletedAt: "2026-06-03T12:00:00.000Z",
            dischargeSortieCompletedByDisplayName: "RN One",
          },
        },
        // Mode-only packet is not a completed discharge summary.
        dischargeSummaryJson: { dischargeMode: ED_DISCHARGE_MODE_HOME },
      }),
    });
    expect(result.advisoryFindings.some((d) => d.id === "doc:DISCHARGE_SUMMARY")).toBe(true);
    expect(result.closureBlockers.some((d) => d.id === "doc:DISCHARGE_SUMMARY")).toBe(false);
  });

  it("deduplicates provider unsigned aliases into one root-cause deficiency", () => {
    const result = buildEdClosedEncounterCertification({
      lifecycleSnapshot: departedOpenSnapshot({ providerDocumentationStatus: "DRAFT" }),
      dispositionReadiness: {
        canClose: false,
        blockers: [
          {
            code: "PROVIDER_DOCUMENTATION_UNSIGNED",
            severity: "error",
            message: "Provider documentation unsigned",
          },
        ],
        warnings: [],
        activeOrderCounts: { lab: 0, imaging: 0, medication: 0, care: 0 },
      },
    });
    const unsigned = result.deficiencies.filter(
      (d) => d.deduplicationKey === "PROVIDER_NOTE_UNSIGNED"
    );
    expect(unsigned).toHaveLength(1);
    expect(unsigned[0]?.sourceAuthority).toBe(
      EdChartCertificationSourceAuthority.ESTABLISHED_WORKFLOW
    );
    expect(
      result.deficiencies.filter((d) => /unsigned|signature/i.test(d.title)).length
    ).toBe(1);
  });

  it("does not require home discharge summary for admission disposition", () => {
    const result = buildEdClosedEncounterCertification({
      lifecycleSnapshot: {
        status: "OPEN",
        providerDocumentationStatus: "SIGNED",
        chiefComplaint: "Chest pain",
        providerNote: "Admit",
        encounterType: "EMERGENCY",
        dischargeSummaryJson: { dischargeMode: ED_DISCHARGE_MODE_ADMISSION },
        admissionSummaryJson: { admittingService: "Medicine" },
        nursingAssessment: {
          nursingEvalV1: { sections: { assessment: { text: "RN note" } } },
        },
      },
    });
    expect(result.deficiencies.some((d) => d.id === "doc:DISCHARGE_SUMMARY")).toBe(false);
  });

  it("accepts alternate nursing note shapes as complete nursing assessment", () => {
    const result = buildEdClosedEncounterCertification({
      lifecycleSnapshot: departedOpenSnapshot({
        providerDocumentationStatus: "SIGNED",
        nursingAssessment: {
          nursingNote: "Triage and focused assessment complete.",
          erDispositionExecutionV1: {
            dischargeSortieCompletedAt: "2026-06-03T12:00:00.000Z",
            dischargeSortieCompletedByDisplayName: "RN One",
          },
        },
      }),
    });
    expect(result.deficiencies.some((d) => d.id === "doc:NURSING_ASSESSMENT")).toBe(false);
  });

  it("separates clinical closure readiness from billing readiness", () => {
    const result = buildEdClosedEncounterCertification({
      lifecycleSnapshot: departedOpenSnapshot({
        providerDocumentationStatus: "SIGNED",
        dispositionSafetyReadiness: { canClose: true },
        billingFinalizationStatus: "NOT_READY",
      }),
      diagnosisCount: 0,
    });
    expect(result.clinicalClosureReady).toBe(result.closureReady);
    expect(result.authoritativeReadiness.billingReady).toBe(false);
    expect(result.billingReady).toBe(false);
    expect(result.summary.billingLabel).toBe("NOT_READY");
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

  it("billing code missing blocks established billing readiness from snapshot", () => {
    const result = buildEdClosedEncounterCertification({
      lifecycleSnapshot: departedOpenSnapshot({
        providerDocumentationStatus: "SIGNED",
        billingFinalizationStatus: "NOT_READY",
      }),
      billingReadinessSnapshot: { isReady: false, requiresManualReview: true },
    });
    expect(result.billingReady).toBe(false);
    expect(result.billingBlockers.length).toBeGreaterThan(0);
    expect(
      result.billingBlockers.every(
        (d) => d.sourceAuthority === EdChartCertificationSourceAuthority.ESTABLISHED_WORKFLOW
      )
    ).toBe(true);
  });

  it("insurance/payer missing creates established billing deficiency when snapshot reason exists", () => {
    const result = buildEdClosedEncounterCertification({
      lifecycleSnapshot: departedOpenSnapshot({ providerDocumentationStatus: "SIGNED" }),
      billingReadinessSnapshot: {
        isReady: false,
        reasons: ["MISSING_PAYER"],
      },
    });
    expect(result.billingBlockers.some((d) => d.id === "billing:MISSING_PAYER")).toBe(true);
  });

  it("closureReady true when no established closure blockers", () => {
    const result = buildEdClosedEncounterCertification({
      lifecycleSnapshot: departedOpenSnapshot({
        providerDocumentationStatus: "SIGNED",
        dispositionSafetyReadiness: { canClose: true },
      }),
      dispositionReadiness: { canClose: true, blockers: [], warnings: [], activeOrderCounts: { lab: 0, imaging: 0, medication: 0, care: 0 } },
    });
    expect(result.closureReady).toBe(true);
  });

  it("billingReady true when no established billing blockers", () => {
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

  it("CERTIFIED_CLOSED status resolves for closed encounter without established billing blockers", () => {
    const result = buildEdClosedEncounterCertification({
      lifecycleSnapshot: {
        ...departedOpenSnapshot({ providerDocumentationStatus: "SIGNED" }),
        status: "CLOSED",
      },
      billingReadinessSnapshot: { isReady: true },
      diagnosisCount: 1,
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
    expect(isEdAllEncountersEligible(closed)).toBe(true);
  });
});
