import { describe, expect, it } from "vitest";
import { composeFacilityBedBoard } from "./bedBoardComposition.js";
import type { BedBoardOccupancyRow } from "./bedBoardComposition.js";
import type { BedOperationalOverlayRecord } from "./bedBoardComposition.js";

describe("bedBoardComposition (K.10B.10C)", () => {
  const facilityId = "fac-1";

  it("returns pool beds for each unit", () => {
    const board = composeFacilityBedBoard({
      facilityId,
      encounters: [],
      overlays: new Map(),
    });
    expect(board.units.length).toBe(4);
    expect(board.units.find((u) => u.unitCode === "ED")?.beds.length).toBe(30);
  });

  it("marks occupied encounter as OCCUPIED", () => {
    const encounters: BedBoardOccupancyRow[] = [
      {
        id: "enc-1",
        facilityId,
        roomLabel: "2",
        status: "OPEN",
        type: "EMERGENCY",
        workflowState: "IN_TREATMENT",
      },
    ];
    const board = composeFacilityBedBoard({ facilityId, encounters, overlays: new Map() });
    const edBed2 = board.units
      .find((u) => u.unitCode === "ED")
      ?.beds.find((b) => b.bedKey === "ED:2");
    expect(edBed2?.status).toBe("OCCUPIED");
    expect(edBed2?.occupantEncounterId).toBe("enc-1");
  });

  it("applies DIRTY operational overlay", () => {
    const overlays = new Map<string, BedOperationalOverlayRecord>([
      [
        "MS:2",
        {
          bedKey: "MS:2",
          status: "DIRTY",
          cleared: false,
          reasonCode: "HOUSEKEEPING",
          reasonText: "Awaiting cleaning",
          updatedAt: "2026-06-03T12:00:00.000Z",
        },
      ],
    ]);
    const board = composeFacilityBedBoard({ facilityId, encounters: [], overlays });
    const bed = board.units.find((u) => u.unitCode === "MS")?.beds.find((b) => b.bedKey === "MS:2");
    expect(bed?.status).toBe("DIRTY");
    expect(bed?.statusSource).toBe("operational");
  });

  it("BLOCKED overlay takes precedence over occupied encounter", () => {
    const overlays = new Map<string, BedOperationalOverlayRecord>([
      ["ED:2", { bedKey: "ED:2", status: "BLOCKED", cleared: false }],
    ]);
    const encounters: BedBoardOccupancyRow[] = [
      {
        id: "enc-1",
        facilityId,
        roomLabel: "2",
        status: "OPEN",
        type: "EMERGENCY",
      },
    ];
    const board = composeFacilityBedBoard({ facilityId, encounters, overlays });
    const bed = board.units.find((u) => u.unitCode === "ED")?.beds.find((b) => b.bedKey === "ED:2");
    expect(bed?.status).toBe("BLOCKED");
  });
});
