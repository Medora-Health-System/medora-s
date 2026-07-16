/**
 * ICD-10-CM catalog search SQL builders (shared by API + certification).
 *
 * Pipeline (architecture):
 *   Diagnosis Search Box
 *     → searchIcd10Catalog / French alias query expansion (web)
 *     → GET /diagnoses/icd10/search
 *     → DiagnosesController.searchIcd10
 *     → Icd10CatalogService.search
 *     → this module (match + ranking fragments)
 *     → Icd10DiagnosisCode (Prisma $queryRaw)
 *
 * Duplicate source (production audit):
 *   @@unique([codeSystem, releaseVersion, code]) allows the same ICD code
 *   in FY2026, UNSPECIFIED, and FY2026-MEDORA-DEV-SAMPLE simultaneously.
 *   Match OR across short/long/searchText does NOT multiply rows; multi-release
 *   catalog rows do. Alias expansion only widens predicates — it must not emit
 *   an extra visible row for the same ICD code. Collapse by `code` happens in
 *   the select builder (one official row per code).
 *
 * Not the source of duplicates:
 *   COMMON_DIAGNOSES (UI shortcuts), search cache, autocomplete index,
 *   Prisma include(), UNION ALL, or multiple search providers.
 */

import { Prisma } from "@prisma/client";
import { normalizeIcd10CodeForLookup } from "@medora/shared";
import { resolveIcd10ClinicalQueryExpansion } from "./icd10-clinical-query-expansion";

export type Icd10CatalogSearchRow = {
  id: string;
  code: string;
  normalizedCode: string;
  shortDescription: string;
  longDescription: string | null;
  chapter: string | null;
  category: string | null;
  isBillable: boolean;
  effectiveYear: number | null;
  codeSetVersion: string | null;
};

export type Icd10CatalogSearchMatch = {
  matchSql: Prisma.Sql;
  tokenRankSql: Prisma.Sql;
  codeExactSql: Prisma.Sql;
  codePrefixSql: Prisma.Sql;
  shortExactSql: Prisma.Sql;
  shortPrefixSql: Prisma.Sql;
  shortContainsSql: Prisma.Sql;
  longContainsSql: Prisma.Sql;
  expansionRankSql: Prisma.Sql;
};

function joinSqlOr(conditions: Prisma.Sql[]) {
  return conditions.reduce((acc, condition, index) => {
    if (index === 0) return condition;
    return Prisma.sql`${acc} OR ${condition}`;
  }, Prisma.empty);
}

/** Prefer official fiscal releases over legacy UNSPECIFIED and DEV-SAMPLE. */
export function icd10ReleasePreferenceOrderSql(): Prisma.Sql {
  return Prisma.sql`
    CASE
      WHEN "releaseVersion" LIKE '%DEV-SAMPLE%' THEN 2
      WHEN "releaseVersion" = 'UNSPECIFIED' OR "releaseVersion" = '' THEN 1
      ELSE 0
    END ASC
  `;
}

/**
 * Build match predicates + ranking fragments for a raw user query.
 * Returns null when the query cannot produce a useful match clause.
 */
