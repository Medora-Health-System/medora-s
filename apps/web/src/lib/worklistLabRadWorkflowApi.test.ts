import { describe, expect, it, vi } from "vitest";
import {
  assertWorklistItemAllowsWorkflowAction,
  postWorklistItemWorkflowAction,
} from "./worklistLabRadWorkflowApi";
import { worklistItemWorkflowActionPath } from "./worklistLabRadUi";

vi.mock("@/lib/mutateOrderItemLifecycleAction", () => ({
  mutateOrderItemLifecycleAction: vi.fn(),
}));

import { mutateOrderItemLifecycleAction } from "@/lib/mutateOrderItemLifecycleAction";

describe("postWorklistItemWorkflowAction", () => {
  it("delegates to shared mutateOrderItemLifecycleAction", async () => {
    vi.mocked(mutateOrderItemLifecycleAction).mockResolvedValueOnce({
      queued: false,
      idempotent: false,
      nextStatus: "ACKNOWLEDGED",
      responseBody: { status: "ACKNOWLEDGED" },
      itemPatch: { status: "ACKNOWLEDGED" },
    });
    const result = await postWorklistItemWorkflowAction("acknowledge", "line-abc", "fac-1", "PLACED");
    expect(mutateOrderItemLifecycleAction).toHaveBeenCalledWith("acknowledge", "line-abc", "fac-1", undefined);
    expect(result.nextStatus).toBe("ACKNOWLEDGED");
  });

  it("does not block stale acknowledge clicks client-side", async () => {
    vi.mocked(mutateOrderItemLifecycleAction).mockResolvedValueOnce({
      queued: false,
      idempotent: true,
      nextStatus: "ACKNOWLEDGED",
      responseBody: { status: "ACKNOWLEDGED", idempotent: true },
      itemPatch: { status: "ACKNOWLEDGED", idempotent: true },
    });
    await expect(
      postWorklistItemWorkflowAction("acknowledge", "line-abc", "fac-1", "ACKNOWLEDGED")
    ).resolves.toMatchObject({ idempotent: true });
  });
});

describe("assertWorklistItemAllowsWorkflowAction", () => {
  it("is a no-op (backend governs lifecycle)", () => {
    expect(() => assertWorklistItemAllowsWorkflowAction("complete", "PLACED")).not.toThrow();
  });
});

describe("worklistItemWorkflowActionPath", () => {
  it("uses existing order item workflow endpoints", () => {
    expect(worklistItemWorkflowActionPath("acknowledge", "x")).toMatch(
      /^\/orders\/items\/x\/(acknowledge|start|complete)$/
    );
  });
});
