/**
 * Medication catalog search helpers — query expansion and tokenization.
 * Brand/generic aliases are search hints only; doses are never invented.
 */

import {
  buildEnterpriseMedicationSearchQueryExpansions,
  getHaitiLegacyActiveCatalogCodes,
} from "@medora/shared";

/** Legacy prefix hints (kept for backward compatibility). */
export const MEDICATION_SEARCH_QUERY_ALIASES: Record<string, readonly string[]> = {
  jard: ["empagliflozin", "jardiance"],
  jardiance: ["empagliflozin"],
  lipitor: ["atorvastatin"],
  atorvas: ["atorvastatin"],
  atorvastat: ["atorvastatin"],
  norvasc: ["amlodipine"],
  glucophage: ["metformin"],
  zestril: ["lisinopril"],
  prinivil: ["lisinopril"],
};

/** M1.6C — enterprise manifest expansions (brand/generic/typo; no cross-drug fuzzy match). */
const ENTERPRISE_MEDICATION_SEARCH_EXPANSIONS = buildEnterpriseMedicationSearchQueryExpansions();

const MERGED_MEDICATION_SEARCH_ALIASES: Record<string, readonly string[]> = {
  ...ENTERPRISE_MEDICATION_SEARCH_EXPANSIONS,
  ...MEDICATION_SEARCH_QUERY_ALIASES,
};

function normalizeSearchToken(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Expand user query with safe brand/generic aliases (no dose/route invention). */
export function expandMedicationSearchQuery(rawQuery: string): string[] {
  const q = normalizeSearchToken(rawQuery);
  if (!q) return [];

  const terms = new Set<string>([q]);

  const aliasHits = MERGED_MEDICATION_SEARCH_ALIASES[q];
  if (aliasHits) {
    for (const alias of aliasHits) terms.add(normalizeSearchToken(alias));
  }

  for (const [prefix, aliases] of Object.entries(MERGED_MEDICATION_SEARCH_ALIASES)) {
    if (q.startsWith(prefix) && q.length >= 3) {
      for (const alias of aliases) terms.add(normalizeSearchToken(alias));
    }
  }

  return [...terms];
}

export function tokenizeMedicationSearchQuery(rawQuery: string): string[] {
  return normalizeSearchToken(rawQuery)
    .split(/\s+/)
    .filter((token) => token.length >= 2);
}

/** Build Prisma OR clauses for catalog medication text fields. */
export function catalogMedicationTextMatchOr(term: string): Array<Record<string, unknown>> {
  const mode = "insensitive" as const;
  return [
    { code: { contains: term, mode } },
    { name: { contains: term, mode } },
    { genericName: { contains: term, mode } },
    { displayNameEn: { contains: term, mode } },
    { displayNameFr: { contains: term, mode } },
    { strength: { contains: term, mode } },
    { searchText: { contains: term, mode } },
    { dosageForm: { contains: term, mode } },
    { route: { contains: term, mode } },
    { therapeuticClass: { contains: term, mode } },
  ];
}

/** Combined OR for expanded query terms (any term matching any field). */
export function buildCatalogMedicationSearchWhere(terms: string[]): { OR: Array<Record<string, unknown>> } {
  const or: Array<Record<string, unknown>> = [];
  for (const term of terms) {
    or.push(...catalogMedicationTextMatchOr(term));
  }
  return { OR: or };
}

/** M1.7C.12B — Haiti essentials wrongly deactivated by Wave 4 ENRICH remain provider-searchable. */
export function buildLegacyPreservationCatalogWhere(
  terms: string[]
): { isActive: false; code: { in: string[] }; OR: Array<Record<string, unknown>> } {
  return {
    isActive: false,
    code: { in: [...getHaitiLegacyActiveCatalogCodes()] },
    ...buildCatalogMedicationSearchWhere(terms),
  };
}

export function buildCatalogMedicationVisibilityWhere(
  terms: string[]
): { OR: Array<Record<string, unknown>> } {
  return {
    OR: [{ isActive: true, ...buildCatalogMedicationSearchWhere(terms) }, buildLegacyPreservationCatalogWhere(terms)],
  };
}

export function buildCatalogMedicationAliasVisibilityWhere(
  catalogIds: string[]
): { id: { in: string[] }; OR: Array<Record<string, unknown>> } {
  return {
    id: { in: catalogIds },
    OR: [{ isActive: true }, { isActive: false, code: { in: [...getHaitiLegacyActiveCatalogCodes()] } }],
  };
}
