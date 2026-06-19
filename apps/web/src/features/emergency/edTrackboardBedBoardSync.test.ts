import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const webRoot = join(import.meta.dirname, "../..");

function readSrc(relativePath: string): string {
  return readFileSync(join(webRoot, relativePath), "utf8");
}

describe("edTrackboardBedBoardSync (MEDUI.ED.BEDBOARD.ROOM_MUTATION.1)", () => {
  const trackboard = readSrc("features/emergency/EmergencyTrackboardView.tsx");
  const active = readSrc("features/emergency/EmergencyActiveWorkspaceView.tsx");
  const hospital = readSrc("features/hospitalization/HospitalizationBoardView.tsx");

  it("13 — trackboard tab uses shared rows state for My Patients room labels", () => {
    expect(trackboard).toContain('boardViewMode === "myPatients"');
    expect(trackboard).toContain("encounterListRows");
    expect(trackboard).toContain("formatEncounterGovernedRoomDisplay");
  });

  it("14 — bed board tab uses edBedBoard state updated on room save", () => {
    expect(trackboard).toContain('boardViewMode === "bedBoard"');
    expect(trackboard).toContain("setEdBedBoard");
    expect(trackboard).toContain("mergeBedBoardRoomUpdate");
  });

  it("15 — My Patients inherits room patch from shared rows array", () => {
    expect(trackboard).toContain("myPatientsSorted");
    expect(trackboard).toContain("applyTrackboardRoomMutationPatch");
  });

  it("trackboard and bed board share bedIndex derived from edBedBoard", () => {
    expect(trackboard).toContain("setBedIndex(indexBedBoardByKey");
    expect(trackboard).toContain("lookupBedStatusForEncounter");
  });

  it("active ED workspace dispatches room refresh for other mounted surfaces", () => {
    expect(active).toContain("dispatchEncounterRoomAssignmentRefresh");
  });

  it("trackboard listens for room assignment refresh events", () => {
    expect(trackboard).toContain("addEventListener(MEDORA_ENCOUNTER_ROOM_ASSIGNMENT_REFRESH");
  });

  it("hospital board syncs bed board on room and status mutations", () => {
    expect(hospital).toContain("handleBedStatusUpdated");
    expect(hospital).toContain("applyBedBoardStatusPatch");
    expect(hospital).toContain("rebuildFacilityBedBoardUnitsFromEncounters");
  });

  it("background silent refresh remains for server reconciliation", () => {
    expect(trackboard).toContain("void loadEncounters({ silent: true })");
    expect(trackboard).toContain("void refreshEdBedBoard()");
  });

  it("10-second polling is silent refresh only — not the primary mutation update path", () => {
    expect(trackboard).toContain("10000");
    expect(trackboard).toContain("applyTrackboardRoomMutationPatch");
    expect(trackboard).toContain("handleBedStatusUpdated");
  });

  it("facility scoping preserved on room refresh events", () => {
    expect(trackboard).toContain("detail.facilityId !== facilityId");
  });
});
