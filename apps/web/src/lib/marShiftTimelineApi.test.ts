import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { fetchMarShiftTimeline } from "./marShiftTimelineApi";

const apiClientPath = join(import.meta.dirname, "apiClient.ts");

vi.mock("@/lib/apiClient", () => ({
  apiFetch: vi.fn(),
}));

describe("marShiftTimelineApi (M1.8B.7K.2)", () => {
  beforeEach(async () => {
    const { apiFetch } = await import("@/lib/apiClient");
    vi.mocked(apiFetch).mockReset();
  });

  it("builds correct /facilities/:facilityId/mar-shift-timeline URL", async () => {
    const { apiFetch } = await import("@/lib/apiClient");
    vi.mocked(apiFetch).mockResolvedValue({
      enabled: true,
      facility: { id: "fac-1", name: "St. Mary Hospital" },
      title: "St. Mary Hospital Shift Timeline",
      viewer: { userId: "u1", displayName: "Jessica RN", role: "RN" },
      shift: { code: "7A_7P", label: "7A–7P", startAt: "", endAt: "", columns: [] },
      rows: [],
    });

    await fetchMarShiftTimeline({
      facilityId: "fac-1",
      shiftCode: "7A_7P",
      encounterId: "enc-1",
      assignedToUserId: "nurse-1",
      includeCompleted: true,
      includeUpcoming: false,
    });

    expect(apiFetch).toHaveBeenCalledWith(
      "/facilities/fac-1/mar-shift-timeline?shiftCode=7A_7P&encounterId=enc-1&assignedToUserId=nurse-1&includeCompleted=true&includeUpcoming=false",
      { facilityId: "fac-1" }
    );
  });

  it("api module documents mar-shift-timeline endpoint", () => {
    const source = readFileSync(join(import.meta.dirname, "marShiftTimelineApi.ts"), "utf8");
    expect(source).toContain("/mar-shift-timeline");
    expect(source).toContain("fetchMarShiftTimeline");
  });

  it("apiClient is used for facility-scoped fetch", () => {
    const apiSource = readFileSync(apiClientPath, "utf8");
    expect(apiSource).toContain("apiFetch");
  });
});
