import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("ROOMS.ED.1 — ED trackboard room sorting wiring", () => {
  const trackboardSource = readFileSync(
    join(import.meta.dirname, "EmergencyTrackboardView.tsx"),
    "utf8"
  );

  it("trackboard sorts filtered encounters with sortRowsByRoomLabel", () => {
    expect(trackboardSource).toContain("sortRowsByRoomLabel");
    expect(trackboardSource).toContain("sortedFiltered");
    expect(trackboardSource).toMatch(/encounterListRows\.map\(/);
  });
});

describe("ROOMS.ED.1 — occupied room assignment wiring", () => {
  const trackboardSource = readFileSync(
    join(import.meta.dirname, "EmergencyTrackboardView.tsx"),
    "utf8"
  );
  const operationalSource = readFileSync(
    join(import.meta.dirname, "..", "..", "components/encounters/EncounterOperationalPanel.tsx"),
    "utf8"
  );
  const triageSource = readFileSync(join(import.meta.dirname, "EmergencyTriageIntakeView.tsx"), "utf8");

  it("operational panel checks room occupancy before save and handles API 409", () => {
    expect(operationalSource).toContain("checkEdRoomAssignmentConflict");
    expect(operationalSource).toContain("parseEdRoomOccupiedApiError");
    expect(operationalSource).toContain("buildEdRoomOccupancyConfirmPayload");
    expect(operationalSource).toContain("EdRoomOccupancyConfirmModal");
    expect(operationalSource).toContain("confirmOccupiedRoomAssignment");
  });

  it("trackboard uses governed room display (K.10B.10)", () => {
    expect(trackboardSource).toContain("formatEncounterGovernedRoomDisplay");
    expect(trackboardSource).toContain("RoomAssignmentModal");
  });

  it("ED triage intake checks room occupancy before create and handles API 409", () => {
    expect(triageSource).toContain("checkEdRoomAssignmentConflict");
    expect(triageSource).toContain("parseEdRoomOccupiedApiError");
    expect(triageSource).toContain("buildEdRoomOccupancyConfirmPayload");
    expect(triageSource).toContain("formatEncounterRoomDisplay");
    expect(triageSource).toContain("EdRoomOccupancyConfirmModal");
    expect(triageSource).toContain("startEmergencyEncounter");
  });
});
