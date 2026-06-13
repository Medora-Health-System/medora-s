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
    expect(active).toContain("EncounterGovernedRoomChip");
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

  it("room assignment API calls PATCH /encounters/:id/room", () => {
    const api = readSrc("lib/roomAssignmentApi.ts");
    expect(api).toContain("encounterRoomAssignmentPath");
    expect(api).toContain("/encounters/");
    expect(api).toContain("/room");
    expect(api).toContain('method: "PATCH"');
  });

  it("RoomAssignmentModal save calls updateEncounterRoomAssignment only", () => {
    const modal = readSrc("components/encounters/RoomAssignmentModal.tsx");
    expect(modal).toContain("updateEncounterRoomAssignment(facilityId, encounter.id, payload)");
    expect(modal).not.toContain("fetchFacilityBedBoard");
    expect(modal).not.toContain("updateFacilityBedStatus");
    expect(modal).toContain("traceRoomAssignmentSave");
  });

  it("RoomAssignmentModal sends full governed room payload fields", () => {
    const modal = readSrc("components/encounters/RoomAssignmentModal.tsx");
    expect(modal).toContain("confirmOccupiedRoomAssignment");
    expect(modal).toContain("roomOccupancyOverride");
    expect(modal).toContain("confirmBedStatusOverride");
    expect(modal).toContain("bedStatusOverrideReasonCode");
    expect(modal).toContain("bedStatusOverrideReasonText");
    expect(modal).toContain("reasonOther");
    expect(modal).toContain("unitCode: unit");
  });

  it("trackboard row click opens modal without stale bed-board prefill", () => {
    const trackboard = readSrc("features/emergency/EmergencyTrackboardView.tsx");
    expect(trackboard).toContain('setRoomAssignmentLaunch({ encounter })');
    expect(trackboard).toContain("prefillFromBedBoard={Boolean(roomAssignmentLaunch.prefillFromBedBoard)}");
  });

  it("RoomAssignmentModal surfaces backend API errors", () => {
    const modal = readSrc("components/encounters/RoomAssignmentModal.tsx");
    expect(modal).toContain("extractRoomAssignmentSaveErrorMessage");
    expect(modal).toContain("updateEncounterRoomAssignment");
  });
});
