import { describe, expect, it, beforeEach } from "vitest";
import {
  clearOrderItemPending,
  getOrderItemSnapshot,
  markOrderItemPending,
  mergeOrderPayload,
  mergeWorklistPayload,
  preventStaleOverwrite,
  resetOrderStateSyncStoreForTests,
  upsertOrderItemPatch,
} from "./orderStateSyncStore";

describe("MEDUI.ORDERS.UNIFIED_ORDER_STATE_SYNCHRONIZATION_CERTIFICATION.1 — orderStateSyncStore", () => {
  beforeEach(() => {
    resetOrderStateSyncStoreForTests();
  });

  it("applies optimistic patch immediately", () => {
    markOrderItemPending("line-1", "acknowledge");
    upsertOrderItemPatch("line-1", { status: "ACKNOWLEDGED" }, "optimistic", {
      pendingAction: "acknowledge",
    });
    const snap = getOrderItemSnapshot("line-1");
    expect(snap?.status).toBe("ACKNOWLEDGED");
    expect(snap?.pendingAction).toBe("acknowledge");
  });

  it("reconciles POST result over optimistic patch", () => {
    upsertOrderItemPatch("line-1", { status: "ACKNOWLEDGED" }, "optimistic");
    upsertOrderItemPatch(
      "line-1",
      { status: "ACKNOWLEDGED", lifecycleState: "ACKNOWLEDGED", updatedAt: "2026-06-01T12:00:00.000Z" },
      "post"
    );
    clearOrderItemPending("line-1");
    const snap = getOrderItemSnapshot("line-1");
    expect(snap?.source).toBe("post");
    expect(snap?.lifecycleState).toBe("ACKNOWLEDGED");
    expect(snap?.pendingAction).toBeNull();
  });

  it("prevents stale background GET from regressing completed to acknowledged", () => {
    upsertOrderItemPatch("line-1", { status: "COMPLETED" }, "post");
    const snap = getOrderItemSnapshot("line-1")!;
    expect(
      preventStaleOverwrite(snap, {
        status: "ACKNOWLEDGED",
        updatedAtMs: Date.parse("2026-06-01T11:00:00.000Z"),
      })
    ).toBe(true);
    const ignored = upsertOrderItemPatch(
      "line-1",
      { status: "ACKNOWLEDGED", updatedAt: "2026-06-01T11:00:00.000Z" },
      "background"
    );
    expect(ignored).toBeNull();
    expect(getOrderItemSnapshot("line-1")?.status).toBe("COMPLETED");
  });

  it("mergeOrderPayload applies store without affecting unrelated items", () => {
    upsertOrderItemPatch("line-1", { status: "IN_PROGRESS" }, "post");
    const orders = [
      {
        id: "order-a",
        items: [
          {
            id: "line-1",
            status: "PLACED",
            manualLabel: "Oxygen Therapy — Nasal cannula 2 L/min STAT",
            notes: "[O2_PARAMS:{\"deliveryDevice\":\"nasal_cannula\"}]",
          },
          { id: "line-2", status: "PLACED" },
        ],
      },
    ];
    const merged = mergeOrderPayload(orders) as typeof orders;
    expect(merged[0]?.items[0]?.status).toBe("IN_PROGRESS");
    expect((merged[0]?.items[0] as { manualLabel?: string }).manualLabel).toContain("Oxygen Therapy");
    expect((merged[0]?.items[0] as { notes?: string }).notes).toContain("[O2_PARAMS:");
    expect(merged[0]?.items[1]?.status).toBe("PLACED");
  });

  it("mergeWorklistPayload mirrors mergeOrderPayload for queue rows", () => {
    upsertOrderItemPatch("line-9", { status: "ACKNOWLEDGED" }, "optimistic");
    const queue = [{ id: "order-1", items: [{ id: "line-9", status: "PLACED" }] }];
    const merged = mergeWorklistPayload(queue) as typeof queue;
    expect(merged[0]?.items[0]?.status).toBe("ACKNOWLEDGED");
  });

  it("optimistic patch applies in under 100ms", () => {
    const start = performance.now();
    upsertOrderItemPatch("line-perf", { status: "ACKNOWLEDGED" }, "optimistic");
    mergeOrderPayload([{ id: "o1", items: [{ id: "line-perf", status: "PLACED" }] }]);
    expect(performance.now() - start).toBeLessThan(100);
  });
});
