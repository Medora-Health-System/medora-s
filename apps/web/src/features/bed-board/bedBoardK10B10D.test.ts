import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const webSrcRoot = join(import.meta.dirname, "../..");

function readSrc(relativePath: string): string {
  return readFileSync(join(webSrcRoot, relativePath), "utf8");
}

describe("Interactive bed board integration (K.10B.10D)", () => {
  it("EmergencyTrackboardView adds trackboard / bed board toggle", () => {
    const trackboard = readSrc("features/emergency/EmergencyTrackboardView.tsx");
    expect(trackboard).toContain('data-testid="emergency-trackboard-view-toggle"');
    expect(trackboard).toContain('boardViewMode === "bedBoard"');
    expect(trackboard).toContain("BedBoardUnitSection");
  });

  it("available bed opens RoomAssignmentModal with bed-board prefill only", () => {
    const trackboard = readSrc("features/emergency/EmergencyTrackboardView.tsx");
    expect(trackboard).toContain("BedBoardAssignEncounterPicker");
    expect(trackboard).toContain("prefillFromBedBoard");
    expect(trackboard).toContain("setRoomAssignmentLaunch");
    expect(trackboard).toContain("selectTreatmentBedAssignmentCandidates");
  });

  it("successful room save refreshes trackboard and bed board", () => {
    const trackboard = readSrc("features/emergency/EmergencyTrackboardView.tsx");
    expect(trackboard).toContain("applyEncounterRoomAssignmentUpdate");
    expect(trackboard).toContain("void loadEncounters({ silent: true })");
    expect(trackboard).toContain("void refreshEdBedBoard");
  });

  it("save room still uses encounter room PATCH — not bed-board API", () => {
    const modal = readSrc("components/encounters/RoomAssignmentModal.tsx");
    expect(modal).toContain("updateEncounterRoomAssignment");
    expect(modal).not.toContain("fetchFacilityBedBoard");
    expect(modal).not.toContain("updateFacilityBedStatus");
  });

  it("HospitalizationBoardView renders MS ICU OBS bed board sections", () => {
    const board = readSrc("features/hospitalization/HospitalizationBoardView.tsx");
    expect(board).toContain('data-testid="hospitalization-bed-board"');
    expect(board).toContain("BedBoardUnitSection");
    expect(board).toContain('"MS"');
    expect(board).toContain('"ICU"');
    expect(board).toContain('"OBS"');
  });

  it("hospital assignment refresh composes board without page reload", () => {
    const board = readSrc("features/hospitalization/HospitalizationBoardView.tsx");
    expect(board).toContain("applyEncounterRoomAssignmentUpdate");
    expect(board).toContain("void refreshFacilityBedBoard");
    expect(board).toContain("void loadEncounters({ silent: true })");
  });

  it("RoomAssignmentModal supports explicit bed-board prefill flag", () => {
    const modal = readSrc("components/encounters/RoomAssignmentModal.tsx");
    expect(modal).toContain("prefillFromBedBoard");
    expect(modal).toContain("extractEncounterRoomInput(encounter)");
  });

  it("bed status detail modal uses PATCH beds status — not room assignment", () => {
    const statusModal = readSrc("components/encounters/BedBoardStatusDetailModal.tsx");
    expect(statusModal).toContain("updateFacilityBedStatus");
    expect(statusModal).not.toContain("updateEncounterRoomAssignment");
  });

  it("ED and hospital boards wire bed status refresh after housekeeping save", () => {
    const trackboard = readSrc("features/emergency/EmergencyTrackboardView.tsx");
    const board = readSrc("features/hospitalization/HospitalizationBoardView.tsx");
    expect(trackboard).toContain("canManageBedStatus");
    expect(trackboard).toContain("onBedStatusUpdated");
    expect(trackboard).toContain("void refreshEdBedBoard");
    expect(board).toContain("canManageBedStatus");
    expect(board).toContain("void refreshFacilityBedBoard");
  });

  it("bed board views expose client-side status filters (K.10B.10E)", () => {
    const trackboard = readSrc("features/emergency/EmergencyTrackboardView.tsx");
    const board = readSrc("features/hospitalization/HospitalizationBoardView.tsx");
    expect(trackboard).toContain("BedBoardStatusFilterBar");
    expect(trackboard).toContain("bedBoardStatusFilter");
    expect(board).toContain("BedBoardStatusFilterBar");
    expect(board).toContain("statusFilter={bedBoardStatusFilter}");
  });

  it("status detail modal opens from any bed via grid (K.10B.10E)", () => {
    const grid = readSrc("components/encounters/BedBoardGrid.tsx");
    expect(grid).toContain("setStatusDetailBed(bed)");
    expect(grid).not.toContain("router.push");
  });
});
