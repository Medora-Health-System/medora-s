import { describe, expect, it } from "vitest";
import {
  buildCanonicalBedKey,
  DEFAULT_PILOT_BED_POOLS,
  findBedOccupancyConflict,
  formatCanonicalBedDisplay,
  parseCanonicalBedKey,
  resolveEncounterCanonicalBedKey,
  validateBedInPool,
} from "./facilityBedGovernance.js";
import { ED_CANONICAL_WAITING_ROOM_LABEL } from "./edRoomLabel.js";

describe("facilityBedGovernance (K.10B.10B M1)", () => {
  it("builds ED:2 canonical key", () => {
    expect(buildCanonicalBedKey("ED", "2")).toBe("ED:2");
  });

  it("formats ED-2 display from key", () => {
    expect(formatCanonicalBedDisplay("ED:2")).toBe("ED-2");
    expect(formatCanonicalBedDisplay("ED", "2")).toBe("ED-2");
  });

  it("parses canonical bed key", () => {
    expect(parseCanonicalBedKey("MS:4")).toEqual({ unit: "MS", room: "4" });
  });

  it("treats ED and MS same room number as different beds", () => {
    const edKey = buildCanonicalBedKey("ED", "2");
    const msKey = buildCanonicalBedKey("MS", "2");
    expect(edKey).toBe("ED:2");
    expect(msKey).toBe("MS:2");
    expect(edKey).not.toBe(msKey);

    const rows = [
      { id: "enc-ed", facilityId: "fac-1", roomLabel: "2", status: "OPEN", type: "EMERGENCY" },
      { id: "enc-ms", facilityId: "fac-1", roomLabel: "MS-2", status: "OPEN", type: "INPATIENT" },
    ];
    expect(
      findBedOccupancyConflict({ unit: "MS", room: "2", storageRoomLabel: "MS-2" }, rows, {
        excludeEncounterId: "enc-ms",
        facilityId: "fac-1",
      })
    ).toBeNull();
    expect(
      findBedOccupancyConflict({ unit: "ED", room: "2", storageRoomLabel: "2" }, rows, {
        excludeEncounterId: "enc-ed",
        facilityId: "fac-1",
      })
    ).toBeNull();
  });

  it("rejects invalid pool room via validateBedInPool", () => {
    expect(validateBedInPool("ED", "31")).toBe(false);
    expect(validateBedInPool("ICU", "13")).toBe(false);
    expect(validateBedInPool("OBS", "11")).toBe(false);
    expect(validateBedInPool("ED", "1")).toBe(true);
    expect(DEFAULT_PILOT_BED_POOLS.ED).toHaveLength(30);
  });

  it("excludes WAITING_ROOM from canonical bed key resolution", () => {
    expect(
      resolveEncounterCanonicalBedKey({
        roomLabel: ED_CANONICAL_WAITING_ROOM_LABEL,
        type: "EMERGENCY",
      })
    ).toBeNull();
  });

  it("resolves MS prefixed storage to MS canonical key", () => {
    expect(
      resolveEncounterCanonicalBedKey({
        roomLabel: "MS-4",
        type: "INPATIENT",
        admissionSummaryJson: { serviceUnit: "Med/Surg" },
      })
    ).toBe("MS:4");
  });

  it("findBedOccupancyConflict detects duplicate MS bed", () => {
    const rows = [
      {
        id: "enc-1",
        facilityId: "fac-1",
        roomLabel: "MS-2",
        status: "OPEN",
        type: "INPATIENT",
        admissionSummaryJson: { serviceUnit: "Med/Surg" },
      },
    ];
    const conflict = findBedOccupancyConflict(
      { unit: "MS", room: "2", storageRoomLabel: "MS-2" },
      rows,
      { facilityId: "fac-1", excludeEncounterId: "enc-2" }
    );
    expect(conflict).not.toBeNull();
    expect(conflict?.occupiedRoom).toBe("MS-2");
    expect(conflict?.occupyingEncounterId).toBe("enc-1");
  });

  it("ignores closed encounters", () => {
    const rows = [
      {
        id: "enc-closed",
        facilityId: "fac-1",
        roomLabel: "ICU-2",
        status: "CLOSED",
        type: "INPATIENT",
      },
    ];
    expect(
      findBedOccupancyConflict(
        { unit: "ICU", room: "2", storageRoomLabel: "ICU-2" },
        rows,
        { facilityId: "fac-1" }
      )
    ).toBeNull();
  });
});
