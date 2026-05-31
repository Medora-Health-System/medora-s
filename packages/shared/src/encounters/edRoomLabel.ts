/**
 * ED room label normalization, numeric-aware sorting, and occupied-room helpers.
 * Used by the ED trackboard and room assignment flows — keep logic centralized here.
 */

/** Legacy French waiting-room label persisted in older rows. */
export const ED_LEGACY_WAITING_ROOM_LABEL_FR = "Salle d'attente" as const;

/** Canonical language-neutral storage value for waiting room (preferred for new saves). */
export const ED_CANONICAL_WAITING_ROOM_LABEL = "WAITING_ROOM" as const;

/** @deprecated Use ED_CANONICAL_WAITING_ROOM_LABEL — kept for imports/tests. */
export const ED_DEFAULT_WAITING_ROOM_LABEL = ED_CANONICAL_WAITING_ROOM_LABEL;

const WAITING_ROOM_LABELS_LOWER = new Set([
  ED_CANONICAL_WAITING_ROOM_LABEL.toLowerCase(),
  ED_LEGACY_WAITING_ROOM_LABEL_FR.toLowerCase(),
  "waiting room",
  "waiting",
]);

export const ED_ROOM_OCCUPIED_CODE = "ED_ROOM_OCCUPIED" as const;

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

export type EdRoomOccupancyOverride = {
  requestedRoom: string;
  acceptedRoom: string;
};

export type ResolveEdRoomAssignmentInput = {
  facilityId: string;
  encounterId?: string;
  currentRoomLabel?: string | null;
  requestedRoomRaw: string | null | undefined;
  confirmOccupiedRoomAssignment?: boolean;
  roomOccupancyOverride?: EdRoomOccupancyOverride | null;
  openEncounters: EdRoomOccupancyRow[];
};

export type ResolveEdRoomAssignmentResult =
  | { ok: true; roomLabel: string | null }
  | { ok: false; conflict: EdRoomOccupancyConflict };

/** True when label represents the ED waiting room (any supported legacy/canonical form). */
export function isEdWaitingRoomLabel(raw: string | null | undefined): boolean {
  const normalized = normalizeRoomLabel(raw);
  if (!normalized) return true;
  return WAITING_ROOM_LABELS_LOWER.has(normalized.toLowerCase());
}

/** Normalize room label for persistence (waiting room → canonical WAITING_ROOM). */
export function normalizeEdRoomLabelForStorage(raw: string | null | undefined): string | null {
  const trimmed = (raw ?? "").trim();
  if (!trimmed) return ED_CANONICAL_WAITING_ROOM_LABEL;
  if (isEdWaitingRoomLabel(trimmed)) return ED_CANONICAL_WAITING_ROOM_LABEL;
  const normalized = normalizeRoomLabel(trimmed);
  return (normalized || trimmed).slice(0, 64);
}

function storageRoomLabelsEqual(a: string | null | undefined, b: string | null | undefined): boolean {
  return normalizeEdRoomLabelForStorage(a) === normalizeEdRoomLabelForStorage(b);
}

function sharesNumericBase(requestedRoom: string, acceptedRoom: string): boolean {
  const req = parseRoomSortKey(requestedRoom);
  const acc = parseRoomSortKey(acceptedRoom);
  return req.sortRank === 0 && acc.sortRank === 0 && req.baseNumber === acc.baseNumber;
}

function validateAcceptedSharedRoom(
  requestedRoom: string,
  acceptedRoom: string,
  openEncounters: EdRoomOccupancyRow[],
  options?: { excludeEncounterId?: string; facilityId?: string }
): { ok: true; roomLabel: string } | { ok: false; conflict: EdRoomOccupancyConflict } {
  const requested = normalizeRoomLabel(requestedRoom);
  const accepted = normalizeRoomLabel(acceptedRoom);
  if (!requested || !accepted) {
    return { ok: true, roomLabel: acceptedRoom.trim().slice(0, 64) };
  }
  if (accepted === requested) {
    const conflict = findRoomOccupancyConflict(requested, openEncounters, options);
    if (conflict) return { ok: false, conflict };
    return { ok: true, roomLabel: accepted };
  }
  if (!sharesNumericBase(requested, accepted)) {
    const conflict = findRoomOccupancyConflict(requested, openEncounters, options);
    if (conflict) return { ok: false, conflict };
    return { ok: true, roomLabel: accepted };
  }
  const occupied = findRoomOccupancyConflict(accepted, openEncounters, options);
  if (occupied) {
    const labels = openEncounters
      .filter((e) => isActiveOpenEncounter(e) && rowMatchesFacility(e, options?.facilityId))
      .map((e) => e.roomLabel);
    const next = getNextAvailableSharedRoomLabel(requested, labels);
    return {
      ok: false,
      conflict: {
        occupyingEncounterId: occupied.occupyingEncounterId,
        requestedRoom: requested,
        suggestedRoom: next,
      },
    };
  }
  return { ok: true, roomLabel: accepted };
}

/**
 * Authoritative room assignment resolver for create/update.
 * Never allows saving an exact duplicate numbered room when another open encounter holds it.
 */
export function resolveEdRoomAssignmentForSave(
  input: ResolveEdRoomAssignmentInput
): ResolveEdRoomAssignmentResult {
  const roomLabel = normalizeEdRoomLabelForStorage(input.requestedRoomRaw);
  if (storageRoomLabelsEqual(roomLabel, input.currentRoomLabel)) {
    return { ok: true, roomLabel };
  }
  if (isEdWaitingRoomLabel(roomLabel)) {
    return { ok: true, roomLabel: ED_CANONICAL_WAITING_ROOM_LABEL };
  }
  const normalized = normalizeRoomLabel(roomLabel);
  if (!normalized || !hasNumericEdRoom(normalized)) {
    return { ok: true, roomLabel };
  }

  const options = {
    excludeEncounterId: input.encounterId,
    facilityId: input.facilityId,
  };
  const conflict = findRoomOccupancyConflict(normalized, input.openEncounters, options);
  if (!conflict) {
    return { ok: true, roomLabel: normalized };
  }

  const wantsOverride =
    input.confirmOccupiedRoomAssignment === true || input.roomOccupancyOverride != null;
  if (!wantsOverride) {
    return { ok: false, conflict };
  }

  const overrideRequested = normalizeRoomLabel(input.roomOccupancyOverride?.requestedRoom ?? normalized);
  const acceptedCandidate = normalizeRoomLabel(
    input.roomOccupancyOverride?.acceptedRoom ?? conflict.suggestedRoom
  );
  if (overrideRequested && overrideRequested !== normalized) {
    return { ok: false, conflict };
  }

  const accepted = validateAcceptedSharedRoom(normalized, acceptedCandidate, input.openEncounters, options);
  if (!accepted.ok) {
    return { ok: false, conflict: accepted.conflict };
  }
  return { ok: true, roomLabel: accepted.roomLabel };
}

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
