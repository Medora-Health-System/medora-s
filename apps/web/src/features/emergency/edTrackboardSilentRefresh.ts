/** Snapshot for comparing encounter list payloads without replacing equivalent rows. */
export function encounterRowsSnapshot<T extends { id: string; updatedAt?: string | null }>(
  rows: readonly T[]
): string {
  return rows
    .map((row) => `${row.id}:${row.updatedAt ?? ""}`)
    .sort()
    .join("|");
}

export function shouldReplaceEncounterRows<T extends { id: string; updatedAt?: string | null }>(
  prev: readonly T[],
  next: readonly T[]
): boolean {
  return encounterRowsSnapshot(prev) !== encounterRowsSnapshot(next);
}
