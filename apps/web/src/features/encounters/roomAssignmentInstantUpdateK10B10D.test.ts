import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { applyEncounterRoomAssignmentUpdate } from "@/lib/applyEncounterRoomAssignmentUpdate";

const webSrcRoot = join(import.meta.dirname, "../..");

function readSrc(relativePath: string): string {
  return readFileSync(join(webSrcRoot, relativePath), "utf8");
}

describe("room assignment instant UI update (K.10B.10D hotfix)", () => {
  it("RoomAssignmentModal calls onSaved with API response before closing", () => {
    const modal = readSrc("components/encounters/RoomAssignmentModal.tsx");
    expect(modal).toContain("const res = await updateEncounterRoomAssignment");
    expect(modal).toContain("await onSaved(res)");
    expect(modal).toContain("onClose()");
    expect(modal).not.toContain("window.location.reload");
    expect(modal).not.toContain("router.refresh");
  });

  it("applyEncounterRoomAssignmentUpdate merges governed room display immediately", () => {
    const next = applyEncounterRoomAssignmentUpdate(
      { id: "enc-1", roomLabel: "1", governedRoomDisplay: "ED-1" },
      {
        id: "enc-1",
        roomLabel: "4",
        governedRoomDisplay: "ED-4",
        governedRoomUnit: "ED",
        governedRoomHasAssignment: true,
      }
    );
    expect(next.governedRoomDisplay).toBe("ED-4");
    expect(next.roomLabel).toBe("4");
  });

  it("ED trackboard applies optimistic merge before background reload", () => {
    const trackboard = readSrc("features/emergency/EmergencyTrackboardView.tsx");
    expect(trackboard).toContain("applyEncounterRoomAssignmentUpdate");
    expect(trackboard).toContain("void loadEncounters({ silent: true })");
    expect(trackboard).toContain("void refreshEdBedBoard()");
    expect(trackboard).not.toContain("await Promise.all([loadEncounters");
    expect(trackboard).not.toContain("window.location.reload");
  });

  it("hospital board updates governed room display on row immediately", () => {
    const board = readSrc("features/hospitalization/HospitalizationBoardView.tsx");
    expect(board).toContain("applyEncounterRoomAssignmentUpdate");
    expect(board).toContain("governedRoomDisplay: encounter.governedRoomDisplay");
    expect(board).toContain("void loadEncounters({ silent: true })");
    expect(board).not.toContain("await Promise.all([loadEncounters");
  });

  it("encounter header uses cached governedRoomDisplay when present", () => {
    const display = readSrc("lib/governedRoomDisplay.ts");
    expect(display).toContain("encounter.governedRoomDisplay?.trim()");
    const page = readSrc("../app/app/encounters/[id]/page.tsx");
    expect(page).toContain("applyEncounterRoomAssignmentUpdate");
    expect(page).toContain("governedRoomDisplay: encounter.governedRoomDisplay");
    expect(page).toContain("void loadEncounter({ silent: true })");
  });

  it("active ED workspace and chart apply room patch to local encounter state", () => {
    const active = readSrc("features/emergency/EmergencyActiveWorkspaceView.tsx");
    const chart = readSrc("features/emergency/EmergencyChartView.tsx");
    expect(active).toContain("applyEncounterRoomAssignmentUpdate(prev, patch)");
    expect(chart).toContain("applyEncounterRoomAssignmentUpdate(prev, patch)");
    expect(active).toContain("dispatchEncounterRoomAssignmentRefresh");
  });

  it("stale bed board prefill clears when launch closes after save", () => {
    const trackboard = readSrc("features/emergency/EmergencyTrackboardView.tsx");
    expect(trackboard).toContain("setRoomAssignmentLaunch(null)");
    expect(trackboard).toContain("prefillFromBedBoard={Boolean(roomAssignmentLaunch.prefillFromBedBoard)}");
  });

  it("MAR timeline listens for room assignment refresh event", () => {
    const mar = readSrc("components/encounters/MedicationAdministrationTab.tsx");
    expect(mar).toContain("MEDORA_ENCOUNTER_ROOM_ASSIGNMENT_REFRESH");
    expect(mar).toContain("timelineRefreshRef.current?.()");
  });
});
