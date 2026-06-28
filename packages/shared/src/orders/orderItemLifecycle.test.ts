import { describe, expect, it } from "vitest";
import {
  isIdempotentLifecycleAction,
  orderItemAllowsComplete,
  orderItemAllowsStart,
  orderItemNeedsAcknowledge,
  orderItemStatusProgressRank,
  orderItemStatusWouldRegress,
  resolveOrderItemWorkflowAction,
} from "./orderItemLifecycle.js";

describe("MEDUI.ORDERS.UNIFIED_ORDER_ACTION_LIFECYCLE_FIX.1 — orderItemLifecycle", () => {
  it("resolves workflow actions from status", () => {
    expect(resolveOrderItemWorkflowAction("PLACED")).toBe("acknowledge");
    expect(resolveOrderItemWorkflowAction("SIGNED")).toBe("acknowledge");
    expect(resolveOrderItemWorkflowAction("ACKNOWLEDGED")).toBe("start");
    expect(resolveOrderItemWorkflowAction("IN_PROGRESS")).toBe("complete");
    expect(resolveOrderItemWorkflowAction("COMPLETED")).toBeNull();
  });

  it("detects idempotent lifecycle repeats", () => {
    expect(isIdempotentLifecycleAction("acknowledge", "ACKNOWLEDGED")).toBe(true);
    expect(isIdempotentLifecycleAction("acknowledge", "IN_PROGRESS")).toBe(true);
    expect(isIdempotentLifecycleAction("start", "IN_PROGRESS")).toBe(true);
    expect(isIdempotentLifecycleAction("complete", "COMPLETED")).toBe(true);
    expect(isIdempotentLifecycleAction("acknowledge", "PLACED")).toBe(false);
  });

  it("aligns button visibility helpers with workflow resolution", () => {
    expect(orderItemNeedsAcknowledge("PENDING")).toBe(true);
    expect(orderItemAllowsStart("ACKNOWLEDGED")).toBe(true);
    expect(orderItemAllowsComplete("IN_PROGRESS")).toBe(true);
  });

  it("ranks lifecycle status monotonically for reconciliation", () => {
    expect(orderItemStatusProgressRank("PLACED")).toBeLessThan(orderItemStatusProgressRank("ACKNOWLEDGED"));
    expect(orderItemStatusProgressRank("ACKNOWLEDGED")).toBeLessThan(orderItemStatusProgressRank("IN_PROGRESS"));
    expect(orderItemStatusProgressRank("IN_PROGRESS")).toBeLessThan(orderItemStatusProgressRank("COMPLETED"));
    expect(orderItemStatusWouldRegress("COMPLETED", "ACKNOWLEDGED")).toBe(true);
    expect(orderItemStatusWouldRegress("ACKNOWLEDGED", "COMPLETED")).toBe(false);
  });
});
