import { applyEncounterRoomAssignmentUpdate } from "@/lib/applyEncounterRoomAssignmentUpdate";
import type { EncounterRoomUpdateResponse } from "@/lib/roomAssignmentApi";
import { shouldReplaceEncounterRows } from "@/features/emergency/edTrackboardSilentRefresh";

export type TrackboardEncounterRow = {
  id: string;
  updatedAt?: string | null;
  roomLabel?: string | null;
  type?: string | null;
  admissionSummaryJson?: unknown;
  governedRoomDisplay?: string | null;
  governedRoomUnit?: string | null;
  governedRoomHasAssignment?: boolean;
};

function pickRoomOverlayFields<T extends TrackboardEncounterRow>(row: T): Partial<T> {
  return {
    roomLabel: row.roomLabel,
    governedRoomDisplay: row.governedRoomDisplay,
    governedRoomUnit: row.governedRoomUnit,
    governedRoomHasAssignment: row.governedRoomHasAssignment,
    type: row.type,
    updatedAt: row.updatedAt,
  } as Partial<T>;
}

function roomFieldsMatch(
  a: Pick<TrackboardEncounterRow, "roomLabel" | "governedRoomDisplay">,
  b: Pick<TrackboardEncounterRow, "roomLabel" | "governedRoomDisplay">
): boolean {
  return a.roomLabel === b.roomLabel && a.governedRoomDisplay === b.governedRoomDisplay;
}

/** Immediate optimistic trackboard row patch after room assignment success. */
export function applyTrackboardRoomMutationPatch<T extends TrackboardEncounterRow>(
  rows: readonly T[],
  patch: EncounterRoomUpdateResponse
): T[] {
  const encounterId = patch.id;
  if (!encounterId) return [...rows];
  return rows.map((row) =>
    row.id === encounterId ? applyEncounterRoomAssignmentUpdate(row, patch) : row
  );
}

/** Merge silent refresh payload without clobbering newer local room patches. */
export function mergeTrackboardEncounterUpdate<T extends TrackboardEncounterRow>(
  prev: readonly T[],
  next: readonly T[],
  pendingRoomPatches: ReadonlyMap<string, EncounterRoomUpdateResponse>
): T[] {
  if (pendingRoomPatches.size === 0) {
    return shouldReplaceEncounterRows(prev, next) ? [...next] : [...prev];
  }

  const prevById = new Map(prev.map((row) => [row.id, row]));
  const merged = next.map((row) => {
    const patch = pendingRoomPatches.get(row.id);
    if (!patch) return row;

    const localRow = prevById.get(row.id);
    const patchedLocal = localRow
      ? applyEncounterRoomAssignmentUpdate(localRow, patch)
      : applyEncounterRoomAssignmentUpdate({ id: row.id } as T, patch);

    if (roomFieldsMatch(row, patchedLocal)) {
      return row;
    }
    return { ...row, ...pickRoomOverlayFields(patchedLocal) };
  });

  if (!shouldReplaceEncounterRows(prev, next) && pendingRoomPatches.size > 0) {
    const nextIds = new Set(next.map((row) => row.id));
    for (const row of prev) {
      if (!nextIds.has(row.id) && pendingRoomPatches.has(row.id)) {
        merged.push(row);
      }
    }
  }

  return merged;
}

/** Drop pending room patches once server rows reconcile with optimistic state. */
export function reconcilePendingRoomPatches<T extends TrackboardEncounterRow>(
  rows: readonly T[],
  pendingRoomPatches: Map<string, EncounterRoomUpdateResponse>
): void {
  for (const [encounterId, patch] of [...pendingRoomPatches.entries()]) {
    const row = rows.find((candidate) => candidate.id === encounterId);
    if (!row) continue;
    const patched = applyEncounterRoomAssignmentUpdate(row, patch);
    if (roomFieldsMatch(row, patched)) {
      pendingRoomPatches.delete(encounterId);
    }
  }
}
