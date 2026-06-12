import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const webSrcRoot = join(import.meta.dirname, "../..");

function readSrc(relativePath: string): string {
  return readFileSync(join(webSrcRoot, relativePath), "utf8");
}

describe("room assignment governance (K.10B.10 web)", () => {
  it("ED trackboard wires clickable room badge and RoomAssignmentModal", () => {
    const trackboard = readSrc("features/emergency/EmergencyTrackboardView.tsx");
    expect(trackboard).toContain("RoomAssignmentModal");
    expect(trackboard).toContain("onRoomClick");
    expect(trackboard).toContain("formatEncounterGovernedRoomDisplay");
    expect(trackboard).toContain("roomAssignment.changeRoomTooltip");
  });

  it("hospital/observation board uses governed room display and modal", () => {
    const board = readSrc("features/hospitalization/HospitalizationBoardView.tsx");
    expect(board).toContain("RoomAssignmentModal");
    expect(board).toContain("formatEncounterGovernedRoomDisplay");
    expect(board).toContain("onRoomClick");
  });

  it("active ED workspace opens room assignment modal from room chip", () => {
    const active = readSrc("features/emergency/EmergencyActiveWorkspaceView.tsx");
    expect(active).toContain("RoomAssignmentModal");
    expect(active).toContain("setShowRoomAssignmentModal");
    expect(active).toContain("formatEncounterGovernedRoomDisplay");
  });

  it("MAR shift timeline shows governed room display on patient row", () => {
    const timeline = readSrc("components/encounters/FacilityMarShiftTimeline.tsx");
    expect(timeline).toContain("governedRoomDisplay");
    expect(timeline).toContain("roomAssignment.noRoomAssigned");
  });

  it("MAR drawer shows governed room label", () => {
    const drawer = readSrc("components/encounters/FacilityMarShiftTimelineDrawer.tsx");
    expect(drawer).toContain("governedRoomDisplay");
    expect(drawer).toContain("roomAssignment.noRoomAssigned");
  });
});
