/**
 * Ranking for catalog autocomplete: lower score sorts first.
 *
 * Provider-oriented tiers (deterministic):
 * 0 exact active brand-alias match
 * 1 exact active generic/name/display/code match
 * 2 brand-alias prefix (token-boundary)
 * 3 generic/name/display/code prefix
 * 4 exact normalized alias / ingredient-combination alias match (non-brand)
 * 5 brand/generic token-prefix in searchText
 * 6 synonym / alias-only path (legacy)
 * 7 bounded contains (token-boundary)
 * 8 mid-string fuzzy contains (penalized; suppressed for short queries)
 * 9 no match
 */
export type CatalogRankableRow = {
  code: string;
  name: string;
  displayNameEn?: string | null;
  displayNameFr?: string | null;
  genericName?: string | null;
  searchText?: string | null;
  isEssential: boolean;
  sortPriority: number;
};

function norm(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

function tokenize(value: string): string[] {
  return norm(value)
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= 2);
}

/** True when needle matches a whole token prefix (jardiance←jar, not mounjaro←jar). */
export function tokenPrefixMatch(haystack: string, needle: string): boolean {
  const n = norm(needle);
  if (!n) return false;
  return tokenize(haystack).some((token) => token.startsWith(n));
}

export function tokenExactMatch(haystack: string, needle: string): boolean {
  const n = norm(needle);
  if (!n) return false;
  return tokenize(haystack).some((token) => token === n);
}

export function matchTierForQuery(
  q: string,
  row: CatalogRankableRow,
  opts: { aliasOnlyMatch: boolean; aliases?: readonly string[] } = { aliasOnlyMatch: false }
): number {
  const ql = norm(q);
  if (!ql) return 9;

  const aliases = (opts.aliases ?? []).map(norm).filter(Boolean);
  const code = norm(row.code);
  const name = norm(row.name);
  const den = norm(row.displayNameEn);
  const dfr = norm(row.displayNameFr);
  const generic = norm(row.genericName);
  const st = norm(row.searchText);
  const shortQuery = ql.length <= 3;

  if (aliases.some((alias) => alias === ql)) return 0;

  if (code === ql || name === ql || den === ql || dfr === ql || generic === ql) return 1;

  if (aliases.some((alias) => alias.startsWith(ql) || tokenPrefixMatch(alias, ql))) return 2;

  if (
    code.startsWith(ql) ||
    name.startsWith(ql) ||
    den.startsWith(ql) ||
    dfr.startsWith(ql) ||
    generic.startsWith(ql)
  ) {
    return 3;
  }

  if (aliases.some((alias) => tokenExactMatch(alias, ql))) return 4;

  if (tokenPrefixMatch(st, ql) || aliases.some((alias) => tokenPrefixMatch(alias, ql))) return 5;

  if (opts.aliasOnlyMatch) return 6;

  const boundaryContains =
    tokenPrefixMatch(name, ql) ||
    tokenPrefixMatch(den, ql) ||
    tokenPrefixMatch(dfr, ql) ||
    tokenPrefixMatch(generic, ql) ||
    tokenPrefixMatch(st, ql) ||
    aliases.some((alias) => tokenPrefixMatch(alias, ql));
  if (boundaryContains) return 7;

  if (shortQuery) {
    // Short queries: do not promote mid-string collisions (e.g. mounjaro ⊃ "jar").
    return 9;
  }

  const midString =
    code.includes(ql) ||
    name.includes(ql) ||
    den.includes(ql) ||
    dfr.includes(ql) ||
    generic.includes(ql) ||
    st.includes(ql) ||
    aliases.some((alias) => alias.includes(ql));
  if (midString) return 8;

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

/** Pick best brand alias for display when the query matches a brand family. */
export function resolveMatchedBrandAlias(
  q: string,
  aliases: readonly string[],
  searchTerms: readonly string[] = []
): string | null {
  const ql = norm(q);
  const terms = new Set([ql, ...searchTerms.map(norm)].filter(Boolean));
  const normalized = aliases.map((a) => a.trim()).filter((a) => a.length >= 2);
  if (normalized.length === 0) return null;

  const exact = normalized.find((a) => terms.has(norm(a)));
  if (exact) return exact;

  const prefix = normalized.find((a) => {
    const al = norm(a);
    return [...terms].some((t) => t.length >= 3 && (al.startsWith(t) || tokenPrefixMatch(al, t)));
  });
  return prefix ?? null;
}
