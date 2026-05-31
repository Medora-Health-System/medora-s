import { describe, expect, it } from "vitest";
import {
  deptWorklistReadOnlyNoticeKey,
  isDeptWorklistWorkflowActor,
  isFacilityAdminWorkflowRole,
  isLabRadClinicalWorkflowActor,
  isLabTestWorkflowActor,
  isRadiologyWorkflowActor,
  resolveLabRadQueueWorkflowAction,
  resolveWorklistItemWorkflowAction,
  shouldShowDeptWorklistReadOnlyNotice,
  worklistItemAllowsComplete,
  worklistItemAllowsStart,
  worklistItemIsTerminal,
  worklistItemNeedsAcknowledge,
  worklistItemShowsWorkflowActions,
  worklistItemWorkflowActionPath,
} from "./worklistLabRadUi";

describe("worklistLabRadUi — acknowledge visibility", () => {
  it.each(["PLACED", "PENDING", "SIGNED", "placed", " pending "])(
    "needs acknowledge for %s",
    (status) => {
      expect(worklistItemNeedsAcknowledge(status)).toBe(true);
    }
  );

  it.each(["ACKNOWLEDGED", "IN_PROGRESS", "COMPLETED", "RESULTED", "VERIFIED", "CANCELLED"])(
    "does not need acknowledge for %s",
    (status) => {
      expect(worklistItemNeedsAcknowledge(status)).toBe(false);
    }
  );
});

describe("worklistLabRadUi — start visibility", () => {
  it("allows start only for ACKNOWLEDGED", () => {
    expect(worklistItemAllowsStart("ACKNOWLEDGED")).toBe(true);
    expect(worklistItemAllowsStart("acknowledged")).toBe(true);
    expect(worklistItemAllowsStart("PLACED")).toBe(false);
    expect(worklistItemAllowsStart("IN_PROGRESS")).toBe(false);
  });
});

describe("worklistLabRadUi — complete visibility", () => {
  it("allows complete only for IN_PROGRESS", () => {
    expect(worklistItemAllowsComplete("IN_PROGRESS")).toBe(true);
    expect(worklistItemAllowsComplete("in_progress")).toBe(true);
    expect(worklistItemAllowsComplete("ACKNOWLEDGED")).toBe(false);
    expect(worklistItemAllowsComplete("PLACED")).toBe(false);
  });
});

describe("resolveWorklistItemWorkflowAction", () => {
  it.each([
    ["PLACED", "acknowledge"],
    ["PENDING", "acknowledge"],
    ["SIGNED", "acknowledge"],
    ["ACKNOWLEDGED", "start"],
    ["IN_PROGRESS", "complete"],
  ] as const)("maps %s to %s", (status, action) => {
    expect(resolveWorklistItemWorkflowAction(status)).toBe(action);
  });

  it.each(["COMPLETED", "RESULTED", "VERIFIED", "CANCELLED", "DRAFT", ""])(
    "returns null for terminal or inactive %s",
    (status) => {
      expect(resolveWorklistItemWorkflowAction(status)).toBeNull();
    }
  );
});

describe("resolveLabRadQueueWorkflowAction", () => {
  const actor = { orderCancelled: false, viewerIsDeptActor: true };

  it("shows acknowledge for PLACED lab item", () => {
    expect(resolveLabRadQueueWorkflowAction({ ...actor, status: "PLACED" })).toBe("acknowledge");
  });

  it("shows start for ACKNOWLEDGED lab item", () => {
    expect(resolveLabRadQueueWorkflowAction({ ...actor, status: "ACKNOWLEDGED" })).toBe("start");
  });

  it("shows complete for IN_PROGRESS lab item", () => {
    expect(resolveLabRadQueueWorkflowAction({ ...actor, status: "IN_PROGRESS" })).toBe("complete");
  });

  it("shows no action for completed/resulted/cancelled items", () => {
    expect(resolveLabRadQueueWorkflowAction({ ...actor, status: "COMPLETED" })).toBeNull();
    expect(resolveLabRadQueueWorkflowAction({ ...actor, status: "RESULTED" })).toBeNull();
    expect(resolveLabRadQueueWorkflowAction({ ...actor, status: "CANCELLED" })).toBeNull();
  });

  it("hides workflow action when viewer is not a department actor", () => {
    expect(
      resolveLabRadQueueWorkflowAction({
        status: "PLACED",
        orderCancelled: false,
        viewerIsDeptActor: false,
      })
    ).toBeNull();
  });

  it("hides workflow action when parent order is cancelled", () => {
    expect(
      resolveLabRadQueueWorkflowAction({
        status: "PLACED",
        orderCancelled: true,
        viewerIsDeptActor: true,
      })
    ).toBeNull();
  });
});

