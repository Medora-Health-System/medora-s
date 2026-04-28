/**
 * Ranking for catalog autocomplete: lower score sorts first.
 * Match tier: exact (0) < prefix (1) < alias-only path (2) < contains (3).
 * Boost: essential first, then lower sortPriority, then name.
 */
export type CatalogRankableRow = {
  code: string;
  name: string;
  displayNameEn?: string | null;
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
  const den = (row.displayNameEn ?? "").toLowerCase();
  const dfr = (row.displayNameFr ?? "").toLowerCase();
  const st = (row.searchText ?? "").toLowerCase();

  const exact =
    code === ql || name === ql || den === ql || dfr === ql || (st.length > 0 && st === ql);
  if (exact) return 0;

  const prefix =
    code.startsWith(ql) ||
    name.startsWith(ql) ||
    den.startsWith(ql) ||
    dfr.startsWith(ql) ||
    st.startsWith(ql);
  if (prefix) return 1;

  if (opts.aliasOnlyMatch) return 2;

  const contains =
    code.includes(ql) ||
    name.includes(ql) ||
    den.includes(ql) ||
    dfr.includes(ql) ||
    st.includes(ql);
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

export type OrderCatalogRankableRow = {
  code: string;
  name: string;
  displayNameEn?: string | null;
  displayNameFr?: string | null;
  searchText?: string | null;
  isActive?: boolean;
};

function normalizeCatalogText(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

function displayLabel(row: OrderCatalogRankableRow): string {
  return row.displayNameEn?.trim() || row.displayNameFr?.trim() || row.name?.trim() || row.code;
}

function tokenizeQuery(q: string): string[] {
  return normalizeCatalogText(q)
    .split(/\s+/)
    .filter((token) => token.length >= 2);
}

export function orderCatalogMatchTierForQuery(
  q: string,
  row: OrderCatalogRankableRow,
  opts: { aliases?: string[] } = {}
): number {
  const ql = normalizeCatalogText(q);
  if (!ql) return 9;

  const aliases = (opts.aliases ?? []).map(normalizeCatalogText).filter(Boolean);
  if (aliases.some((alias) => alias === ql)) return 0;

  const code = normalizeCatalogText(row.code);
  if (code === ql) return 1;

  const names = [row.displayNameEn, row.displayNameFr, row.name].map(normalizeCatalogText).filter(Boolean);
  if (names.some((name) => name.startsWith(ql))) return 2;
  if (names.some((name) => name.includes(ql))) return 3;

  const haystacks = [...names, normalizeCatalogText(row.searchText), code, ...aliases].filter(Boolean);
  const tokens = tokenizeQuery(ql);
  if (tokens.length > 0 && tokens.every((token) => haystacks.some((value) => value.includes(token)))) {
    return 4;
  }

  return 9;
}

export function compareOrderCatalogRows(
  a: { row: OrderCatalogRankableRow; tier: number },
  b: { row: OrderCatalogRankableRow; tier: number }
): number {
  if (a.tier !== b.tier) return a.tier - b.tier;
  if (a.row.isActive !== b.row.isActive) return a.row.isActive ? -1 : 1;

  const aLabel = displayLabel(a.row);
  const bLabel = displayLabel(b.row);
  if (aLabel.length !== bLabel.length) return aLabel.length - bLabel.length;
  return aLabel.localeCompare(bLabel, "fr");
}
