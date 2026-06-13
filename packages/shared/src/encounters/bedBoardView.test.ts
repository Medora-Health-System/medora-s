import { describe, expect, it } from "vitest";
import {
  buildBedBoardOccupancySummary,
  buildFacilityBedBoardView,
  buildUnitBedBoardView,
  emptyBedBoardOccupancySummary,
  mapComposedBedBoardRowToEntry,
} from "./bedBoardView.js";
import type { ComposedBedBoardRow, ComposedFacilityBedBoard } from "./bedBoardComposition.js";

function sampleRow(
  overrides: Partial<ComposedBedBoardRow> & Pick<ComposedBedBoardRow, "bedKey" | "status">
): ComposedBedBoardRow {
  return {
    display: overrides.bedKey.replace(":", "-"),
    room: overrides.bedKey.split(":")[1] ?? "1",
    unitCode: (overrides.bedKey.split(":")[0] ?? "ED") as ComposedBedBoardRow["unitCode"],
    statusSource: "derived",
    occupantEncounterId: null,
    occupantPatientName: null,
    occupantMrn: null,
    reasonCode: null,
    reasonText: null,
    updatedAt: null,
    ...overrides,
  };
}

describe("bedBoardView (K.10B.10D)", () => {
  it("buildBedBoardOccupancySummary counts all statuses", () => {
    const summary = buildBedBoardOccupancySummary([
      { status: "OCCUPIED" },
      { status: "OCCUPIED" },
      { status: "AVAILABLE" },
      { status: "BLOCKED" },
      { status: "RESERVED" },
      { status: "CLEANING" },
      { status: "DIRTY" },
      { status: "TRANSFER_PENDING" },
      { status: "DISCHARGE_PENDING" },
    ]);
    expect(summary).toEqual({
      occupied: 2,
      available: 1,
      blocked: 1,
      reserved: 1,
      cleaning: 1,
      dirty: 1,
      transferPending: 1,
      dischargePending: 1,
    });
  });

  it("empty unit returns zero summary", () => {
    expect(buildBedBoardOccupancySummary([])).toEqual(emptyBedBoardOccupancySummary());
  });

  it("mapComposedBedBoardRowToEntry maps storage and patient fields", () => {
    const entry = mapComposedBedBoardRowToEntry(
      sampleRow({
        bedKey: "MS:3",
        status: "OCCUPIED",
        occupantEncounterId: "enc-1",
        occupantPatientName: "Jean Test",
        reasonCode: "MAINTENANCE",
        reasonText: "Broken bed",
      })
    );
    expect(entry).toEqual({
      storageKey: "MS:3",
      displayKey: "MS-3",
      unit: "MS",
      status: "OCCUPIED",
      occupantEncounterId: "enc-1",
      patientDisplay: "Jean Test",
      reasonCode: "MAINTENANCE",
      reasonText: "Broken bed",
    });
  });

  it("buildUnitBedBoardView derives summary from rows", () => {
    const view = buildUnitBedBoardView("ED", [
      sampleRow({ bedKey: "ED:1", status: "AVAILABLE" }),
      sampleRow({ bedKey: "ED:2", status: "BLOCKED" }),
      sampleRow({ bedKey: "ED:3", status: "TRANSFER_PENDING" }),
      sampleRow({ bedKey: "ED:4", status: "DISCHARGE_PENDING" }),
    ]);
    expect(view.unit).toBe("ED");
    expect(view.summary.blocked).toBe(1);
    expect(view.summary.transferPending).toBe(1);
    expect(view.summary.dischargePending).toBe(1);
    expect(view.beds).toHaveLength(4);
  });

  it("buildFacilityBedBoardView wraps composed board", () => {
    const composed: ComposedFacilityBedBoard = {
      facilityId: "fac-1",
      generatedAt: "2026-06-03T12:00:00.000Z",
      units: [
        {
          unitCode: "ICU",
          beds: [
            sampleRow({ bedKey: "ICU:1", status: "OCCUPIED" }),
            sampleRow({ bedKey: "ICU:2", status: "AVAILABLE" }),
          ],
        },
      ],
    };
    const view = buildFacilityBedBoardView(composed);
    expect(view.facilityId).toBe("fac-1");
    expect(view.units[0]?.summary.occupied).toBe(1);
    expect(view.units[0]?.summary.available).toBe(1);
  });
});
