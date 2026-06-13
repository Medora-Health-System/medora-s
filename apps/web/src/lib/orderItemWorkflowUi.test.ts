import { describe, expect, it } from "vitest";
import {
  isOrderItemAnyWorkflowPending,
  isOrderItemWorkflowPending,
  nextOrderItemStatusAfterWorkflowAction,
  orderItemWorkflowPendingKey,
  patchOrderItemStatusInOrdersRaw,
  patchOrderItemStatusInWorklistQueue,
} from "./orderItemWorkflowUi";

describe("orderItemWorkflowUi", () => {
  it("builds per-item action pending keys", () => {
    expect(orderItemWorkflowPendingKey("line-1", "acknowledge")).toBe("line-1:acknowledge");
  });

  it("maps workflow actions to next statuses", () => {
    expect(nextOrderItemStatusAfterWorkflowAction("acknowledge")).toBe("ACKNOWLEDGED");
    expect(nextOrderItemStatusAfterWorkflowAction("start")).toBe("IN_PROGRESS");
    expect(nextOrderItemStatusAfterWorkflowAction("complete")).toBe("COMPLETED");
  });

  it("detects pending state for the same item/action only", () => {
    expect(isOrderItemWorkflowPending("line-1:acknowledge", "line-1", "acknowledge")).toBe(true);
    expect(isOrderItemWorkflowPending("line-1:acknowledge", "line-1", "start")).toBe(false);
    expect(isOrderItemAnyWorkflowPending("line-1:acknowledge", "line-1")).toBe(true);
    expect(isOrderItemAnyWorkflowPending("line-1:acknowledge", "line-2")).toBe(false);
  });

  it("optimistically patches order item status in encounter orders", () => {
    const orders = [
      {
        id: "order-1",
        items: [
          { id: "line-1", status: "PLACED" },
          { id: "line-2", status: "ACKNOWLEDGED" },
        ],
      },
    ];
    const next = patchOrderItemStatusInOrdersRaw(orders, "line-1", "ACKNOWLEDGED");
    expect((next?.[0] as { items: Array<{ id: string; status: string }> }).items[0].status).toBe(
      "ACKNOWLEDGED"
    );
    expect((next?.[0] as { items: Array<{ id: string; status: string }> }).items[1].status).toBe(
      "ACKNOWLEDGED"
    );
  });

  it("optimistically patches worklist queue rows", () => {
    const queue = [
      {
        id: "order-1",
        items: [{ id: "line-1", status: "ACKNOWLEDGED" }],
      },
    ];
    const next = patchOrderItemStatusInWorklistQueue(queue, "line-1", "IN_PROGRESS");
    expect((next[0] as { items: Array<{ status: string }> }).items[0].status).toBe("IN_PROGRESS");
  });
});
