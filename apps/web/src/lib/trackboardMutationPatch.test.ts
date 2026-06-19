import { describe, expect, it } from "vitest";
import {
  applyTrackboardRoomMutationPatch,
  mergeTrackboardEncounterUpdate,
  reconcilePendingRoomPatches,
} from "./trackboardMutationPatch";

describe("trackboardMutationPatch", () => {
  const baseRows = [
    {
      id: "enc-1",
      updatedAt: "2026-06-03T10:00:00.000Z",
      roomLabel: "ED-1",
      governedRoomDisplay: "ED-1",
    },
  ];

  it("applyTrackboardRoomMutationPatch updates room label immediately", () => {
    const next = applyTrackboardRoomMutationPatch(baseRows, {
      id: "enc-1",
      roomLabel: "ED-4",
      governedRoomDisplay: "ED-4",
      governedRoomUnit: "ED",
      governedRoomHasAssignment: true,
      updatedAt: "2026-06-03T10:05:00.000Z",
    });
    expect(next[0]?.roomLabel).toBe("ED-4");
    expect(next[0]?.governedRoomDisplay).toBe("ED-4");
  });

  it("mergeTrackboardEncounterUpdate keeps newer optimistic patch during stale refresh", () => {
    const pending = new Map([
      [
        "enc-1",
        {
          id: "enc-1",
          roomLabel: "ED-4",
          governedRoomDisplay: "ED-4",
        },
      ],
    ]);
    const merged = mergeTrackboardEncounterUpdate(
      applyTrackboardRoomMutationPatch(baseRows, pending.get("enc-1")!),
      baseRows,
      pending
    );
    expect(merged[0]?.roomLabel).toBe("ED-4");
    expect(merged[0]?.governedRoomDisplay).toBe("ED-4");
  });

  it("reconcilePendingRoomPatches clears patch once server matches", () => {
    const pending = new Map([
      [
        "enc-1",
        {
          id: "enc-1",
          roomLabel: "ED-4",
          governedRoomDisplay: "ED-4",
        },
      ],
    ]);
    reconcilePendingRoomPatches(
      [
        {
          id: "enc-1",
          roomLabel: "ED-4",
          governedRoomDisplay: "ED-4",
        },
      ],
      pending
    );
    expect(pending.size).toBe(0);
  });

  it("clear room patch removes governed assignment immediately", () => {
    const next = applyTrackboardRoomMutationPatch(
      [
        {
          id: "enc-1",
          roomLabel: "ED-1",
          governedRoomDisplay: "ED-1",
          governedRoomHasAssignment: true,
        },
      ],
      {
        id: "enc-1",
        roomLabel: null,
        governedRoomDisplay: null,
        governedRoomHasAssignment: false,
      }
    );
    expect(next[0]?.roomLabel).toBeNull();
    expect(next[0]?.governedRoomHasAssignment).toBe(false);
  });
});
