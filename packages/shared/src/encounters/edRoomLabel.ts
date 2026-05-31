/**
 * ED room label normalization, numeric-aware sorting, and occupied-room helpers.
 * Used by the ED trackboard and room assignment flows — keep logic centralized here.
 */

/** Default waiting-room label (matches web `DEFAULT_ENCOUNTER_ROOM_LABEL`). */
export const ED_DEFAULT_WAITING_ROOM_LABEL = "Salle d'attente" as const;

const WAITING_ROOM_LABELS_LOWER = new Set([
  ED_DEFAULT_WAITING_ROOM_LABEL.toLowerCase(),
  "waiting room",
  "waiting",
]);

export type EdRoomSortKey = {
  /** 0 = numeric (+ optional suffix), 1 = other assigned label, 2 = unassigned / waiting */
  sortRank: 0 | 1 | 2;
  baseNumber: number;
  suffix: string;
  normalizedLabel: string;
  hasAssignableRoom: boolean;
};

export type EdRoomOccupancyRow = {
  id: string;
  facilityId?: string | null;
  roomLabel?: string | null;
  status?: string | null;
};

export type EdRoomOccupancyConflict = {
  occupyingEncounterId: string;
  requestedRoom: string;
  suggestedRoom: string;
};

/** Trim and normalize common ED room label shapes (`Room 4`, `4a` → `4A`). */
export function normalizeRoomLabel(raw: string | null | undefined): string {
  let s = (raw ?? "").trim();
  if (!s) return "";
  s = s.replace(/^room\s+/i, "").trim();
  const numericSuffix = /^(\d+)([a-zA-Z]*)$/.exec(s);
  if (numericSuffix) {
    const base = numericSuffix[1]!;
    const suffix = numericSuffix[2] ?? "";
    return suffix ? `${base}${suffix.toUpperCase()}` : base;
  }
  return s;
}

export function parseRoomSortKey(raw: string | null | undefined): EdRoomSortKey {
  const normalized = normalizeRoomLabel(raw);
  if (!normalized) {
    return {
      sortRank: 2,
      baseNumber: Number.POSITIVE_INFINITY,
      suffix: "",
      normalizedLabel: "",
      hasAssignableRoom: false,
    };
  }
  if (WAITING_ROOM_LABELS_LOWER.has(normalized.toLowerCase())) {
    return {
      sortRank: 2,
      baseNumber: Number.POSITIVE_INFINITY,
      suffix: "",
      normalizedLabel: normalized,
      hasAssignableRoom: false,
    };
  }
  const numeric = /^(\d+)([A-Z]*)$/.exec(normalized);
  if (numeric) {
    return {
      sortRank: 0,
      baseNumber: parseInt(numeric[1]!, 10),
      suffix: numeric[2] ?? "",
      normalizedLabel: normalized,
      hasAssignableRoom: true,
    };
  }
  return {
    sortRank: 1,
    baseNumber: Number.POSITIVE_INFINITY,
    suffix: normalized.toLowerCase(),
    normalizedLabel: normalized,
    hasAssignableRoom: true,
  };
}

/** Numeric-aware room ordering for ED trackboard (1, 2, 10, 4, 4A, 4B; unassigned last). */
export function compareRoomLabels(
  a: string | null | undefined,
  b: string | null | undefined
): number {
  const ka = parseRoomSortKey(a);
  const kb = parseRoomSortKey(b);
  if (ka.sortRank !== kb.sortRank) return ka.sortRank - kb.sortRank;
  if (ka.sortRank === 0) {
    if (ka.baseNumber !== kb.baseNumber) return ka.baseNumber - kb.baseNumber;
    if (ka.suffix === kb.suffix) return 0;
    if (!ka.suffix) return -1;
    if (!kb.suffix) return 1;
    return ka.suffix.localeCompare(kb.suffix);
  }
  if (ka.sortRank === 1) return ka.suffix.localeCompare(kb.suffix);
  return ka.normalizedLabel.localeCompare(kb.normalizedLabel);
}

export function sortRowsByRoomLabel<T extends { roomLabel?: string | null }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => compareRoomLabels(a.roomLabel, b.roomLabel));
}

export function isActiveOpenEncounter(row: EdRoomOccupancyRow): boolean {
  const status = (row.status ?? "OPEN").trim().toUpperCase();
  return status === "OPEN";
}

function rowMatchesFacility(row: EdRoomOccupancyRow, facilityId?: string): boolean {
  if (!facilityId?.trim()) return true;
  const rowFacility = row.facilityId?.trim();
  if (!rowFacility) return true;
  return rowFacility === facilityId.trim();
}

function hasNumericEdRoom(label: string): boolean {
  const key = parseRoomSortKey(label);
  return key.sortRank === 0;
}

function collectUsedSuffixes(baseNumber: number, occupiedLabels: string[]): Set<string> {
  const used = new Set<string>();
  for (const label of occupiedLabels) {
    const key = parseRoomSortKey(label);
    if (key.sortRank === 0 && key.baseNumber === baseNumber) {
      used.add(key.suffix.toUpperCase());
    }
  }
  return used;
}

/**
 * When a numbered base room is shared, pick the next free suffix (4 → 4A → 4B …).
 */
export function getNextAvailableSharedRoomLabel(
  requestedRoom: string,
  occupiedLabels: Array<string | null | undefined>
): string {
  const normalized = normalizeRoomLabel(requestedRoom);
  const key = parseRoomSortKey(normalized);
  if (key.sortRank !== 0) return normalized;

  const labels = occupiedLabels
    .map((l) => normalizeRoomLabel(l))
    .filter((l) => l.length > 0);
  const used = collectUsedSuffixes(key.baseNumber, labels);

  for (const letter of "ABCDEFGHIJKLMNOPQRSTUVWXYZ") {
    if (!used.has(letter)) return `${key.baseNumber}${letter}`;
  }
  return `${key.baseNumber}Z`;
}

export function isRoomOccupied(
  targetRoom: string,
  encounters: EdRoomOccupancyRow[],
  options?: { excludeEncounterId?: string; facilityId?: string }
): boolean {
  return findRoomOccupancyConflict(targetRoom, encounters, options) != null;
}

/**
 * Returns a conflict when an active/open encounter in the same facility already uses the exact room label.
 * Closed encounters are excluded by passing only open rows (trackboard API).
 */
export function findRoomOccupancyConflict(
  targetRoom: string,
  encounters: EdRoomOccupancyRow[],
  options?: { excludeEncounterId?: string; facilityId?: string }
): EdRoomOccupancyConflict | null {
  const normalized = normalizeRoomLabel(targetRoom);
  if (!normalized || !hasNumericEdRoom(normalized)) return null;

  const excludeId = options?.excludeEncounterId?.trim();
  const facilityId = options?.facilityId?.trim();

  for (const row of encounters) {
    if (!isActiveOpenEncounter(row)) continue;
    if (!rowMatchesFacility(row, facilityId)) continue;
    if (excludeId && row.id === excludeId) continue;
    if (normalizeRoomLabel(row.roomLabel) !== normalized) continue;

    const occupiedLabels = encounters
      .filter((e) => isActiveOpenEncounter(e) && rowMatchesFacility(e, facilityId))
      .map((e) => e.roomLabel);
    const suggestedRoom = getNextAvailableSharedRoomLabel(normalized, occupiedLabels);
    return {
      occupyingEncounterId: row.id,
      requestedRoom: normalized,
      suggestedRoom,
    };
  }
  return null;
}
