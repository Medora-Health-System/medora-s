import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  ED_ENCOUNTER_LIFECYCLE_READ_ONLY,
  EdEncounterLifecycleState,
  buildEdEncounterLifecycleProjection,
  resolveEdEncounterLifecycleState,
} from "./edEncounterLifecycle.js";
import {
  ED_DISCHARGE_MODE_ADMISSION,
  ED_DISCHARGE_MODE_AMA,
  ED_DISCHARGE_MODE_HOME,
  ED_DISCHARGE_MODE_TRANSFER,
} from "./edEncounterLifecycle.js";

function baseOpenSnapshot(
  overrides: Record<string, unknown> = {}
): import("./edEncounterLifecycle.js").EdEncounterLifecycleEncounterSnapshot {
  return {
    status: "OPEN",
    workflowState: "IN_TREATMENT",
    providerDocumentationStatus: "DRAFT",
    encounterType: "EMERGENCY",
    chiefComplaint: "Abdominal pain",
    providerNote: "Stable after treatment",
    nursingAssessment: {
      nursingEvalV1: {
        sections: { assessment: { text: "Nursing assessment documented" } },
      },
    },
    dischargeSummaryJson: {
      dischargeMode: ED_DISCHARGE_MODE_HOME,
      instructions: "Return if symptoms worsen",
      followUp: "PCP in 48 hours",
    },
    admissionSummaryJson: null,
    billingFinalizationStatus: "NOT_READY",
    ...overrides,
  };
}

function sortieExecutionNursingAssessment(extra: Record<string, unknown> = {}) {
  return {
    nursingEvalV1: {
      sections: { assessment: { text: "Nursing assessment documented" } },
    },
    erDispositionExecutionV1: {
      dischargeSortieCompletedAt: "2026-06-03T12:00:00.000Z",
      dischargeSortieCompletedByDisplayName: "Marie Infirmière",
    },
    ...extra,
  };
}

function handoffCompleteNursingAssessment() {
  return {
    nursingEvalV1: {
      sections: { assessment: { text: "Nursing assessment documented" } },
    },
    erHandoffV1: {
      reportGiven: true,
      reportGivenAt: "2026-06-03T12:00:00.000Z",
    },
  };
}

