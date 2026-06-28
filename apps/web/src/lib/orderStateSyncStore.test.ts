import { describe, expect, it, beforeEach } from "vitest";
import {
  clearOrderItemPending,
  getOrderItemSnapshot,
  ingestServerOrderPayload,
  markOrderItemPending,
  mergeOrderPayload,
  mergeWorklistPayload,
  preventStaleOverwrite,
  resetOrderStateSyncStoreForTests,
  subscribeToOrderItem,
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

  it("mergeOrderPayload is side-effect free and does not notify subscribers", () => {
    upsertOrderItemPatch("line-loop", { status: "IN_PROGRESS" }, "post");
    let notifyCount = 0;
    subscribeToOrderItem(() => {
      notifyCount += 1;
    });
    const orders = [{ id: "o1", items: [{ id: "line-loop", status: "PLACED" }] }];
    for (let i = 0; i < 100; i += 1) {
      mergeOrderPayload(orders);
    }
    expect(notifyCount).toBe(0);
    expect(getOrderItemSnapshot("line-loop")?.status).toBe("IN_PROGRESS");
  });

  it("ingestServerOrderPayload reconciles store silently then merges", () => {
    upsertOrderItemPatch("line-bg", { status: "COMPLETED" }, "post");
    let notifyCount = 0;
    subscribeToOrderItem(() => {
      notifyCount += 1;
    });
    const payload = [
      {
        id: "order-1",
        items: [{ id: "line-bg", status: "ACKNOWLEDGED", updatedAt: "2026-06-01T10:00:00.000Z" }],
      },
    ];
    const merged = ingestServerOrderPayload(payload) as typeof payload;
    expect(merged[0]?.items[0]?.status).toBe("COMPLETED");
    expect(getOrderItemSnapshot("line-bg")?.status).toBe("COMPLETED");
    expect(notifyCount).toBe(0);
  });

  it("strips store-only metadata from item patches", () => {
    upsertOrderItemPatch("line-meta", { status: "ACKNOWLEDGED", idempotent: true as unknown as never }, "post");
    const merged = mergeOrderPayload([
      { id: "o1", items: [{ id: "line-meta", status: "PLACED" }] },
    ]) as Array<{ items: Array<Record<string, unknown>> }>;
    expect(merged[0]?.items[0]?.status).toBe("ACKNOWLEDGED");
    expect(merged[0]?.items[0]?.idempotent).toBeUndefined();
  });

  it("rapid optimistic upserts for same item coalesce listener notifications", async () => {
    let notifyCount = 0;
    subscribeToOrderItem(() => {
      notifyCount += 1;
    });
    for (let i = 0; i < 100; i += 1) {
      upsertOrderItemPatch("line-same", { status: "ACKNOWLEDGED" }, "optimistic");
    }
    await new Promise<void>((resolve) => queueMicrotask(resolve));
    expect(notifyCount).toBe(1);
  });
});
