import { parseMarShiftTimelineShiftCode, type MarShiftTimelineShiftCode } from "@medora/shared";

const PERSISTABLE_SHIFT_CODES = new Set<MarShiftTimelineShiftCode>([
  "6A_6P",
  "7A_7P",
  "7P_7A",
  "12P_12A",
  "3P_3A",
]);

export function marShiftTimelineShiftStorageKey(facilityId: string, userId: string): string {
  return `medora.marShiftTimeline.shiftCode.${facilityId}.${userId}`;
}

export function initialMarShiftTimelineShiftCode(
  facilityId: string,
  userId?: string | null,
  fallback: MarShiftTimelineShiftCode = "7A_7P"
): MarShiftTimelineShiftCode {
  if (!userId?.trim()) return fallback;
  return readStoredMarShiftTimelineShiftCode(facilityId, userId) ?? fallback;
}

export function readStoredMarShiftTimelineShiftCode(
  facilityId: string,
  userId: string
): MarShiftTimelineShiftCode | null {
  if (typeof localStorage === "undefined" || !facilityId.trim() || !userId.trim()) return null;
  try {
    const raw = localStorage.getItem(marShiftTimelineShiftStorageKey(facilityId, userId));
    const parsed = parseMarShiftTimelineShiftCode(raw);
    if (!parsed || parsed === "CUSTOM" || !PERSISTABLE_SHIFT_CODES.has(parsed)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeStoredMarShiftTimelineShiftCode(
  facilityId: string,
  userId: string,
  shiftCode: MarShiftTimelineShiftCode
): void {
  if (typeof localStorage === "undefined" || !facilityId.trim() || !userId.trim()) return;
  if (shiftCode === "CUSTOM" || !PERSISTABLE_SHIFT_CODES.has(shiftCode)) return;
  try {
    localStorage.setItem(marShiftTimelineShiftStorageKey(facilityId, userId), shiftCode);
  } catch {
    /* ignore quota / private mode */
  }
}
