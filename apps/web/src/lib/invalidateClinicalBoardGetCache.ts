import {
  buildGetDedupeKey,
  invalidateGetRequestDedupeForPath,
} from "@/lib/getRequestDedupe";
import type { EncounterBedUnitCode } from "@medora/shared";
import { logBedBoardMutationDebug } from "@/lib/bedBoardMutationDebug";

export const TRACKBOARD_OPEN_GET_PATH = "/trackboard?status=OPEN";
export const TRACKBOARD_INPATIENT_GET_PATH = "/trackboard?status=OPEN&type=INPATIENT";

export function clinicalBoardGetPaths(
  facilityId: string,
  units?: readonly EncounterBedUnitCode[]
): string[] {
  const unitList = units ?? (["ED", "MS", "ICU", "OBS"] as const);
  return [
    TRACKBOARD_OPEN_GET_PATH,
    TRACKBOARD_INPATIENT_GET_PATH,
    `/facilities/${facilityId}/bed-board`,
    ...unitList.map((unit) => `/facilities/${facilityId}/bed-board?unit=${encodeURIComponent(unit)}`),
  ];
}

export function clinicalBoardGetDedupeKeys(
  facilityId: string,
  units?: readonly EncounterBedUnitCode[]
): string[] {
  return clinicalBoardGetPaths(facilityId, units).map((path) => buildGetDedupeKey(path, facilityId));
}

/** Drop cached GET results for trackboard + bed board after room/bed mutations. */
export function invalidateClinicalBoardGetCache(
  facilityId: string,
  units?: readonly EncounterBedUnitCode[]
): { invalidatedAt: string; getPaths: string[]; dedupeKeys: string[] } {
  const getPaths = clinicalBoardGetPaths(facilityId, units);
  const dedupeKeys = clinicalBoardGetDedupeKeys(facilityId, units);
  const invalidatedAt = new Date().toISOString();

  for (const path of getPaths) {
    invalidateGetRequestDedupeForPath(path, facilityId);
  }

  logBedBoardMutationDebug("invalidateClinicalBoardGetCache", {
    facilityId,
    invalidatedAt,
    getPaths,
    dedupeKeys,
  });

  return { invalidatedAt, getPaths, dedupeKeys };
}