export function buildIcd10CatalogSearchMatch(rawInput: string): Icd10CatalogSearchMatch | null {
  const raw = rawInput?.trim() ?? "";
  if (!raw) return null;

  const norm = normalizeIcd10CodeForLookup(raw);
  const tokens = raw.split(/\s+/).filter(Boolean);
  const pattern = raw.length >= 2 ? `%${raw}%` : null;
  const normPrefix = norm.length > 0 ? `${norm}%` : null;
  const rawPrefix = raw.length > 0 ? `${raw}%` : null;
  const lowerPattern = raw.length >= 2 ? `%${raw.toLowerCase()}%` : null;

  const or: Prisma.Sql[] = [];
  const expansion = resolveIcd10ClinicalQueryExpansion(raw);

  if (normPrefix) {
    or.push(Prisma.sql`"normalizedCode" ILIKE ${normPrefix}`);
    or.push(Prisma.sql`"code" ILIKE ${rawPrefix}`);
  }
  if (pattern) {
    or.push(Prisma.sql`"shortDescription" ILIKE ${pattern}`);
    or.push(Prisma.sql`"longDescription" ILIKE ${pattern}`);
    or.push(Prisma.sql`"searchText" ILIKE ${lowerPattern}`);
  }
  for (const phrase of expansion?.anyOf ?? []) {
    if (phrase.length < 2) continue;
    const p = `%${phrase}%`;
    const lp = `%${phrase.toLowerCase()}%`;
    or.push(Prisma.sql`"shortDescription" ILIKE ${p}`);
    or.push(Prisma.sql`"longDescription" ILIKE ${p}`);
    or.push(Prisma.sql`"searchText" ILIKE ${lp}`);
  }
  if (expansion?.allOf && expansion.allOf.length > 0) {
    const andParts = expansion.allOf.map((phrase) => {
      const p = `%${phrase}%`;
      const lp = `%${phrase.toLowerCase()}%`;
      return Prisma.sql`(
        "shortDescription" ILIKE ${p}
        OR "longDescription" ILIKE ${p}
        OR "searchText" ILIKE ${lp}
      )`;
    });
    or.push(andParts.reduce((acc, part, index) => (index === 0 ? part : Prisma.sql`${acc} AND ${part}`)));
  }
  const tokenConditions: Prisma.Sql[] = [];
  // Skip noisy token OR when a clinical expansion is active (avoids "ACL" → MacLeod).
  if (!expansion) {
    for (const t of tokens) {
      if (t.length < 2) continue;
      const tokenPattern = `%${t}%`;
      const condition = Prisma.sql`"shortDescription" ILIKE ${tokenPattern}`;
      tokenConditions.push(condition);
      or.push(condition);
    }
  }

  if (or.length === 0) return null;

  const expansionShortPhrases = [...(expansion?.anyOf ?? []), ...(expansion?.allOf ?? [])].filter(
    (phrase) => phrase.length >= 2,
  );

  return {
    matchSql: joinSqlOr(or),
    tokenRankSql: tokenConditions.length > 0 ? joinSqlOr(tokenConditions) : Prisma.sql`FALSE`,
    codeExactSql:
      norm.length > 0
        ? Prisma.sql`LOWER("normalizedCode") = LOWER(${norm}) OR LOWER("code") = LOWER(${raw})`
        : Prisma.sql`FALSE`,
    codePrefixSql:
      normPrefix && rawPrefix
        ? Prisma.sql`"normalizedCode" ILIKE ${normPrefix} OR "code" ILIKE ${rawPrefix}`
        : Prisma.sql`FALSE`,
    shortExactSql: Prisma.sql`LOWER("shortDescription") = LOWER(${raw})`,
    shortPrefixSql: rawPrefix ? Prisma.sql`"shortDescription" ILIKE ${rawPrefix}` : Prisma.sql`FALSE`,
    shortContainsSql: pattern ? Prisma.sql`"shortDescription" ILIKE ${pattern}` : Prisma.sql`FALSE`,
    longContainsSql: pattern ? Prisma.sql`"longDescription" ILIKE ${pattern}` : Prisma.sql`FALSE`,
    expansionRankSql:
      expansionShortPhrases.length > 0
        ? expansionShortPhrases
            .map((phrase) => Prisma.sql`"shortDescription" ILIKE ${`%${phrase}%`}`)
            .reduce((acc, part, index) => (index === 0 ? part : Prisma.sql`${acc} OR ${part}`))
        : Prisma.sql`FALSE`,
  };
}

/** Visible result ranking across distinct ICD codes (release already collapsed). */
export function icd10MatchQualityOrderSql(match: Icd10CatalogSearchMatch): Prisma.Sql {
  return Prisma.sql`
    CASE
      WHEN ${match.codeExactSql} THEN 1
      WHEN ${match.codePrefixSql} THEN 2
      WHEN ${match.shortExactSql} THEN 3
      WHEN ${match.shortPrefixSql} THEN 4
      WHEN ${match.expansionRankSql} THEN 5
      WHEN ${match.shortContainsSql} THEN 6
      WHEN ${match.longContainsSql} THEN 7
      WHEN ${match.tokenRankSql} THEN 8
      ELSE 9
    END ASC,
    "isBillable" DESC,
    CASE
      WHEN RIGHT(REPLACE("code", '.', ''), 1) = 'A' THEN 0
      WHEN RIGHT(REPLACE("code", '.', ''), 1) = 'D' THEN 1
      WHEN RIGHT(REPLACE("code", '.', ''), 1) = 'S' THEN 2
      ELSE 0
    END ASC,
    CASE
      WHEN "code" LIKE 'S%' OR "code" LIKE 'M66%' OR "code" LIKE 'M75%' THEN 0
      ELSE 1
    END ASC,
    LENGTH("shortDescription") ASC,
    "code" ASC
  `;
}

/**
 * One visible row per ICD code.
 * Inner DISTINCT ON picks the preferred release (FY official > UNSPECIFIED > DEV-SAMPLE);
 * outer ORDER BY applies match-quality ranking across distinct codes.
 */
export function buildIcd10CatalogSearchSelectSql(match: Icd10CatalogSearchMatch, take: number): Prisma.Sql {
  const releasePick = icd10ReleasePreferenceOrderSql();
  const qualityOrder = icd10MatchQualityOrderSql(match);
  return Prisma.sql`
    SELECT
      "id",
      "code",
      "normalizedCode",
      "shortDescription",
      "longDescription",
      "chapter",
      "category",
      "isBillable",
      "effectiveYear",
      "codeSetVersion"
    FROM (
      SELECT DISTINCT ON ("code")
        "id",
        "code",
        "normalizedCode",
        "shortDescription",
        "longDescription",
        "chapter",
        "category",
        "isBillable",
        "effectiveYear",
        "codeSetVersion"
      FROM "Icd10DiagnosisCode"
      WHERE "isActive" = TRUE
        AND "isSelectable" = TRUE
        AND (${match.matchSql})
      ORDER BY
        "code",
        ${releasePick},
        "isBillable" DESC,
        COALESCE("releaseYear", 0) DESC,
        "id" ASC
    ) AS one_per_code
    ORDER BY
      ${qualityOrder}
    LIMIT ${take}
  `;
}
