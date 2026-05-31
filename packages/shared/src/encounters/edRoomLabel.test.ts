import { describe, expect, it } from "vitest";
import {
  compareRoomLabels,
  ED_DEFAULT_WAITING_ROOM_LABEL,
  findRoomOccupancyConflict,
  getNextAvailableSharedRoomLabel,
  isRoomOccupied,
  normalizeRoomLabel,
  sortRowsByRoomLabel,
} from "./edRoomLabel.js";

describe("edRoomLabel — numeric-aware sorting", () => {
  it("orders 1 before 2 before 10", () => {
    expect(compareRoomLabels("1", "2")).toBeLessThan(0);
    expect(compareRoomLabels("2", "10")).toBeLessThan(0);
    expect(compareRoomLabels("1", "10")).toBeLessThan(0);
  });

  it("orders 4 before 4A before 4B", () => {
    expect(compareRoomLabels("4", "4A")).toBeLessThan(0);
    expect(compareRoomLabels("4A", "4B")).toBeLessThan(0);
    expect(compareRoomLabels("4B", "5")).toBeLessThan(0);
  });

  it("places patients without room after assigned rooms", () => {
    expect(compareRoomLabels("3", null)).toBeLessThan(0);
    expect(compareRoomLabels("3", "")).toBeLessThan(0);
    expect(compareRoomLabels("3", ED_DEFAULT_WAITING_ROOM_LABEL)).toBeLessThan(0);
    expect(compareRoomLabels("", "2")).toBeGreaterThan(0);
  });

  it("sortRowsByRoomLabel sorts a mixed list", () => {
    const sorted = sortRowsByRoomLabel([
      { id: "a", roomLabel: "10" },
      { id: "b", roomLabel: "4B" },
      { id: "c", roomLabel: null },
      { id: "d", roomLabel: "2" },
      { id: "e", roomLabel: "4" },
      { id: "f", roomLabel: "4A" },
      { id: "g", roomLabel: ED_DEFAULT_WAITING_ROOM_LABEL },
    ]).map((r) => r.roomLabel);
    expect(sorted).toEqual(["2", "4", "4A", "4B", "10", null, ED_DEFAULT_WAITING_ROOM_LABEL]);
  });

  it("normalizes Room prefix and lowercase suffix", () => {
    expect(normalizeRoomLabel("Room 4")).toBe("4");
    expect(normalizeRoomLabel("4a")).toBe("4A");
  });
});

describe("edRoomLabel — shared suffix selection", () => {
  it("offers 4A when Room 4 is occupied", () => {
    expect(getNextAvailableSharedRoomLabel("4", ["4"])).toBe("4A");
  });

  it("offers 4B when 4 and 4A are occupied", () => {
    expect(getNextAvailableSharedRoomLabel("4", ["4", "4A"])).toBe("4B");
  });
});

describe("edRoomLabel — occupied room detection", () => {
  const openRows = [
    { id: "enc-1", facilityId: "fac-a", roomLabel: "4", status: "OPEN" },
    { id: "enc-2", facilityId: "fac-a", roomLabel: "4A", status: "OPEN" },
    { id: "enc-closed", facilityId: "fac-a", roomLabel: "4", status: "CLOSED" },
    { id: "enc-other-fac", facilityId: "fac-b", roomLabel: "4", status: "OPEN" },
  ];

  it("detects occupied numbered room for another active encounter", () => {
    expect(
      isRoomOccupied("4", openRows, { excludeEncounterId: "enc-2", facilityId: "fac-a" })
    ).toBe(true);
  });

  it("returns next suffix on conflict", () => {
    const conflict = findRoomOccupancyConflict("4", openRows, {
      excludeEncounterId: "enc-2",
      facilityId: "fac-a",
    });
    expect(conflict?.suggestedRoom).toBe("4B");
    expect(conflict?.occupyingEncounterId).toBe("enc-1");
  });

  it("does not conflict when assigning the same encounter its current room", () => {
    expect(
      findRoomOccupancyConflict("4", openRows, { excludeEncounterId: "enc-1", facilityId: "fac-a" })
    ).toBeNull();
  });

  it("ignores closed encounters for occupancy", () => {
    expect(
      findRoomOccupancyConflict("4", [{ id: "enc-closed", facilityId: "fac-a", roomLabel: "4", status: "CLOSED" }], {
        facilityId: "fac-a",
      })
    ).toBeNull();
  });

  it("ignores occupancy in another facility", () => {
    expect(
      findRoomOccupancyConflict(
        "4",
        [{ id: "enc-other-fac", facilityId: "fac-b", roomLabel: "4", status: "OPEN" }],
        { facilityId: "fac-a" }
      )
    ).toBeNull();
  });
});
