/**
 * M1.6C — Enterprise medication search / alias readiness validation.
 */

import {
  ENTERPRISE_MEDICATION_ALIAS_MANIFEST,
  ENTERPRISE_MEDICATION_REQUIRED_SEARCH_PAIRS,
  type EnterpriseMedicationSearchCatalogHit,
  type EnterpriseMedicationSearchPair,
} from "./enterpriseMedicationAliasManifest.js";
import {
  buildEnterpriseMedicationSearchQueryExpansions,
  normalizeEnterpriseSearchToken,
} from "./enterpriseMedicationSearchExpansion.js";

export { normalizeEnterpriseSearchToken } from "./enterpriseMedicationSearchExpansion.js";

export type EnterpriseMedicationSearchReadinessReport = {
  readinessPct: number;
  pairPassCount: number;
  pairTotal: number;
  aliasCoveragePct: number;
  manifestRowsCovered: number;
  manifestRowsTotal: number;
  gaps: string[];
};

function catalogMatchesQuery(catalog: EnterpriseMedicationSearchCatalogHit, query: string): boolean {
  const q = normalizeEnterpriseSearchToken(query);
  if (!q) return false;
  if (normalizeEnterpriseSearchToken(catalog.genericName ?? "").includes(q)) return true;
  if ((catalog.searchText ?? "").toLowerCase().includes(q)) return true;
  return catalog.aliases.some((a) => {
    const alias = normalizeEnterpriseSearchToken(a);
    return alias.includes(q) || q.includes(alias);
  });
}

function catalogsForPair(
  catalogs: EnterpriseMedicationSearchCatalogHit[],
  pair: EnterpriseMedicationSearchPair
): EnterpriseMedicationSearchCatalogHit[] {
  if (pair.catalogCode) {
    const row = catalogs.find((c) => c.catalogCode === pair.catalogCode);
    return row ? [row] : [];
  }
  return catalogs.filter((c) =>
    normalizeEnterpriseSearchToken(c.genericName ?? "").includes(normalizeEnterpriseSearchToken(pair.generic))
  );
}

export function validateEnterpriseMedicationSearchPair(
  catalogs: EnterpriseMedicationSearchCatalogHit[],
  pair: EnterpriseMedicationSearchPair
): { pass: boolean; genericHits: number; brandHits: number } {
  const scoped = catalogsForPair(catalogs, pair);
  const genericHits = scoped.filter((c) => catalogMatchesQuery(c, pair.generic)).length;
  const brandHits = scoped.filter((c) => catalogMatchesQuery(c, pair.brand)).length;
  return {
    pass: genericHits > 0 && brandHits > 0,
    genericHits,
    brandHits,
  };
}

export function validateEnterpriseAliasManifestPersisted(
  catalog: EnterpriseMedicationSearchCatalogHit | null,
  manifestAliases: readonly string[]
): { pass: boolean; failures: string[] } {
  const failures: string[] = [];
  if (!catalog) {
    failures.push("catalog row missing");
    return { pass: false, failures };
  }
  const persisted = new Set(catalog.aliases.map((a) => normalizeEnterpriseSearchToken(a)));
  for (const alias of manifestAliases) {
    const key = normalizeEnterpriseSearchToken(alias);
    if (key.length < 2) continue;
    if (!persisted.has(key)) {
      failures.push(`alias not persisted: ${alias}`);
    }
  }
  return { pass: failures.length === 0, failures };
}

export function queryExpansionResolvesTypo(typo: string, canonical: string): boolean {
  const expansions = buildEnterpriseMedicationSearchQueryExpansions();
  const terms = expansions[normalizeEnterpriseSearchToken(typo)] ?? [normalizeEnterpriseSearchToken(typo)];
  const target = normalizeEnterpriseSearchToken(canonical);
  return terms.some((t) => t === target || t.includes(target));
}

export function computeEnterpriseMedicationSearchReadiness(
  catalogs: EnterpriseMedicationSearchCatalogHit[]
): EnterpriseMedicationSearchReadinessReport {
  const gaps: string[] = [];
  const pairResults = ENTERPRISE_MEDICATION_REQUIRED_SEARCH_PAIRS.map((pair) => {
    const result = validateEnterpriseMedicationSearchPair(catalogs, pair);
    if (!result.pass) {
      gaps.push(
        `pair fail: ${pair.generic}/${pair.brand} (genericHits=${result.genericHits}, brandHits=${result.brandHits})`
      );
    }
    return result;
  });
  const pairPassCount = pairResults.filter((r) => r.pass).length;
  const pairTotal = ENTERPRISE_MEDICATION_REQUIRED_SEARCH_PAIRS.length;
  const pairScore = pairTotal === 0 ? 100 : Math.round((pairPassCount / pairTotal) * 100);

  let manifestRowsCovered = 0;
  for (const entry of ENTERPRISE_MEDICATION_ALIAS_MANIFEST) {
    const catalog = catalogs.find((c) => c.catalogCode === entry.catalogCode) ?? null;
    const aliasTexts = entry.aliases.map((a) => a.text);
    const check = validateEnterpriseAliasManifestPersisted(catalog, aliasTexts);
    if (check.pass) manifestRowsCovered += 1;
    else if (catalog) {
      gaps.push(`${entry.catalogCode}: ${check.failures.slice(0, 2).join("; ")}`);
    }
  }
  const manifestRowsTotal = ENTERPRISE_MEDICATION_ALIAS_MANIFEST.length;
  const aliasCoveragePct =
    manifestRowsTotal === 0 ? 0 : Math.round((manifestRowsCovered / manifestRowsTotal) * 100);

  const readinessPct = Math.round(pairScore * 0.55 + aliasCoveragePct * 0.45);

  return {
    readinessPct,
    pairPassCount,
    pairTotal,
    aliasCoveragePct,
    manifestRowsCovered,
    manifestRowsTotal,
    gaps: gaps.slice(0, 25),
  };
}
