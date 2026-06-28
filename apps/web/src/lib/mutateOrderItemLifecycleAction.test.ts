import { describe, expect, it, vi } from "vitest";
import {
  mutateOrderItemLifecycleAction,
  orderItemLifecycleActionPath,
  orderItemLifecycleIdempotentToastKey,
} from "./mutateOrderItemLifecycleAction";

vi.mock("@/lib/apiClient", () => ({
  apiFetch: vi.fn(),
}));

import { apiFetch } from "@/lib/apiClient";

describe("mutateOrderItemLifecycleAction", () => {
  it("posts to acknowledge/start/complete endpoints", async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce({ status: "ACKNOWLEDGED" });
    const result = await mutateOrderItemLifecycleAction("acknowledge", "line-1", "fac-1");
    expect(apiFetch).toHaveBeenCalledWith("/orders/items/line-1/acknowledge", {
      method: "POST",
      facilityId: "fac-1",
    });
    expect(result.nextStatus).toBe("ACKNOWLEDGED");
    expect(result.idempotent).toBe(false);
  });

  it("treats idempotent backend flag as safe success with current status", async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce({ status: "COMPLETED", idempotent: true });
    const result = await mutateOrderItemLifecycleAction("complete", "line-2", "fac-1");
    expect(result.idempotent).toBe(true);
    expect(result.nextStatus).toBe("COMPLETED");
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
