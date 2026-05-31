import { describe, expect, it, vi } from "vitest";
import {
  assertWorklistItemAllowsWorkflowAction,
  postWorklistItemWorkflowAction,
} from "./worklistLabRadWorkflowApi";
import { worklistItemWorkflowActionPath } from "./worklistLabRadUi";

vi.mock("@/lib/apiClient", () => ({
  apiFetch: vi.fn(),
}));

import { apiFetch } from "@/lib/apiClient";

describe("postWorklistItemWorkflowAction", () => {
  it("calls POST /orders/items/:id/acknowledge for acknowledge", async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce({});
    await postWorklistItemWorkflowAction("acknowledge", "line-abc", "fac-1", "PLACED");
    expect(apiFetch).toHaveBeenCalledWith("/orders/items/line-abc/acknowledge", {
      method: "POST",
      facilityId: "fac-1",
    });
  });

  it("returns queued=true when API responds with queued flag", async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce({ queued: true });
    const result = await postWorklistItemWorkflowAction("start", "line-abc", "fac-1", "ACKNOWLEDGED");
    expect(result.queued).toBe(true);
  });

  it("blocks acknowledge when status is not eligible", async () => {
    await expect(
      postWorklistItemWorkflowAction("acknowledge", "line-abc", "fac-1", "ACKNOWLEDGED")
    ).rejects.toThrow(/blocked/i);
  });
});

describe("assertWorklistItemAllowsWorkflowAction", () => {
  it("allows complete only for IN_PROGRESS", () => {
    expect(() => assertWorklistItemAllowsWorkflowAction("complete", "IN_PROGRESS")).not.toThrow();
    expect(() => assertWorklistItemAllowsWorkflowAction("complete", "PLACED")).toThrow();
  });
});

describe("worklistItemWorkflowActionPath", () => {
  it("uses existing order item workflow endpoints", () => {
    expect(worklistItemWorkflowActionPath("acknowledge", "x")).toMatch(
      /^\/orders\/items\/x\/(acknowledge|start|complete)$/
    );
  });
});
