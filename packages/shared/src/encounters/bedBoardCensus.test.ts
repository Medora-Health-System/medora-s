import { describe, expect, it } from "vitest";
import { buildBedBoardCensus, emptyBedBoardCensus } from "./bedBoardCensus.js";

describe("buildBedBoardCensus (K.10B.10E)", () => {
  it("returns zero census for empty input", () => {
    expect(buildBedBoardCensus([])).toEqual(emptyBedBoardCensus());
  });

  it("counts all operational statuses", () => {
    const census = buildBedBoardCensus([
      { status: "OCCUPIED" },
      { status: "OCCUPIED" },
      { status: "AVAILABLE" },
      { status: "DIRTY" },
      { status: "CLEANING" },
      { status: "RESERVED" },
      { status: "BLOCKED" },
      { status: "TRANSFER_PENDING" },
      { status: "DISCHARGE_PENDING" },
    ]);
    expect(census).toEqual({
      occupied: 2,
      available: 1,
      dirty: 1,
      cleaning: 1,
      reserved: 1,
      blocked: 1,
      transferPending: 1,
      dischargePending: 1,
    });
  });
});
