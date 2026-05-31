import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  resolveLabRadQueueWorkflowAction,
  resolveWorklistItemWorkflowAction,
} from "./worklistLabRadUi";
import { worklistItemWorkflowActionPath } from "./worklistLabRadUi";

const labPageSource = readFileSync(
  join(import.meta.dirname, "../../app/app/lab-worklist/page.tsx"),
  "utf8"
);

describe("lab worklist queue — workflow action visibility", () => {
  it("shows Acknowledge for PLACED item when viewer is lab actor", () => {
    expect(
      resolveLabRadQueueWorkflowAction({
        status: "PLACED",
        orderCancelled: false,
        viewerIsDeptActor: true,
      })
    ).toBe("acknowledge");
  });

  it("shows Start for ACKNOWLEDGED item", () => {
    expect(
      resolveLabRadQueueWorkflowAction({
        status: "ACKNOWLEDGED",
        orderCancelled: false,
        viewerIsDeptActor: true,
      })
    ).toBe("start");
  });

  it("shows Complete for IN_PROGRESS item", () => {
    expect(
      resolveLabRadQueueWorkflowAction({
        status: "IN_PROGRESS",
        orderCancelled: false,
        viewerIsDeptActor: true,
      })
    ).toBe("complete");
  });

  it("shows no workflow action for completed/resulted/cancelled items", () => {
    expect(
      resolveLabRadQueueWorkflowAction({
        status: "COMPLETED",
        orderCancelled: false,
        viewerIsDeptActor: true,
      })
    ).toBeNull();
    expect(
      resolveLabRadQueueWorkflowAction({
        status: "RESULTED",
        orderCancelled: false,
        viewerIsDeptActor: true,
      })
    ).toBeNull();
    expect(
      resolveLabRadQueueWorkflowAction({
        status: "CANCELLED",
        orderCancelled: false,
        viewerIsDeptActor: true,
      })
    ).toBeNull();
  });
});

describe("lab worklist page — queue wiring", () => {
  it("uses shared workflow resolver and API helper", () => {
    expect(labPageSource).toContain("resolveLabRadQueueWorkflowAction");
    expect(labPageSource).toContain("postWorklistItemWorkflowAction");
    expect(labPageSource).toContain("isLabTestWorkflowActor");
    expect(labPageSource).toContain("DeptWorklistReadOnlyNotice");
    expect(labPageSource).toContain("shouldShowDeptWorklistReadOnlyNotice");
  });

  it("renders workflow button with stable data-testid and refreshes queue after action", () => {
    expect(labPageSource).toContain('data-testid={`lab-worklist-workflow-${workflowAction}-${item.id}`}');
    expect(labPageSource).toContain("await loadQueue()");
    expect(labPageSource).toContain("pendingWorkflowItemId");
  });

  it("keeps View and Open encounter links", () => {
    expect(labPageSource).toContain('t("common.view")');
    expect(labPageSource).toContain('t("worklistDepartments.shared.openEncounter")');
  });

  it("calls existing acknowledge/start/complete endpoints via shared helper", () => {
    expect(worklistItemWorkflowActionPath("acknowledge", "item-1")).toBe(
      "/orders/items/item-1/acknowledge"
    );
    expect(resolveWorklistItemWorkflowAction("PLACED")).toBe("acknowledge");
  });
});
