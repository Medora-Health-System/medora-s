import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { manualStatusBlockedByOccupancy } from "@medora/shared";

const webSrcRoot = join(import.meta.dirname, "..", "..");

function readSrc(relativePath: string): string {
  return readFileSync(join(webSrcRoot, relativePath), "utf8");
}

describe("BedBoardStatusDetailModal (K.10B.10E)", () => {
  const modal = readSrc("components/encounters/BedBoardStatusDetailModal.tsx");

  it("uses PATCH bed status API — not room assignment", () => {
    expect(modal).toContain("updateFacilityBedStatus");
    expect(modal).not.toContain("updateEncounterRoomAssignment");
    expect(modal).toContain("fetchBedStatusHistory");
  });

  it("exposes all five housekeeping actions with save/cancel flow", () => {
    expect(modal).toContain('"DIRTY"');
    expect(modal).toContain('"CLEANING"');
    expect(modal).toContain('"AVAILABLE"');
    expect(modal).toContain('"RESERVED"');
    expect(modal).toContain('"BLOCKED"');
    expect(modal).toContain('data-testid="bed-board-status-actions"');
    expect(modal).toContain('data-testid="bed-board-status-save"');
    expect(modal).toContain("pendingAction");
  });

  it("shows occupant, view encounter, change room, and recent activity", () => {
    expect(modal).toContain("statusDetailOccupant");
    expect(modal).toContain('data-testid="bed-board-status-view-encounter"');
    expect(modal).toContain('data-testid="bed-board-status-change-room"');
    expect(modal).toContain('data-testid="bed-board-status-history"');
  });

  it("enforces occupancy governance for reserve and block", () => {
    expect(modal).toContain("manualStatusBlockedByOccupancy");
    expect(manualStatusBlockedByOccupancy({
      targetStatus: "RESERVED",
      bedStatus: "OCCUPIED",
      occupantEncounterId: "enc-1",
    })).toBe(true);
    expect(manualStatusBlockedByOccupancy({
      targetStatus: "BLOCKED",
      bedStatus: "OCCUPIED",
      occupantEncounterId: "enc-1",
    })).toBe(true);
    expect(manualStatusBlockedByOccupancy({
      targetStatus: "DIRTY",
      bedStatus: "OCCUPIED",
      occupantEncounterId: "enc-1",
    })).toBe(false);
  });
});
