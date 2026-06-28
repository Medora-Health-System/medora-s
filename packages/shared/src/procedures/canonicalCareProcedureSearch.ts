import {
  activeCanonicalCareProcedureCatalog,
  canonicalCareProcedureByCode,
  type CanonicalCareProcedureRow,
} from "./canonicalCareProcedureCatalog.js";
import { canonicalCareProcedureCategoryLabel } from "./canonicalCareProcedureCategories.js";
import type { CanonicalCareProcedureCategory } from "./canonicalCareProcedureCategories.js";

export type CanonicalCareProcedureSearchLocale = "en" | "fr";

function normalizeSearchText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function searchableHaystack(row: CanonicalCareProcedureRow, locale: CanonicalCareProcedureSearchLocale): string {
  const otherLocale = locale === "en" ? "fr" : "en";
  return normalizeSearchText(
    [
      row.code.replace(/_/g, " "),
      row.displayNameEn,
      row.displayNameFr,
      canonicalCareProcedureCategoryLabel(row.category, locale),
      canonicalCareProcedureCategoryLabel(row.category, otherLocale),
      ...row.aliases,
    ].join(" ")
  );
}

export function canonicalCareProcedureMatchTier(
  query: string,
  row: CanonicalCareProcedureRow,
  locale: CanonicalCareProcedureSearchLocale,
  aliasHits: string[] = row.aliases
): number {
  const q = normalizeSearchText(query);
  if (!q) return 9;
  const code = normalizeSearchText(row.code);
  if (code === q) return 0;
  const aliases = aliasHits.map(normalizeSearchText);
  if (aliases.some((alias) => alias === q)) return 1;
  const display = normalizeSearchText(locale === "fr" ? row.displayNameFr : row.displayNameEn);
  if (display.startsWith(q)) return 2;
  if (display.includes(q)) return 3;
  const haystack = searchableHaystack(row, locale);
  const tokens = q.split(" ").filter(Boolean);
  if (tokens.length > 0 && tokens.every((token) => haystack.includes(token))) return 4;
  return 9;
}

export function searchCanonicalCareProcedures(input: {
  q: string;
  locale?: CanonicalCareProcedureSearchLocale;
  category?: CanonicalCareProcedureCategory | null;
  limit?: number;
  catalog?: readonly CanonicalCareProcedureRow[];
}): CanonicalCareProcedureRow[] {
  const locale = input.locale ?? "en";
  const limit = Math.min(Math.max(input.limit ?? 20, 1), 50);
  const q = input.q.trim();
  const catalog = input.catalog ?? activeCanonicalCareProcedureCatalog();
  const filtered = input.category
    ? catalog.filter((row) => row.category === input.category)
    : catalog;

  if (!q) {
    return filtered.slice(0, limit);
  }

  const scored = filtered
    .map((row) => ({ row, tier: canonicalCareProcedureMatchTier(q, row, locale) }))
    .filter((entry) => entry.tier < 9)
    .sort((a, b) => {
      if (a.tier !== b.tier) return a.tier - b.tier;
      if (a.row.sortPriority !== b.row.sortPriority) return a.row.sortPriority - b.row.sortPriority;
      return a.row.displayNameEn.localeCompare(b.row.displayNameEn, "en");
    });

  return scored.slice(0, limit).map((entry) => entry.row);
}

export function resolveCanonicalCareProcedureDisplayName(
  code: string,
  locale: CanonicalCareProcedureSearchLocale
): string | undefined {
  const row = canonicalCareProcedureByCode(code);
  if (!row) return undefined;
  return locale === "fr" ? row.displayNameFr : row.displayNameEn;
}
