import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildBedBoardOccupancySummary } from "@medora/shared";

const webSrcRoot = join(import.meta.dirname, "..", "..");

function readSrc(relativePath: string): string {
  return readFileSync(join(webSrcRoot, relativePath), "utf8");
}

describe("BedBoardCensusHeader (K.10B.10D)", () => {
  const header = readSrc("components/encounters/BedBoardCensusHeader.tsx");

  it("renders census title and stats from API summary prop", () => {
    expect(header).toContain('data-testid="bed-board-census-header"');
    expect(header).toContain("summary.occupied");
    expect(header).toContain("summary.available");
    expect(header).toContain("summary.blocked");
    expect(header).not.toMatch(/summary\s*\+\s*1|count\s*\+|beds\.filter/);
  });

  it("does not derive counts client-side", () => {
    expect(header).not.toContain("buildBedBoardOccupancySummary");
    expect(header).not.toContain(".reduce(");
  });

  it("shared summary builder counts transfer and discharge pending", () => {
    const summary = buildBedBoardOccupancySummary([
      { status: "TRANSFER_PENDING" },
      { status: "DISCHARGE_PENDING" },
    ]);
    expect(summary.transferPending).toBe(1);
    expect(summary.dischargePending).toBe(1);
  });
});
