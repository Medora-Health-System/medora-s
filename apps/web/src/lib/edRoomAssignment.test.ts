import { describe, expect, it, vi, beforeEach } from "vitest";
import { checkEdRoomAssignmentConflict, isSameNormalizedRoom } from "@/lib/edRoomAssignment";

vi.mock("@/lib/clinicalWorklistApi", () => ({
  fetchOpenEncounters: vi.fn(),
}));

import { fetchOpenEncounters } from "@/lib/clinicalWorklistApi";

describe("edRoomAssignment — web conflict helper", () => {
  beforeEach(() => {
    vi.mocked(fetchOpenEncounters).mockReset();
  });

  it("returns conflict from open encounters in the same facility", async () => {
    vi.mocked(fetchOpenEncounters).mockResolvedValue([
      { id: "enc-1", facilityId: "fac-a", roomLabel: "4", status: "OPEN" },
    ]);
    const conflict = await checkEdRoomAssignmentConflict("fac-a", "4", "enc-2");
    expect(conflict?.requestedRoom).toBe("4");
    expect(conflict?.suggestedRoom).toBe("4A");
  });

  it("treats unchanged normalized room as same assignment", () => {
    expect(isSameNormalizedRoom("4", "4")).toBe(true);
    expect(isSameNormalizedRoom("4a", "4A")).toBe(true);
    expect(isSameNormalizedRoom("4", "5")).toBe(false);
  });
});
