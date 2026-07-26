/**
 * MEDUI.D4A.4.3 — Characterization + unit tests for operational ownership completion.
 */
import { describe, expect, it } from "vitest";
import {
  emptyHospitalAssignmentBag,
  type EnterpriseHospitalAssignmentBagV1,
} from "./enterpriseAssignmentEngineD4a30.js";
import {
  resolveActiveProviderDisplayName,
  resolveObservationAssignmentGaps,
  resolveOrderCancelOperationalAssignees,
} from "./enterpriseOperationalOwnershipCompletionD4a43.js";

function slot(userId: string, displayName?: string) {
  return {
    userId,
    assignedAt: "2026-07-01T00:00:00.000Z",
    source: "SELF_ASSIGN" as const,
    displayName: displayName ?? null,
  };
}

function bagWithPrimaries(input: {
  careSetting?: "OBSERVATION" | "INPATIENT";
  providerId?: string;
  nurseId?: string;
  providerName?: string;
  nurseName?: string;
  attendingId?: string;
  attendingName?: string;
}): EnterpriseHospitalAssignmentBagV1 {
  const bag = emptyHospitalAssignmentBag(input.careSetting ?? "INPATIENT");
  if (input.providerId) {
    bag.workflow.PRIMARY_PROVIDER = slot(input.providerId, input.providerName);
    bag.slots.PROVIDER = bag.workflow.PRIMARY_PROVIDER;
  }
  if (input.nurseId) {
    bag.workflow.PRIMARY_RN = slot(input.nurseId, input.nurseName);
    bag.slots.NURSE = bag.workflow.PRIMARY_RN;
  }
  if (input.attendingId || input.attendingName) {
    bag.clinical.attendingProviderUserId = input.attendingId ?? null;
    bag.clinical.attendingProviderDisplayName = input.attendingName ?? null;
  }
  return bag;
}

function summaryWithBag(bag: EnterpriseHospitalAssignmentBagV1) {
  return { enterpriseHospitalAssignmentV1: bag };
}

describe("D4A.4.3 order-cancel operational assignees", () => {
  it("characterization: inpatient cancel uses bag PRIMARY_* not ED receiving columns", () => {
    const assignees = resolveOrderCancelOperationalAssignees({
      type: "INPATIENT",
      billingClassification: "INPATIENT",
      admissionSummaryJson: summaryWithBag(
        bagWithPrimaries({ providerId: "ip-md", nurseId: "ip-rn" })
      ),
      physicianAssignedUserId: "ed-receiving-md",
      nurseAssignedUserId: "ed-receiving-rn",
    });
    expect(assignees.physicianAssignedUserId).toBe("ip-md");
    expect(assignees.nurseAssignedUserId).toBe("ip-rn");
    expect(assignees.careSetting).toBe("INPATIENT");
  });

  it("characterization: STRICT empty bag → unassigned (ED columns must not authorize cancel match)", () => {
    const assignees = resolveOrderCancelOperationalAssignees({
      type: "INPATIENT",
      billingClassification: "OBSERVATION",
      admissionSummaryJson: {},
      physicianAssignedUserId: "ed-md",
      nurseAssignedUserId: "ed-rn",
    });
    expect(assignees.physicianAssignedUserId).toBeNull();
    expect(assignees.nurseAssignedUserId).toBeNull();
  });

  it("EMERGENCY continues ED columns", () => {
    const assignees = resolveOrderCancelOperationalAssignees({
      type: "EMERGENCY",
      physicianAssignedUserId: "ed-md",
      nurseAssignedUserId: "ed-rn",
    });
    expect(assignees.physicianAssignedUserId).toBe("ed-md");
    expect(assignees.nurseAssignedUserId).toBe("ed-rn");
    expect(assignees.careSetting).toBe("EMERGENCY");
  });
});

describe("D4A.4.3 observation assignment gaps", () => {
  it("characterization: ED columns alone do not clear OBS/IP gaps (STRICT)", () => {
    const gaps = resolveObservationAssignmentGaps({
      type: "INPATIENT",
      billingClassification: "OBSERVATION",
      admissionSummaryJson: summaryWithBag(emptyHospitalAssignmentBag("OBSERVATION")),
      physicianAssignedUserId: "ed-md",
      nurseAssignedUserId: "ed-rn",
    });
    expect(gaps.assignPhysicianGap).toBe(true);
    expect(gaps.assignRnGap).toBe(true);
  });

  it("characterization: bag PRIMARY_* clears gaps", () => {
    const gaps = resolveObservationAssignmentGaps({
      type: "INPATIENT",
      billingClassification: "OBSERVATION",
      admissionSummaryJson: summaryWithBag(
        bagWithPrimaries({
          careSetting: "OBSERVATION",
          providerId: "obs-md",
          nurseId: "obs-rn",
        })
      ),
      physicianAssignedUserId: "ed-md",
      nurseAssignedUserId: "ed-rn",
    });
    expect(gaps.assignPhysicianGap).toBe(false);
    expect(gaps.assignRnGap).toBe(false);
    expect(gaps.primaryProviderUserId).toBe("obs-md");
    expect(gaps.primaryNurseUserId).toBe("obs-rn");
  });

  it("absent bag → gaps (UNRESOLVED / unassigned)", () => {
    const gaps = resolveObservationAssignmentGaps({
      type: "INPATIENT",
      billingClassification: "INPATIENT",
      physicianAssignedUserId: "ed-md",
      nurseAssignedUserId: "ed-rn",
    });
    expect(gaps.assignPhysicianGap).toBe(true);
    expect(gaps.assignRnGap).toBe(true);
  });
});

describe("D4A.4.3 active provider display", () => {
  it("ED uses joined physician display name", () => {
    expect(
      resolveActiveProviderDisplayName({
        ownershipInput: {
          type: "EMERGENCY",
          physicianAssignedUserId: "ed-md",
        },
        edPhysicianDisplayName: "Dr ED",
      })
    ).toBe("Dr ED");
  });

  it("inpatient prefers clinical attending display over ED relation name", () => {
    expect(
      resolveActiveProviderDisplayName({
        ownershipInput: {
          type: "INPATIENT",
          billingClassification: "INPATIENT",
          admissionSummaryJson: summaryWithBag(
            bagWithPrimaries({
              providerId: "ip-md",
              providerName: "Primary MD",
              attendingId: "att-1",
              attendingName: "Attending MD",
            })
          ),
          physicianAssignedUserId: "ed-md",
        },
        edPhysicianDisplayName: "ED Receiving",
      })
    ).toBe("Attending MD");
  });

  it("STRICT unassigned hospital → em dash (not ED name)", () => {
    expect(
      resolveActiveProviderDisplayName({
        ownershipInput: {
          type: "INPATIENT",
          billingClassification: "INPATIENT",
          admissionSummaryJson: {},
          physicianAssignedUserId: "ed-md",
        },
        edPhysicianDisplayName: "ED Receiving",
      })
    ).toBe("—");
  });
});
