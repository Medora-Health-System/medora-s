import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const webSrcRoot = join(import.meta.dirname, "../..");

function readSrc(relativePath: string): string {
  return readFileSync(join(webSrcRoot, relativePath), "utf8");
}

describe("room assignment header parity (K.10B.10A)", () => {
  const chip = readSrc("components/encounters/EncounterGovernedRoomChip.tsx");
  const chart = readSrc("features/emergency/EmergencyChartView.tsx");
  const encounterPage = readFileSync(
    join(import.meta.dirname, "../../../app/app/encounters/[id]/page.tsx"),
    "utf8"
  );
  const active = readSrc("features/emergency/EmergencyActiveWorkspaceView.tsx");

  it("shared chip uses governedRoomDisplay as single source of truth", () => {
    expect(chip).toContain("formatEncounterGovernedRoomDisplay");
    expect(chip).not.toContain("ED-");
    expect(chip).not.toContain("ICU-");
  });

  it("chip supports keyboard accessibility and tooltip i18n", () => {
    expect(chip).toContain('type="button"');
    expect(chip).toContain('e.key === "Enter"');
    expect(chip).toContain('e.key === " "');
    expect(chip).toContain("roomAssignment.changeRoomTooltip");
  });

  it("chip read-only mode has no pointer cursor or button handler", () => {
    expect(chip).toContain("interactive = clickable && Boolean(onClick)");
    expect(chip).toContain("cursor: \"pointer\"");
  });

  it("EmergencyChartView uses governed chip and RoomAssignmentModal", () => {
    expect(chart).toContain("EncounterGovernedRoomChip");
    expect(chart).toContain("RoomAssignmentModal");
    expect(chart).toContain("canAssignEncounterRoom");
    expect(chart).toContain("setShowRoomAssignmentModal");
    expect(chart).toContain("setEncounter");
    expect(chart).not.toContain("encounter.roomLabel?.trim()");
  });

  it("encounter detail header uses governed display and modal", () => {
    expect(encounterPage).toContain("EncounterGovernedRoomChip");
    expect(encounterPage).toContain("EncounterGovernedRoomInline");
    expect(encounterPage).toContain("RoomAssignmentModal");
    expect(encounterPage).toContain("canAssignEncounterRoom");
    expect(encounterPage).toContain("setShowRoomAssignmentModal");
    expect(encounterPage).not.toContain("encounter.roomLabel?.trim() || t(\"common.dash\")");
  });

  it("active ED workspace header remains on governed chip path", () => {
    expect(active).toContain("EncounterGovernedRoomChip");
    expect(active).toContain("RoomAssignmentModal");
    expect(active).toContain("canAssignEncounterRoom");
  });
});
