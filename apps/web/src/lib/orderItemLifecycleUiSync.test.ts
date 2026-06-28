import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  applyOrderItemLifecyclePatch,
  createOrderLifecycleMutationHandlers,
  getOptimisticOrderItemStatusForAction,
  invalidateOrderDataCachesAfterLifecycleMutation,
  mergeUpdatedOrderItemIntoOrderCollections,
  normalizeOrderLifecycleMutationResponse,
  runOrderItemLifecycleUiMutation,
} from "./orderItemLifecycleUiSync";
import { resetOrderStateSyncStoreForTests } from "./orderStateSyncStore";
import { invalidateGetRequestDedupeForPath, resetGetRequestDedupeForTests } from "./getRequestDedupe";

vi.mock("./getRequestDedupe", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./getRequestDedupe")>();
  return {
    ...actual,
    invalidateGetRequestDedupeForPath: vi.fn(),
  };
});

describe("orderItemLifecycleUiSync", () => {
  beforeEach(() => {
    resetGetRequestDedupeForTests();
    resetOrderStateSyncStoreForTests();
    vi.mocked(invalidateGetRequestDedupeForPath).mockClear();
  });

  it("computes optimistic statuses", () => {
    expect(getOptimisticOrderItemStatusForAction("acknowledge")).toBe("ACKNOWLEDGED");
    expect(getOptimisticOrderItemStatusForAction("start")).toBe("IN_PROGRESS");
    expect(getOptimisticOrderItemStatusForAction("complete")).toBe("COMPLETED");
  });

  it("normalizes lifecycle POST body with idempotent flag", () => {
    const normalized = normalizeOrderLifecycleMutationResponse("complete", "line-1", {
      status: "COMPLETED",
      idempotent: true,
    });
    expect(normalized.status).toBe("COMPLETED");
    expect(normalized.idempotent).toBe(true);
  });

  it("merges item patch without mutating unrelated orders or oxygen metadata", () => {
    const orders = [
      {
        id: "order-a",
        items: [
          {
            id: "line-1",
            status: "PLACED",
            manualLabel: "Oxygen Therapy — Nasal cannula 2 L/min STAT",
            notes: "[O2_PARAMS:{\"deliveryDevice\":\"nasal_cannula\"}]",
            enterpriseProcedureId: "oxygen_therapy",
          },
        ],
      },
      {
        id: "order-b",
        items: [{ id: "line-2", status: "PLACED" }],
      },
    ];
    const next = mergeUpdatedOrderItemIntoOrderCollections(orders, "line-1", {
      status: "ACKNOWLEDGED",
    }) as typeof orders;
    expect(next[0]?.items[0]?.status).toBe("ACKNOWLEDGED");
    expect((next[0]?.items[0] as { manualLabel?: string }).manualLabel).toContain("Oxygen Therapy");
    expect((next[0]?.items[0] as { notes?: string }).notes).toContain("[O2_PARAMS:");
    expect(next[1]?.items[0]?.status).toBe("PLACED");
  });

  it("applyOrderItemLifecyclePatch updates only target line", () => {
    const order = {
      items: [
        { id: "line-1", status: "ACKNOWLEDGED" },
        { id: "line-2", status: "IN_PROGRESS" },
      ],
    };
    const patched = applyOrderItemLifecyclePatch(order, "line-2", "COMPLETED") as typeof order;
    expect(patched.items[0]?.status).toBe("ACKNOWLEDGED");
    expect(patched.items[1]?.status).toBe("COMPLETED");
  });

  it("invalidates mutable order GET caches", () => {
    invalidateOrderDataCachesAfterLifecycleMutation("fac-1", {
      encounterId: "enc-1",
      orderId: "order-1",
      worklists: ["lab", "radiology"],
    });
    expect(invalidateGetRequestDedupeForPath).toHaveBeenCalledWith(
      "/encounters/enc-1/orders",
      "fac-1"
    );
    expect(invalidateGetRequestDedupeForPath).toHaveBeenCalledWith(
      "/worklists/lab",
      "fac-1"
    );
  });

  it("runs optimistic patch before mutate via unified store handlers", async () => {
    let collection: unknown = { items: [{ id: "line-1", status: "PLACED" }] };
    const handlers = createOrderLifecycleMutationHandlers({
      itemId: "line-1",
      action: "acknowledge",
      collectionKind: "orders",
      applyCollection: (transform) => {
        collection = transform(collection);
      },
    });
    const statuses: string[] = [];
    const originalApply = handlers.applyOptimistic;
    handlers.applyOptimistic = (nextStatus) => {
      statuses.push(nextStatus);
      originalApply(nextStatus);
    };
    await runOrderItemLifecycleUiMutation({
      action: "acknowledge",
      itemId: "line-1",
      facilityId: "fac-1",
      currentStatus: "PLACED",
      mutate: async () => ({
        nextStatus: "ACKNOWLEDGED",
        idempotent: false,
        queued: false,
        responseBody: { status: "ACKNOWLEDGED" },
      }),
      handlers,
    });
    expect(statuses[0]).toBe("ACKNOWLEDGED");
    expect((collection as { items: Array<{ status: string }> }).items[0]?.status).toBe("ACKNOWLEDGED");
  });

  it("rolls back store state on failure", async () => {
    let collection: unknown = { items: [{ id: "line-1", status: "PLACED" }] };
    await expect(
      runOrderItemLifecycleUiMutation({
        action: "acknowledge",
        itemId: "line-1",
        facilityId: "fac-1",
        currentStatus: "PLACED",
        mutate: async () => {
          throw new Error("network");
        },
        handlers: createOrderLifecycleMutationHandlers({
          itemId: "line-1",
          action: "acknowledge",
          collectionKind: "orders",
          applyCollection: (transform) => {
            collection = transform(collection);
          },
        }),
      })
    ).rejects.toThrow("network");
    expect((collection as { items: Array<{ status: string }> }).items[0]?.status).toBe("PLACED");
  });
});
