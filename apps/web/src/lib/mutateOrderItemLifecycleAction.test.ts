import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  mutateOrderItemLifecycleAction,
  orderItemLifecycleActionPath,
  orderItemLifecycleIdempotentToastKey,
} from "./mutateOrderItemLifecycleAction";
import { invalidateGetRequestDedupeForPath, resetGetRequestDedupeForTests } from "./getRequestDedupe";

vi.mock("@/lib/apiClient", () => ({
  apiFetch: vi.fn(),
}));

vi.mock("./getRequestDedupe", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./getRequestDedupe")>();
  return {
    ...actual,
    invalidateGetRequestDedupeForPath: vi.fn(),
  };
});

import { apiFetch } from "@/lib/apiClient";

describe("mutateOrderItemLifecycleAction", () => {
  beforeEach(() => {
    resetGetRequestDedupeForTests();
    vi.mocked(invalidateGetRequestDedupeForPath).mockClear();
  });

  it("posts to acknowledge/start/complete endpoints", async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce({ status: "ACKNOWLEDGED" });
    const result = await mutateOrderItemLifecycleAction("acknowledge", "line-1", "fac-1");
    expect(apiFetch).toHaveBeenCalledWith("/orders/items/line-1/acknowledge", {
      method: "POST",
      facilityId: "fac-1",
    });
    expect(result.nextStatus).toBe("ACKNOWLEDGED");
    expect(result.idempotent).toBe(false);
    expect(result.itemPatch.status).toBe("ACKNOWLEDGED");
  });

  it("treats idempotent backend flag as safe success with current status", async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce({ status: "COMPLETED", idempotent: true });
    const result = await mutateOrderItemLifecycleAction("complete", "line-2", "fac-1");
    expect(result.idempotent).toBe(true);
    expect(result.nextStatus).toBe("COMPLETED");
  });

  it("invalidates mutable GET caches when cacheScope provided", async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce({ status: "IN_PROGRESS" });
    await mutateOrderItemLifecycleAction("start", "line-3", "fac-1", {
      cacheScope: { encounterId: "enc-1", worklists: ["lab"] },
    });
    expect(invalidateGetRequestDedupeForPath).toHaveBeenCalledWith(
      "/encounters/enc-1/orders",
      "fac-1"
    );
    expect(invalidateGetRequestDedupeForPath).toHaveBeenCalledWith("/worklists/lab", "fac-1");
  });

  it("maps idempotent toast keys per action", () => {
    expect(orderItemLifecycleIdempotentToastKey("complete")).toBe("orderLifecycle.alreadyCompleted");
  });
});

describe("orderItemLifecycleActionPath", () => {
  it("builds existing order item workflow paths", () => {
    expect(orderItemLifecycleActionPath("start", "x")).toBe("/orders/items/x/start");
  });
});
