import type { BedOperationalStatus } from "@medora/shared";
import type { FacilityBedBoardBedRow } from "@/lib/bedBoardApi";

export type BedBoardStatusFilterId =
  | "all"
  | "OCCUPIED"
  | "AVAILABLE"
  | "BLOCKED"
  | "DIRTY"
  | "CLEANING"
  | "RESERVED";

export const BED_BOARD_STATUS_FILTER_OPTIONS: BedBoardStatusFilterId[] = [
  "all",
  "OCCUPIED",
  "AVAILABLE",
  "BLOCKED",
  "DIRTY",
  "CLEANING",
  "RESERVED",
];

export function filterBedBoardByStatus(
  beds: readonly FacilityBedBoardBedRow[],
  filter: BedBoardStatusFilterId
): FacilityBedBoardBedRow[] {
  if (filter === "all") return [...beds];
  return beds.filter((bed) => bed.status === filter);
}

export function bedBoardFilterMatches(
  bedStatus: BedOperationalStatus,
  filter: BedBoardStatusFilterId
): boolean {
  if (filter === "all") return true;
  return bedStatus === filter;
}
