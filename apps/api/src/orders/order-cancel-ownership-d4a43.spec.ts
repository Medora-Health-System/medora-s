/**
 * MEDUI.D4A.4.3 — Nest wiring: order-cancel uses ownership-resolved assignees.
 */
import { OrderItemLifecycleState, RoleCode } from "@prisma/client";
import { ForbiddenException } from "@nestjs/common";
import {
  emptyHospitalAssignmentBag,
  resolveOrderCancelOperationalAssignees,
  type EnterpriseHospitalAssignmentBagV1,
} from "@medora/shared";
import { resolveOrderCancelPolicyActor } from "./order-cancel-policy.util";

function slot(userId: string) {
  return {
    userId,
    assignedAt: "2026-07-01T00:00:00.000Z",
    source: "SELF_ASSIGN" as const,
    displayName: null,
  };
}

function summaryBag(providerId: string, nurseId: string): unknown {
  const bag: EnterpriseHospitalAssignmentBagV1 = emptyHospitalAssignmentBag("INPATIENT");
  bag.workflow.PRIMARY_PROVIDER = slot(providerId);
  bag.workflow.PRIMARY_RN = slot(nurseId);
  bag.slots.PROVIDER = bag.workflow.PRIMARY_PROVIDER;
  bag.slots.NURSE = bag.workflow.PRIMARY_RN;
  return { enterpriseHospitalAssignmentV1: bag };
}

describe("order-cancel D4A.4.3 ownership wiring", () => {
  it("allows hospital PRIMARY_PROVIDER to cancel even when ED physician column differs", () => {
    const assignees = resolveOrderCancelOperationalAssignees({
      type: "INPATIENT",
      billingClassification: "INPATIENT",
      admissionSummaryJson: summaryBag("ip-md", "ip-rn"),
      physicianAssignedUserId: "ed-md",
      nurseAssignedUserId: "ed-rn",
    });
    expect(
      resolveOrderCancelPolicyActor(
        {
          order: { type: "LAB", orderedBy: "other-md", source: "PROVIDER_ORDER" },
          catalogItemType: "LAB_TEST",
          lifecycleState: OrderItemLifecycleState.ORDERED,
          encounter: {
            physicianAssignedUserId: assignees.physicianAssignedUserId,
            nurseAssignedUserId: assignees.nurseAssignedUserId,
          },
        },
        [RoleCode.PROVIDER],
        "ip-md"
      )
    ).toBe("PROVIDER");
  });

  it("denies ED receiving physician when STRICT bag primary is someone else", () => {
    const assignees = resolveOrderCancelOperationalAssignees({
      type: "INPATIENT",
      billingClassification: "INPATIENT",
      admissionSummaryJson: summaryBag("ip-md", "ip-rn"),
      physicianAssignedUserId: "ed-md",
      nurseAssignedUserId: "ed-rn",
    });
    expect(() =>
      resolveOrderCancelPolicyActor(
        {
          order: { type: "LAB", orderedBy: "other-md", source: "PROVIDER_ORDER" },
          catalogItemType: "LAB_TEST",
          lifecycleState: OrderItemLifecycleState.ORDERED,
          encounter: {
            physicianAssignedUserId: assignees.physicianAssignedUserId,
            nurseAssignedUserId: assignees.nurseAssignedUserId,
          },
        },
        [RoleCode.PROVIDER],
        "ed-md"
      )
    ).toThrow(ForbiddenException);
  });

  it("STRICT empty bag: ED nurse cannot match encounter nursing cancel authority", () => {
    const assignees = resolveOrderCancelOperationalAssignees({
      type: "INPATIENT",
      billingClassification: "OBSERVATION",
      admissionSummaryJson: {},
      physicianAssignedUserId: "ed-md",
      nurseAssignedUserId: "ed-rn",
    });
    expect(assignees.nurseAssignedUserId).toBeNull();
    expect(() =>
      resolveOrderCancelPolicyActor(
        {
          order: { type: "CARE", orderedBy: "other-rn", source: "VERBAL_ORDER" },
          catalogItemType: "NURSING_CARE",
          lifecycleState: OrderItemLifecycleState.ORDERED,
          encounter: {
            physicianAssignedUserId: assignees.physicianAssignedUserId,
            nurseAssignedUserId: assignees.nurseAssignedUserId,
          },
        },
        [RoleCode.RN],
        "ed-rn"
      )
    ).toThrow(ForbiddenException);
  });
});