describe("LAB.ED.4 — clinical lab/radiology workflow actors", () => {
  const placedAck = (roles: string[]) =>
    resolveLabRadQueueWorkflowAction({
      status: "PLACED",
      orderCancelled: false,
      viewerIsDeptActor: isLabRadClinicalWorkflowActor(roles),
    });

  it.each(["LAB", "ADMIN", "RN", "PROVIDER", "RADIOLOGY"] as const)(
    "%s sees Acknowledge on PLACED lab queue",
    (role) => {
      expect(isLabTestWorkflowActor([role])).toBe(true);
      expect(placedAck([role])).toBe("acknowledge");
    }
  );

  it("RADIOLOGY sees Acknowledge on PLACED imaging queue", () => {
    expect(isRadiologyWorkflowActor(["RADIOLOGY"])).toBe(true);
    expect(
      resolveLabRadQueueWorkflowAction({
        status: "PLACED",
        orderCancelled: false,
        viewerIsDeptActor: isRadiologyWorkflowActor(["RADIOLOGY"]),
      })
    ).toBe("acknowledge");
  });

  it("LAB sees Acknowledge on PLACED imaging queue (same clinical matrix)", () => {
    expect(isRadiologyWorkflowActor(["LAB"])).toBe(true);
    expect(placedAck(["LAB"])).toBe("acknowledge");
  });

  it("FRONT_DESK sees no button and read-only notice on PLACED lab line", () => {
    expect(isLabRadClinicalWorkflowActor(["FRONT_DESK"])).toBe(false);
    expect(placedAck(["FRONT_DESK"])).toBeNull();
    expect(
      shouldShowDeptWorklistReadOnlyNotice({
        roles: ["FRONT_DESK"],
        kind: "lab",
        status: "PLACED",
        orderCancelled: false,
      })
    ).toBe(true);
  });

  it("MEDORA_SUPER_ADMIN alone is not a workflow actor", () => {
    expect(isFacilityAdminWorkflowRole(["MEDORA_SUPER_ADMIN"])).toBe(false);
    expect(isLabRadClinicalWorkflowActor(["MEDORA_SUPER_ADMIN"])).toBe(false);
    expect(placedAck(["MEDORA_SUPER_ADMIN"])).toBeNull();
  });

  it("after acknowledge, Start is the next action", () => {
    expect(resolveWorklistItemWorkflowAction("ACKNOWLEDGED")).toBe("start");
    expect(
      resolveLabRadQueueWorkflowAction({
        status: "ACKNOWLEDGED",
        orderCancelled: false,
        viewerIsDeptActor: isLabTestWorkflowActor(["RN"]),
      })
    ).toBe("start");
  });

  it("queue and detail share isDeptWorklistWorkflowActor for lab and radiology", () => {
    expect(isDeptWorklistWorkflowActor(["RN"], "lab")).toBe(true);
    expect(isDeptWorklistWorkflowActor(["PROVIDER"], "radiology")).toBe(true);
    expect(isDeptWorklistWorkflowActor(["FRONT_DESK"], "lab")).toBe(false);
  });

  it("read-only notice key points to lab i18n message", () => {
    expect(deptWorklistReadOnlyNoticeKey("lab")).toBe(
      "worklistDepartments.shared.labWorkflowReadOnlyPermission"
    );
  });
});

describe("worklistItemWorkflowActionPath", () => {
  it("maps actions to existing order item endpoints", () => {
    expect(worklistItemWorkflowActionPath("acknowledge", "item-1")).toBe(
      "/orders/items/item-1/acknowledge"
    );
    expect(worklistItemWorkflowActionPath("start", "item-2")).toBe("/orders/items/item-2/start");
    expect(worklistItemWorkflowActionPath("complete", "item-3")).toBe("/orders/items/item-3/complete");
  });
});

describe("worklistItemShowsWorkflowActions", () => {
  it("matches active workflow statuses only", () => {
    expect(worklistItemShowsWorkflowActions("PLACED")).toBe(true);
    expect(worklistItemShowsWorkflowActions("ACKNOWLEDGED")).toBe(true);
    expect(worklistItemShowsWorkflowActions("IN_PROGRESS")).toBe(true);
    expect(worklistItemShowsWorkflowActions("COMPLETED")).toBe(false);
    expect(worklistItemIsTerminal("VERIFIED")).toBe(true);
  });
});
