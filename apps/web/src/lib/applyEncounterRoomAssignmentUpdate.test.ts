import { describe, expect, it } from "vitest";
import { applyEncounterRoomAssignmentUpdate } from "./applyEncounterRoomAssignmentUpdate";

describe("applyEncounterRoomAssignmentUpdate", () => {
  it("merges roomLabel and governed display fields without replacing encounter", () => {
    const encounter = {
      id: "enc-1",
      roomLabel: "1",
      type: "EMERGENCY",
      patient: { firstName: "Jean" },
      governedRoomDisplay: "ED-1",
      governedRoomUnit: null as string | null,
      governedRoomHasAssignment: false,
    };
    const next = applyEncounterRoomAssignmentUpdate(encounter, {
      id: "enc-1",
      roomLabel: "5",
      governedRoomDisplay: "ED-5",
      governedRoomUnit: "ED",
      governedRoomHasAssignment: true,
    });
    expect(next.roomLabel).toBe("5");
    expect(next.governedRoomDisplay).toBe("ED-5");
    expect(next.governedRoomUnit).toBe("ED");
    expect(next.governedRoomHasAssignment).toBe(true);
    expect(next.patient).toEqual({ firstName: "Jean" });
  });

  it("preserves roomLabel when response omits it", () => {
    const encounter = {
      id: "enc-1",
      roomLabel: "MS-2",
      governedRoomDisplay: "MS-2",
      governedRoomHasAssignment: true,
    };
    const next = applyEncounterRoomAssignmentUpdate(encounter, {
      id: "enc-1",
      governedRoomDisplay: "MS-3",
    });
    expect(next.roomLabel).toBe("MS-2");
    expect(next.governedRoomDisplay).toBe("MS-3");
  });

  it("clears room when API returns null roomLabel", () => {
    const encounter = {
      id: "enc-1",
      roomLabel: "2",
      governedRoomDisplay: "ED-2",
      governedRoomHasAssignment: true,
    };
    const next = applyEncounterRoomAssignmentUpdate(encounter, {
      id: "enc-1",
      roomLabel: null,
      governedRoomDisplay: null,
      governedRoomHasAssignment: false,
    });
    expect(next.roomLabel).toBeNull();
    expect(next.governedRoomDisplay).toBeNull();
    expect(next.governedRoomHasAssignment).toBe(false);
  });
});
