import { describe, expect, it } from "vitest";
import {
  canAssignEncounterRoom,
  formatEncounterGovernedRoomDisplay,
} from "./governedRoomDisplay";

describe("governedRoomDisplay (K.10B.10 web)", () => {
  const t = (key: string) => {
    const map: Record<string, string> = {
      "roomAssignment.noRoomAssigned": "No room assigned",
      "encounterRoom.waitingRoom": "Waiting room",
    };
    return map[key] ?? key;
  };

  it("formats ED room for dashboard row", () => {
    expect(
      formatEncounterGovernedRoomDisplay(
        { roomLabel: "4", type: "EMERGENCY" },
        t
      )
    ).toBe("ED-4");
  });

  it("formats observation/inpatient MS room", () => {
    expect(
      formatEncounterGovernedRoomDisplay(
        { roomLabel: "4", type: "INPATIENT" },
        t
      )
    ).toBe("MS-4");
  });

  it("formats ICU and OBS prefixed rooms", () => {
    expect(
      formatEncounterGovernedRoomDisplay(
        { roomLabel: "ICU-2", type: "INPATIENT", unitCode: "ICU" },
        t
      )
    ).toBe("ICU-2");
    expect(
      formatEncounterGovernedRoomDisplay(
        { roomLabel: "OBS-3", type: "INPATIENT", unitCode: "OBS" },
        t
      )
    ).toBe("OBS-3");
  });

  it("returns no room assigned when empty", () => {
    expect(formatEncounterGovernedRoomDisplay({ roomLabel: null, type: "EMERGENCY" }, t)).toBe(
      "No room assigned"
    );
  });

  it("canAssignEncounterRoom allows RN/PROVIDER/ADMIN only", () => {
    expect(canAssignEncounterRoom(["RN"])).toBe(true);
    expect(canAssignEncounterRoom(["PROVIDER"])).toBe(true);
    expect(canAssignEncounterRoom(["BILLING"])).toBe(false);
  });
});
