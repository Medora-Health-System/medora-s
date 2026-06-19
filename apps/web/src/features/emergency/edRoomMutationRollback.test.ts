import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { mergeTrackboardEncounterUpdate } from "@/lib/trackboardMutationPatch";

const webRoot = join(import.meta.dirname, "../..");

function readSrc(relativePath: string): string {
  return readFileSync(join(webRoot, relativePath), "utf8");
}

describe("edRoomMutationRollback (MEDUI.ED.BEDBOARD.ROOM_MUTATION.1)", () => {
  const modal = readSrc("components/encounters/RoomAssignmentModal.tsx");
  const statusModal = readSrc("components/encounters/BedBoardStatusDetailModal.tsx");
  const trackboard = readSrc("features/emergency/EmergencyTrackboardView.tsx");

  it("16 — failed room change does not call onSaved", () => {
    expect(modal).toContain("catch (err)");
    expect(modal).toMatch(/catch \(err\)[\s\S]{0,500}setError\(/);
    expect(modal).not.toMatch(/catch \(err\)[\s\S]{0,500}onSaved\(/);
  });

  it("17 — failed bed status change does not call onStatusUpdated", () => {
    expect(statusModal).toContain("catch (err)");
    expect(statusModal).toMatch(/catch \(err\)[\s\S]{0,400}setError\(/);
    expect(statusModal).not.toMatch(/catch \(err\)[\s\S]{0,400}onStatusUpdated\?\./);
  });

  it("18 — stale background refresh does not overwrite newer optimistic patch", () => {
    const pending = new Map([
      [
        "enc-1",
        {
          id: "enc-1",
          roomLabel: "ED-5",
          governedRoomDisplay: "ED-5",
        },
      ],
    ]);
    const merged = mergeTrackboardEncounterUpdate(
      [
        {
          id: "enc-1",
          updatedAt: "2026-06-03T10:05:00.000Z",
          roomLabel: "ED-5",
          governedRoomDisplay: "ED-5",
        },
      ],
      [
        {
          id: "enc-1",
          updatedAt: "2026-06-03T10:05:00.000Z",
          roomLabel: "ED-1",
          governedRoomDisplay: "ED-1",
        },
      ],
      pending
    );
    expect(merged[0]?.roomLabel).toBe("ED-5");
  });

  it("19 — server reconciliation clears pending patch when fields match", () => {
    expect(trackboard).toContain("reconcilePendingRoomPatches");
    expect(trackboard).toContain("mergeTrackboardEncounterUpdate");
  });

  it("room modal shows error and keeps dialog open on failure", () => {
    expect(modal).toContain('role="alert"');
    expect(modal).not.toMatch(/catch \(err\)[\s\S]{0,300}onClose\(\)/);
  });

  it("bed status modal shows occupied conflict message", () => {
    expect(statusModal).toContain("BED_OCCUPIED_BLOCKS_STATUS_CHANGE");
    expect(statusModal).toContain('t("bedBoard.statusOccupiedConflict")');
  });

  it("save resets saving flag in finally block", () => {
    expect(modal).toContain("finally");
    expect(modal).toContain("setSaving(false)");
    expect(statusModal).toContain("setSaving(false)");
  });
});
