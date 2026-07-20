import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  ED_CANONICAL_WAITING_ROOM_LABEL,
  selectTreatmentBedAssignmentCandidates,
} from "@medora/shared";

const webSrcRoot = join(import.meta.dirname, "../..");

describe("Bed Board assign eligibility (waiting room)", () => {
  it("wires shared treatment-bed eligibility into EmergencyTrackboardView", () => {
    const trackboard = readFileSync(
      join(webSrcRoot, "features/emergency/EmergencyTrackboardView.tsx"),
      "utf8"
    );
    expect(trackboard).toContain("selectTreatmentBedAssignmentCandidates");
    expect(trackboard).not.toMatch(
      /unassignedEdCandidates[\s\S]{0,200}!\(row\.roomLabel \?\? ""\)\.trim\(\)/
    );
  });

  it("shows waiting-room encounter as assignable and excludes occupied ED room", () => {
    const rows = [
      {
        id: "enc-wait",
        status: "OPEN",
        facilityId: "fac-1",
        roomLabel: ED_CANONICAL_WAITING_ROOM_LABEL,
        type: "EMERGENCY",
        patient: { firstName: "A", lastName: "Wait" },
      },
      {
        id: "enc-room",
        status: "OPEN",
        facilityId: "fac-1",
        roomLabel: "3",
        type: "EMERGENCY",
        patient: { firstName: "B", lastName: "Room" },
      },
    ];
    const eligible = selectTreatmentBedAssignmentCandidates(rows, { facilityId: "fac-1" });
    expect(eligible.map((r) => r.id)).toEqual(["enc-wait"]);
  });

  it("picker distinguishes loading vs empty vs error testids", () => {
    const picker = readFileSync(
      join(webSrcRoot, "components/encounters/BedBoardAssignEncounterPicker.tsx"),
      "utf8"
    );
    expect(picker).toContain('data-testid="bed-board-assign-loading"');
    expect(picker).toContain('data-testid="bed-board-assign-empty"');
    expect(picker).toContain('data-testid="bed-board-assign-error"');
    expect(picker).toContain("loadState");
  });
});
