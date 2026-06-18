import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { EdEncounterLifecycleState, ED_DISCHARGE_MODE_HOME } from "@medora/shared";
import {
  isMyActivePatientLifecycleState,
  resolveMyActivePatientsEncounters,
  resolveMyPatientsLifecycleState,
  type EdMyPatientsLifecycleEncounter,
} from "./edMyPatientsFilter";

const webSrcRoot = join(import.meta.dirname, "../..");

function readSrc(relativePath: string): string {
  return readFileSync(join(webSrcRoot, relativePath), "utf8");
}

function ctx(userId = "user-1", roles: string[] = ["RN"]) {
  return { currentUserId: userId, roles };
}

function activeAssigned(id: string, overrides: Record<string, unknown> = {}): EdMyPatientsLifecycleEncounter {
  return {
    id,
    nurseAssignedUserId: "user-1",
    status: "OPEN",
    type: "EMERGENCY",
    chiefComplaint: "Pain",
    dischargeSummaryJson: null,
    nursingAssessment: {
      nursingEvalV1: { sections: { assessment: { text: "Done" } } },
    },
    ...overrides,
  };
}

function dispositionOrderedAssigned(id: string): EdMyPatientsLifecycleEncounter {
  return activeAssigned(id, {
    dischargeSummaryJson: { dischargeMode: ED_DISCHARGE_MODE_HOME },
  });
}

function departedIncompleteAssigned(id: string): EdMyPatientsLifecycleEncounter {
  return activeAssigned(id, {
    dischargeSummaryJson: { dischargeMode: ED_DISCHARGE_MODE_HOME },
    nursingAssessment: {
      nursingEvalV1: { sections: { assessment: { text: "Done" } } },
      erDispositionExecutionV1: {
        dischargeSortieCompletedAt: "2026-06-03T12:00:00.000Z",
        dischargeSortieCompletedByDisplayName: "RN",
      },
    },
  });
}

describe("edMyActivePatientsFilter (MEDUI.ED.LIFECYCLE.5B)", () => {
  it("ACTIVE_ED assigned appears in My Patients", () => {
    const rows = [activeAssigned("e-active")];
    expect(resolveMyActivePatientsEncounters(rows, ctx())).toHaveLength(1);
  });

  it("DISPOSITION_ORDERED assigned appears in My Patients", () => {
    const rows = [dispositionOrderedAssigned("e-disp")];
    expect(resolveMyActivePatientsEncounters(rows, ctx())).toHaveLength(1);
  });

  it("INCOMPLETE_CHART assigned does NOT appear in My Patients", () => {
    const rows = [departedIncompleteAssigned("e-inc")];
    expect(resolveMyPatientsLifecycleState(rows[0]!)).toBe(EdEncounterLifecycleState.INCOMPLETE_CHART);
    expect(resolveMyActivePatientsEncounters(rows, ctx())).toEqual([]);
  });

  it("READY_FOR_CLOSURE assigned does NOT appear in My Patients", () => {
    const rows = [
      {
        id: "e-ready",
        nurseAssignedUserId: "user-1",
        status: "OPEN",
        type: "EMERGENCY",
        chiefComplaint: "Abdominal pain",
        providerNote: "Stable",
        providerDocumentationStatus: "SIGNED",
        dischargeSummaryJson: { dischargeMode: ED_DISCHARGE_MODE_HOME },
        nursingAssessment: {
          nursingEvalV1: { sections: { assessment: { text: "Nursing assessment documented" } } },
          erDispositionExecutionV1: {
            dischargeSortieCompletedAt: "2026-06-03T12:00:00.000Z",
            dischargeSortieCompletedByDisplayName: "Marie Infirmière",
          },
        },
        dispositionSafetyReadiness: { canClose: true },
      },
    ];
    expect(resolveMyPatientsLifecycleState(rows[0]!)).toBe(EdEncounterLifecycleState.READY_FOR_CLOSURE);
    expect(resolveMyActivePatientsEncounters(rows, ctx())).toEqual([]);
  });

  it("trackboard uses lifecycle-aware My Patients filter", () => {
    const trackboard = readSrc("features/emergency/EmergencyTrackboardView.tsx");
    expect(trackboard).toContain("resolveMyActivePatientsEncounters");
    expect(trackboard).not.toMatch(/myPatientsBase[\s\S]{0,80}resolveMyPatientsEncounters\(/);
  });

  it("My Patients counter uses active assigned base", () => {
    const trackboard = readSrc("features/emergency/EmergencyTrackboardView.tsx");
    expect(trackboard).toContain('view === "myPatients" && myPatientsBase.length > 0');
  });

  it("isMyActivePatientLifecycleState includes only active ED states", () => {
    expect(isMyActivePatientLifecycleState("ACTIVE_ED" as never)).toBe(true);
    expect(isMyActivePatientLifecycleState("DISPOSITION_ORDERED" as never)).toBe(true);
    expect(isMyActivePatientLifecycleState("INCOMPLETE_CHART" as never)).toBe(false);
  });
});