describe("edEncounterLifecycle", () => {
  it("1 ACTIVE_ED waiting room", () => {
    const state = resolveEdEncounterLifecycleState(
      baseOpenSnapshot({
        workflowState: "ARRIVED",
        dischargeSummaryJson: null,
        chiefComplaint: "Headache",
      })
    );
    expect(state).toBe(EdEncounterLifecycleState.ACTIVE_ED);
  });

  it("2 ACTIVE_ED treatment", () => {
    const state = resolveEdEncounterLifecycleState(
      baseOpenSnapshot({
        workflowState: "IN_TREATMENT",
        dischargeSummaryJson: null,
      })
    );
    expect(state).toBe(EdEncounterLifecycleState.ACTIVE_ED);
  });

  it("3 DISPOSITION_ORDERED discharge pending", () => {
    const state = resolveEdEncounterLifecycleState(
      baseOpenSnapshot({
        dischargeSummaryJson: { dischargeMode: ED_DISCHARGE_MODE_HOME },
        nursingAssessment: {
          nursingEvalV1: { sections: { assessment: { text: "ok" } } },
        },
      })
    );
    expect(state).toBe(EdEncounterLifecycleState.DISPOSITION_ORDERED);
  });

  it("4 DISPOSITION_ORDERED admission pending", () => {
    const state = resolveEdEncounterLifecycleState(
      baseOpenSnapshot({
        dischargeSummaryJson: { dischargeMode: ED_DISCHARGE_MODE_ADMISSION },
        admissionSummaryJson: { careLevel: "Observation" },
        nursingAssessment: {
          nursingEvalV1: { sections: { assessment: { text: "ok" } } },
        },
      })
    );
    expect(state).toBe(EdEncounterLifecycleState.DISPOSITION_ORDERED);
  });

  it("5 DISPOSITION_ORDERED transfer pending", () => {
    const state = resolveEdEncounterLifecycleState(
      baseOpenSnapshot({
        dischargeSummaryJson: { dischargeMode: ED_DISCHARGE_MODE_TRANSFER },
        nursingAssessment: {
          nursingEvalV1: { sections: { assessment: { text: "ok" } } },
        },
      })
    );
    expect(state).toBe(EdEncounterLifecycleState.DISPOSITION_ORDERED);
  });

  it("6 INCOMPLETE_CHART departed + unsigned provider note", () => {
    const state = resolveEdEncounterLifecycleState(
      baseOpenSnapshot({
        providerDocumentationStatus: "DRAFT",
        nursingAssessment: sortieExecutionNursingAssessment(),
      })
    );
    expect(state).toBe(EdEncounterLifecycleState.INCOMPLETE_CHART);
  });

  it("7 INCOMPLETE_CHART departed + documentation deficiency", () => {
    const state = resolveEdEncounterLifecycleState(
      baseOpenSnapshot({
        providerDocumentationStatus: "SIGNED",
        chiefComplaint: "",
        nursingAssessment: sortieExecutionNursingAssessment(),
      })
    );
    expect(state).toBe(EdEncounterLifecycleState.INCOMPLETE_CHART);
  });

  it("8 READY_FOR_CLOSURE departed + complete", () => {
    const state = resolveEdEncounterLifecycleState(
      baseOpenSnapshot({
        providerDocumentationStatus: "SIGNED",
        nursingAssessment: sortieExecutionNursingAssessment(),
        dispositionSafetyReadiness: { canClose: true },
      })
    );
    expect(state).toBe(EdEncounterLifecycleState.READY_FOR_CLOSURE);
  });

  it("9 CLOSED_ENCOUNTER", () => {
    const state = resolveEdEncounterLifecycleState(
      baseOpenSnapshot({
        status: "CLOSED",
        providerDocumentationStatus: "DRAFT",
        dischargedAt: "2026-06-03T13:00:00.000Z",
      })
    );
    expect(state).toBe(EdEncounterLifecycleState.CLOSED_ENCOUNTER);
  });

  it("10 ARCHIVED_ALL_ENCOUNTERS", () => {
    const state = resolveEdEncounterLifecycleState(
      baseOpenSnapshot({
        status: "CLOSED",
        providerDocumentationStatus: "SIGNED",
        dischargedAt: "2026-06-03T13:00:00.000Z",
      })
    );
    expect(state).toBe(EdEncounterLifecycleState.ARCHIVED_ALL_ENCOUNTERS);
  });

  it("11 assignment does not affect lifecycle", () => {
    const base = baseOpenSnapshot({ dischargeSummaryJson: null });
    const withAssignment = resolveEdEncounterLifecycleState({
      ...base,
      nurseAssignedUserId: "nurse-1",
      physicianAssignedUserId: "md-1",
    });
    const withoutAssignment = resolveEdEncounterLifecycleState(base);
    expect(withAssignment).toBe(withoutAssignment);
    expect(withAssignment).toBe(EdEncounterLifecycleState.ACTIVE_ED);
  });

  it("12 billing status does not block archive MVP", () => {
    const projection = buildEdEncounterLifecycleProjection(
      baseOpenSnapshot({
        status: "CLOSED",
        providerDocumentationStatus: "SIGNED",
        billingFinalizationStatus: "NOT_READY",
      })
    );
    expect(projection.state).toBe(EdEncounterLifecycleState.ARCHIVED_ALL_ENCOUNTERS);
    expect(projection.archived).toBe(true);
  });

  it("13 no disposition remains ACTIVE_ED", () => {
    const state = resolveEdEncounterLifecycleState(
      baseOpenSnapshot({
        dischargeSummaryJson: null,
        admissionSummaryJson: null,
        workflowState: "TRIAGE",
      })
    );
    expect(state).toBe(EdEncounterLifecycleState.ACTIVE_ED);
  });

  it("14 AMA departed becomes incomplete when docs missing", () => {
    const state = resolveEdEncounterLifecycleState(
      baseOpenSnapshot({
        dischargeSummaryJson: { dischargeMode: ED_DISCHARGE_MODE_AMA },
        providerDocumentationStatus: "DRAFT",
        nursingAssessment: sortieExecutionNursingAssessment(),
      })
    );
    expect(state).toBe(EdEncounterLifecycleState.INCOMPLETE_CHART);
  });

  it("15 transfer handoff complete becomes incomplete/open", () => {
    const state = resolveEdEncounterLifecycleState(
      baseOpenSnapshot({
        dischargeSummaryJson: { dischargeMode: ED_DISCHARGE_MODE_TRANSFER },
        providerDocumentationStatus: "DRAFT",
        nursingAssessment: handoffCompleteNursingAssessment(),
      })
    );
    expect(state).toBe(EdEncounterLifecycleState.INCOMPLETE_CHART);
  });

  it("16 admission handoff complete becomes incomplete/open", () => {
    const state = resolveEdEncounterLifecycleState(
      baseOpenSnapshot({
        dischargeSummaryJson: { dischargeMode: ED_DISCHARGE_MODE_ADMISSION },
        admissionSummaryJson: { careLevel: "Inpatient" },
        providerDocumentationStatus: "DRAFT",
        nursingAssessment: handoffCompleteNursingAssessment(),
      })
    );
    expect(state).toBe(EdEncounterLifecycleState.INCOMPLETE_CHART);
  });

  it("17 provider signed + readiness fail stays incomplete", () => {
    const state = resolveEdEncounterLifecycleState(
      baseOpenSnapshot({
        providerDocumentationStatus: "SIGNED",
        nursingAssessment: sortieExecutionNursingAssessment(),
        dispositionSafetyReadiness: { canClose: false },
      })
    );
    expect(state).toBe(EdEncounterLifecycleState.INCOMPLETE_CHART);
  });

  it("18 status CLOSED overrides incomplete", () => {
    const state = resolveEdEncounterLifecycleState(
      baseOpenSnapshot({
        status: "CLOSED",
        providerDocumentationStatus: "DRAFT",
        nursingAssessment: sortieExecutionNursingAssessment(),
      })
    );
    expect(state).toBe(EdEncounterLifecycleState.CLOSED_ENCOUNTER);
    expect(state).not.toBe(EdEncounterLifecycleState.INCOMPLETE_CHART);
  });

  it("19 archived projection remains closed=true", () => {
    const projection = buildEdEncounterLifecycleProjection(
      baseOpenSnapshot({
        status: "CLOSED",
        providerDocumentationStatus: "SIGNED",
      })
    );
    expect(projection.archived).toBe(true);
    expect(projection.closed).toBe(true);
    expect(projection.displayLabel).toBe("Archived");
  });

  it("20 read-only certification", () => {
    expect(ED_ENCOUNTER_LIFECYCLE_READ_ONLY).toBe(true);
    const src = readFileSync(join(import.meta.dirname, "edEncounterLifecycle.ts"), "utf8");
    expect(src).not.toMatch(/\bprisma\b/i);
    expect(src).not.toMatch(/\.update\(|\.create\(|closeEncounter/i);
  });
});
