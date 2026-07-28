/**
 * MEDUI.D4C.4 — shared nursing queue / intake projection unit tests.
 */

import { describe, expect, it } from "vitest";
import {
  CLINIC_CARE_MA_ASSIGNMENT_ADAPTER,
  clinicCareAmbulatoryIntakeChartPath,
  clinicCareNursingNextWorkflowTransition,
  projectClinicCareIntakeStatus,
  projectClinicCareNursingQueueStage,
} from "./clinicCareNursingQueueD4c4.js";

describe("clinicCareNursingQueueD4c4", () => {
  it("maps workflow states onto nursing queue stages", () => {
    expect(projectClinicCareNursingQueueStage({ workflowState: null })).toBe("WAITING_FOR_INTAKE");
    expect(projectClinicCareNursingQueueStage({ workflowState: "DISPOSITION" })).toBe(
      "READY_FOR_PROVIDER"
    );
    expect(projectClinicCareNursingQueueStage({ workflowState: "DISCHARGE_READY" })).toBe(
      "READY_FOR_PROVIDER"
    );
  });

  it("exposes intake/ready transitions and MA adapter contract", () => {
    expect(clinicCareNursingNextWorkflowTransition("")).toBe("TRIAGE");
    expect(CLINIC_CARE_MA_ASSIGNMENT_ADAPTER.roleCode).toBe("PATIENT_CARE_TECH");
    expect(clinicCareAmbulatoryIntakeChartPath("x")).toBe("/app/encounters/x?tab=triage");
  });

  it("projects intake status from enterprise vitals + clinical history profile", () => {
    expect(projectClinicCareIntakeStatus({}).vitals).toBe("MISSING");
    expect(
      projectClinicCareIntakeStatus({
        triageCompleteAt: "2026-01-01T00:00:00Z",
        clinicalHistoryProfileJson: null,
      }).vitals
    ).toBe("DONE");
  });
});
