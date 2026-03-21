/**
 * Ranking for catalog autocomplete: lower score sorts first.
 * Match tier: exact (0) < prefix (1) < alias-only path (2) < contains (3).
 * Boost: essential first, then lower sortPriority, then name.
 */
export type CatalogRankableRow = {
  code: string;
  name: string;
  displayNameFr?: string | null;
  searchText?: string | null;
  isEssential: boolean;
  sortPriority: number;
};

export function matchTierForQuery(
  q: string,
  row: CatalogRankableRow,
  opts: { aliasOnlyMatch: boolean }
): number {
  const ql = q.trim().toLowerCase();
  if (!ql) return 9;
  const code = (row.code ?? "").toLowerCase();
  const name = (row.name ?? "").toLowerCase();
  const dfr = (row.displayNameFr ?? "").toLowerCase();
  const st = (row.searchText ?? "").toLowerCase();

  const exact = code === ql || name === ql || dfr === ql || (st.length > 0 && st === ql);
  if (exact) return 0;

  const prefix =
    code.startsWith(ql) || name.startsWith(ql) || dfr.startsWith(ql) || st.startsWith(ql);
  if (prefix) return 1;

  if (opts.aliasOnlyMatch) return 2;

  const contains =
    code.includes(ql) || name.includes(ql) || dfr.includes(ql) || st.includes(ql);
  if (contains) return 3;

  return 9;
}

export function compareCatalogRows(
  a: { row: CatalogRankableRow; tier: number },
  b: { row: CatalogRankableRow; tier: number }
): number {
  if (a.tier !== b.tier) return a.tier - b.tier;
  if (a.row.isEssential !== b.row.isEssential) return a.row.isEssential ? -1 : 1;
  if (a.row.sortPriority !== b.row.sortPriority) return a.row.sortPriority - b.row.sortPriority;
  return a.row.name.localeCompare(b.row.name, "fr");
}

export function truncateSearchText(raw: string | null | undefined, max = 180): string | undefined {
  if (raw == null || !String(raw).trim()) return undefined;
  const s = String(raw).replace(/\s+/g, " ").trim();
  if (s.length <= max) return s;
  return `${s.slice(0, max - 1)}…`;
}
