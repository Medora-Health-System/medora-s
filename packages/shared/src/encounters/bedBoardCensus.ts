import type { BedOperationalStatus } from "./bedOperationalStatus.js";
import {
  buildBedBoardOccupancySummary,
  emptyBedBoardOccupancySummary,
  type BedBoardOccupancySummary,
} from "./bedBoardView.js";

/** Minimal row input for census aggregation (K.10B.10E). */
export type BedBoardRow = {
  status: BedOperationalStatus;
};

export type BedBoardCensus = BedBoardOccupancySummary;

export { emptyBedBoardOccupancySummary as emptyBedBoardCensus };

/** Pure census counter over bed board rows. */
export function buildBedBoardCensus(rows: readonly BedBoardRow[]): BedBoardCensus {
  return buildBedBoardOccupancySummary(rows);
}
