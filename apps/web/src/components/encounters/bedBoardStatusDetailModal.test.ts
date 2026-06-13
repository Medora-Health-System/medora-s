import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const webSrcRoot = join(import.meta.dirname, "..", "..");

function readSrc(relativePath: string): string {
  return readFileSync(join(webSrcRoot, relativePath), "utf8");
}

describe("BedBoardStatusDetailModal", () => {
  const modal = readSrc("components/encounters/BedBoardStatusDetailModal.tsx");

  it("uses PATCH bed status API — not room assignment", () => {
    expect(modal).toContain("updateFacilityBedStatus");
    expect(modal).not.toContain("updateEncounterRoomAssignment");
  });

  it("exposes all five housekeeping actions", () => {
    expect(modal).toContain('"DIRTY"');
    expect(modal).toContain('"CLEANING"');
    expect(modal).toContain('"AVAILABLE"');
    expect(modal).toContain('"RESERVED"');
    expect(modal).toContain('"BLOCKED"');
    expect(modal).toContain('data-testid="bed-board-status-actions"');
  });

  it("supports optional reason note on status update", () => {
    expect(modal).toContain("reasonText: note.trim()");
  });
});
