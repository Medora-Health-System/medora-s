/**
 * ICD-10-CM catalog search SQL builders (shared by API + certification).
 *
 * Pipeline:
 *   Diagnosis Search Box
 *     → searchIcd10Catalog / French alias query expansion (web)
 *     → GET /diagnoses/icd10/search
 *     → DiagnosesController.searchIcd10
 *     → Icd10CatalogService.search
 *     → this module (match + ranking fragments)
 *     → Icd10DiagnosisCode (Prisma $queryRaw)
 *     → Icd10TerminologyService.resolveDisplaysForCatalogRows (display only)
 *
 * Ranking uses active-locale clinician labels when present.
 * Matching may use other-locale labels and search aliases.
 * Display is never selected from aliases or other-locale labels here.
 *
 * Duplicate source (production audit):
 *   @@unique([codeSystem, releaseVersion, code]) allows the same ICD code
 *   in FY2026, FY2027, UNSPECIFIED, and FY2026-MEDORA-DEV-SAMPLE simultaneously.
 *   Search MUST filter to the date-of-service release. Do not collapse
 *   FY2026 and FY2027 by code.
 */

import { Prisma } from "@prisma/client";
import {
  classifyIcd10SearchIntent,
  foldIcd10SearchText,
  icd10SearchLooksLikeCode,
  isIcd10SignSymptomQuery,
  normalizeIcd10CodeForLookup,
  resolveIcd10SearchPreferredCodePrefixes,
  resolveIcd10SearchSynonymPhrases,
  tokenizeIcd10SearchQuery,
  type ProductUiLanguage,
} from "@medora/shared";
import { resolveIcd10ClinicalQueryExpansion } from "./icd10-clinical-query-expansion";

export type Icd10CatalogSearchRow = {
  id: string;
  code: string;
  normalizedCode: string;
  codeSystem: string;
  releaseVersion: string;
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
  terminologyExactSql: Prisma.Sql;
  aliasMatchSql: Prisma.Sql;
  localeLabelExactSql: Prisma.Sql;
  localePhraseSql: Prisma.Sql;
  englishPhraseSql: Prisma.Sql;
  synonymPhraseSql: Prisma.Sql;
  allTokensLocaleSql: Prisma.Sql;
  allTokensEnglishSql: Prisma.Sql;
  aliasExactSql: Prisma.Sql;
  searchIntent: ReturnType<typeof classifyIcd10SearchIntent>;
  locale: ProductUiLanguage;
  foldedQuery: string;
  significantTokens: string[];
  synonymPhrases: string[];
  isCodeQuery: boolean;
  retrievalCatalogPatterns: string[];
  retrievalLabelPatterns: string[];
  retrievalCatalogPrefixPatterns: string[];
  retrievalTokenAndGroups: string[][];
};

function joinSqlOr(conditions: Prisma.Sql[]) {
  return conditions.reduce((acc, condition, index) => {
    if (index === 0) return condition;
    return Prisma.sql`${acc} OR ${condition}`;
  }, Prisma.empty);
}

function joinSqlAnd(conditions: Prisma.Sql[]) {
  return conditions.reduce((acc, condition, index) => {
    if (index === 0) return condition;
    return Prisma.sql`${acc} AND ${condition}`;
  }, Prisma.empty);
}

const ICD10_SEARCH_INNER_CATALOG_ID = Prisma.sql`"Icd10DiagnosisCode"."id"`;
const ICD10_SQL_ACCENTED = "áàäâãéèëêíìïîóòöôõúùüûñçýÿ";
const ICD10_SQL_UNACCENTED = "aaaaaeeeeiiiiooooouuuuncyy";

function sqlFold(expr: Prisma.Sql): Prisma.Sql {
  return Prisma.sql`translate(lower(${expr}), ${ICD10_SQL_ACCENTED}, ${ICD10_SQL_UNACCENTED})`;
}

function likeFolded(expr: Prisma.Sql, foldedPattern: string): Prisma.Sql {
  return Prisma.sql`${sqlFold(expr)} LIKE ${foldedPattern}`;
}

/** SEARCH-ONLY aliases. Matching here never changes selected shortDescription. */
function icd10ApprovedSearchAliasExistsSql(pattern: string, catalogIdRef: Prisma.Sql, foldedPattern?: string): Prisma.Sql {
  const folded = foldedPattern
    ? Prisma.sql`OR ${likeFolded(Prisma.sql`a."aliasText"`, foldedPattern)}`
    : Prisma.empty;
  return Prisma.sql`EXISTS (
    SELECT 1
    FROM "Icd10DiagnosisSearchAlias" a
    WHERE a."icd10CatalogId" = ${catalogIdRef}
      AND a."status" = 'APPROVED'
      AND (
        a."aliasText" ILIKE ${pattern}
        ${folded}
      )
  )`;
}

function localePreferredLabelSql(locale: ProductUiLanguage): Prisma.Sql {
  return Prisma.sql`COALESCE(
    (
      SELECT t."preferredLabel"
      FROM "Icd10DiagnosisTerminology" t
      WHERE t."icd10CatalogId" = "Icd10DiagnosisCode"."id"
        AND t."status" = 'APPROVED'
        AND t."labelRegister" = 'CLINICIAN_PREFERRED'
        AND t."isEffective" = TRUE
        AND t."locale" = ${locale}
      LIMIT 1
    ),
    CASE WHEN ${locale} = 'en' THEN "shortDescription" ELSE NULL END
  )`;
}

function catalogTextMatchesSql(pattern: string): Prisma.Sql {
  const searchTextPattern = pattern.toLowerCase();
  return Prisma.sql`(
    "shortDescription" ILIKE ${pattern}
    OR "longDescription" ILIKE ${pattern}
    OR "searchText" ILIKE ${searchTextPattern}
  )`;
}

function terminologyLabelInSql(pattern: string): Prisma.Sql {
  return Prisma.sql`"Icd10DiagnosisCode"."id" IN (
    SELECT t."icd10CatalogId"
    FROM "Icd10DiagnosisTerminology" t
    WHERE t."status" = 'APPROVED'
      AND t."labelRegister" = 'CLINICIAN_PREFERRED'
      AND t."preferredLabel" ILIKE ${pattern}
  )`;
}

function aliasTextInSql(pattern: string): Prisma.Sql {
  return Prisma.sql`"Icd10DiagnosisCode"."id" IN (
    SELECT a."icd10CatalogId"
    FROM "Icd10DiagnosisSearchAlias" a
    WHERE a."status" = 'APPROVED'
      AND a."aliasText" ILIKE ${pattern}
  )`;
}

function tokenPresentSql(token: string): Prisma.Sql {
  return catalogTextMatchesSql(`%${token}%`);
}

function uniqueTrimmedPhrases(phrases: readonly string[]): string[] {
  const seen = new Map<string, string>();
  for (const phrase of phrases) {
    const trimmed = phrase.trim();
    const key = trimmed.toLowerCase();
    if (key.length < 2 || seen.has(key)) continue;
    seen.set(key, trimmed);
  }
  return [...seen.values()];
}

function catalogAliasPatternSql(pattern: string): Prisma.Sql {
  const searchTextPattern = pattern.toLowerCase();
  return Prisma.sql`(
    c."shortDescription" ILIKE ${pattern}
    OR c."longDescription" ILIKE ${pattern}
    OR c."searchText" ILIKE ${searchTextPattern}
  )`;
}

function unionSql(parts: Prisma.Sql[]): Prisma.Sql | null {
  if (parts.length === 0) return null;
  return parts.reduce((acc, part, index) => (index === 0 ? part : Prisma.sql`${acc} UNION ${part}`));
}

function buildCandidateHitsCte(match: Icd10CatalogSearchMatch, releaseVersion: string): Prisma.Sql {
  const catalogParts: Prisma.Sql[] = match.retrievalCatalogPatterns.map(
    (pattern) => Prisma.sql`
      SELECT c."id"
      FROM "Icd10DiagnosisCode" c
      WHERE c."isActive" = TRUE
        AND c."isSelectable" = TRUE
        AND c."releaseVersion" = ${releaseVersion}
        AND ${catalogAliasPatternSql(pattern)}
    `,
  );
  for (const pattern of match.retrievalCatalogPrefixPatterns) {
    catalogParts.push(Prisma.sql`
      SELECT c."id"
      FROM "Icd10DiagnosisCode" c
      WHERE c."isActive" = TRUE
        AND c."isSelectable" = TRUE
        AND c."releaseVersion" = ${releaseVersion}
        AND c."shortDescription" ILIKE ${pattern}
    `);
  }
  const labelParts: Prisma.Sql[] = match.retrievalLabelPatterns.map(
    (pattern) => Prisma.sql`
      SELECT t."icd10CatalogId" AS "id"
      FROM "Icd10DiagnosisTerminology" t
      INNER JOIN "Icd10DiagnosisCode" c ON c."id" = t."icd10CatalogId"
      WHERE t."status" = 'APPROVED'
        AND t."labelRegister" = 'CLINICIAN_PREFERRED'
        AND c."isActive" = TRUE
        AND c."isSelectable" = TRUE
        AND c."releaseVersion" = ${releaseVersion}
        AND t."preferredLabel" ILIKE ${pattern}
    `,
  );
  const aliasParts: Prisma.Sql[] = match.retrievalLabelPatterns.map(
    (pattern) => Prisma.sql`
      SELECT a."icd10CatalogId" AS "id"
      FROM "Icd10DiagnosisSearchAlias" a
      INNER JOIN "Icd10DiagnosisCode" c ON c."id" = a."icd10CatalogId"
      WHERE a."status" = 'APPROVED'
        AND c."isActive" = TRUE
        AND c."isSelectable" = TRUE
        AND c."releaseVersion" = ${releaseVersion}
        AND a."aliasText" ILIKE ${pattern}
    `,
  );
  for (const group of match.retrievalTokenAndGroups) {
    if (group.length < 2) continue;
    catalogParts.push(Prisma.sql`
      SELECT c."id"
      FROM "Icd10DiagnosisCode" c
      WHERE c."isActive" = TRUE
        AND c."isSelectable" = TRUE
        AND c."releaseVersion" = ${releaseVersion}
        AND ${joinSqlAnd(group.map((token) => catalogAliasPatternSql(`%${token}%`)))}
    `);
    labelParts.push(Prisma.sql`
      SELECT t."icd10CatalogId" AS "id"
      FROM "Icd10DiagnosisTerminology" t
      INNER JOIN "Icd10DiagnosisCode" c ON c."id" = t."icd10CatalogId"
      WHERE t."status" = 'APPROVED'
        AND t."labelRegister" = 'CLINICIAN_PREFERRED'
        AND c."isActive" = TRUE
        AND c."isSelectable" = TRUE
        AND c."releaseVersion" = ${releaseVersion}
        AND ${joinSqlAnd(group.map((token) => Prisma.sql`t."preferredLabel" ILIKE ${`%${token}%`}`))}
    `);
    aliasParts.push(Prisma.sql`
      SELECT a."icd10CatalogId" AS "id"
      FROM "Icd10DiagnosisSearchAlias" a
      INNER JOIN "Icd10DiagnosisCode" c ON c."id" = a."icd10CatalogId"
      WHERE a."status" = 'APPROVED'
        AND c."isActive" = TRUE
        AND c."isSelectable" = TRUE
        AND c."releaseVersion" = ${releaseVersion}
        AND ${joinSqlAnd(group.map((token) => Prisma.sql`a."aliasText" ILIKE ${`%${token}%`}`))}
    `);
  }
  const hits = unionSql([...catalogParts, ...labelParts, ...aliasParts]);
  if (!hits) {
    return Prisma.sql`
      SELECT CAST(NULL AS text) AS "id"
      WHERE FALSE
    `;
  }
  return hits;
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
export function buildIcd10CatalogSearchMatch(
  rawInput: string,
  locale: ProductUiLanguage = "en",
): Icd10CatalogSearchMatch | null {
  const raw = rawInput?.trim() ?? "";
  if (!raw) return null;
  const isCodeQuery = icd10SearchLooksLikeCode(raw);
  if (raw.length < 2 && !isCodeQuery) return null;

  const norm = normalizeIcd10CodeForLookup(raw);
  const folded = foldIcd10SearchText(raw);
  const significantTokens = tokenizeIcd10SearchQuery(raw);
  const pattern = raw.length >= 2 ? `%${raw}%` : null;
  const foldedPattern = folded.length >= 2 ? `%${folded}%` : null;
  const normPrefix = norm.length > 0 ? `${norm}%` : null;
  const rawPrefix = raw.length > 0 ? `${raw}%` : null;
  const localeLabel = localePreferredLabelSql(locale);
  const searchIntent = classifyIcd10SearchIntent(raw);
  const synonymPhrases = resolveIcd10SearchSynonymPhrases(raw);

  const or: Prisma.Sql[] = [];
  const expansion = resolveIcd10ClinicalQueryExpansion(raw);
  const retrievalCatalogPatterns: string[] = [];
  const retrievalLabelPatterns: string[] = [];
  const retrievalCatalogPrefixPatterns: string[] = [];
  const retrievalTokenAndGroups: string[][] = [];

  const pushCatalogAndLabel = (ilikePattern: string) => {
    retrievalCatalogPatterns.push(ilikePattern);
    retrievalLabelPatterns.push(ilikePattern);
    or.push(catalogTextMatchesSql(ilikePattern));
    or.push(terminologyLabelInSql(ilikePattern));
    or.push(aliasTextInSql(ilikePattern));
  };

  if (isCodeQuery && normPrefix) {
    or.push(Prisma.sql`"normalizedCode" ILIKE ${normPrefix}`);
    or.push(Prisma.sql`"code" ILIKE ${rawPrefix}`);
  } else if (pattern && foldedPattern) {
    if (folded.length > 3) {
      pushCatalogAndLabel(pattern);
      if (foldedPattern.toLowerCase() !== pattern.toLowerCase()) {
        retrievalLabelPatterns.push(foldedPattern);
        or.push(terminologyLabelInSql(foldedPattern));
        or.push(aliasTextInSql(foldedPattern));
      }
    } else {
      const prefix = `${raw}%`;
      retrievalCatalogPrefixPatterns.push(prefix);
      retrievalLabelPatterns.push(prefix);
      or.push(terminologyLabelInSql(prefix));
      or.push(aliasTextInSql(prefix));
      or.push(Prisma.sql`"shortDescription" ILIKE ${prefix}`);
    }
  }
  const retrievalPhrases = uniqueTrimmedPhrases([...(expansion?.anyOf ?? []), ...synonymPhrases]);
  for (const phrase of retrievalPhrases) {
    if (foldIcd10SearchText(phrase).length <= 3) continue;
    pushCatalogAndLabel(`%${phrase}%`);
  }
  if (expansion?.allOf && expansion.allOf.length > 0) {
    const andParts = expansion.allOf.map((phrase) => {
      const p = `%${phrase}%`;
      return Prisma.sql`(
        ${catalogTextMatchesSql(p)}
        OR ${terminologyLabelInSql(p)}
        OR ${aliasTextInSql(p)}
      )`;
    });
    or.push(joinSqlAnd(andParts));
    const expansionTokens = uniqueTrimmedPhrases(expansion.allOf).filter((phrase) => foldIcd10SearchText(phrase).length > 3);
    if (expansionTokens.length >= 2) retrievalTokenAndGroups.push(expansionTokens);
  }

  const tokenConditions: Prisma.Sql[] = [];
  if (!isCodeQuery && !expansion) {
    const matchableTokens = significantTokens.filter((token) => token.length > 3);
    if (matchableTokens.length >= 2) {
      retrievalTokenAndGroups.push(matchableTokens);
      or.push(joinSqlAnd(matchableTokens.map((token) => tokenPresentSql(token))));
    } else if (matchableTokens.length === 1) {
      const token = matchableTokens[0]!;
      const condition = tokenPresentSql(token);
      tokenConditions.push(condition);
      or.push(condition);
      retrievalCatalogPatterns.push(`%${token}%`);
      retrievalLabelPatterns.push(`%${token}%`);
    }
  }
  if (!isCodeQuery) {
    for (const phrase of synonymPhrases) {
      const toks = tokenizeIcd10SearchQuery(phrase).filter((token) => token.length > 3);
      if (toks.length < 2) continue;
      retrievalTokenAndGroups.push(toks);
      or.push(joinSqlAnd(toks.map((token) => tokenPresentSql(token))));
    }
  }

  if (or.length === 0) return null;

  const expansionShortPhrases = [...(expansion?.anyOf ?? []), ...(expansion?.allOf ?? [])].filter(
    (phrase) => phrase.length >= 2,
  );

  const synonymSql =
    synonymPhrases.length > 0
      ? joinSqlOr(
          synonymPhrases.map((phrase) => {
            const fp = `%${phrase}%`;
            return Prisma.sql`(
              ${likeFolded(localeLabel, fp)}
              OR ${likeFolded(Prisma.sql`"shortDescription"`, fp)}
              OR ${likeFolded(Prisma.sql`COALESCE("longDescription", '')`, fp)}
            )`;
          }),
        )
      : Prisma.sql`FALSE`;

  const allTokensLocale =
    significantTokens.length > 0
      ? joinSqlAnd(significantTokens.map((token) => likeFolded(localeLabel, `%${token}%`)))
      : Prisma.sql`FALSE`;
  const allTokensEnglish =
    significantTokens.length > 0
      ? joinSqlAnd(
          significantTokens.map(
            (token) => Prisma.sql`(
              ${likeFolded(Prisma.sql`"shortDescription"`, `%${token}%`)}
              OR ${likeFolded(Prisma.sql`COALESCE("longDescription", '')`, `%${token}%`)}
            )`,
          ),
        )
      : Prisma.sql`FALSE`;

  return {
    matchSql: joinSqlOr(or),
    tokenRankSql: tokenConditions.length > 0 ? joinSqlOr(tokenConditions) : Prisma.sql`FALSE`,
    codeExactSql:
      norm.length > 0
        ? Prisma.sql`"normalizedCode" = ${norm} OR "code" = ${raw.toUpperCase()}`
        : Prisma.sql`FALSE`,
    codePrefixSql:
      normPrefix && rawPrefix && icd10SearchLooksLikeCode(raw)
        ? Prisma.sql`"normalizedCode" LIKE ${normPrefix} OR "code" ILIKE ${rawPrefix}`
        : Prisma.sql`FALSE`,
    shortExactSql: Prisma.sql`${sqlFold(Prisma.sql`"shortDescription"`)} = ${folded}`,
    shortPrefixSql: folded ? likeFolded(Prisma.sql`"shortDescription"`, `${folded}%`) : Prisma.sql`FALSE`,
    shortContainsSql: foldedPattern ? likeFolded(Prisma.sql`"shortDescription"`, foldedPattern) : Prisma.sql`FALSE`,
    longContainsSql: foldedPattern ? likeFolded(Prisma.sql`COALESCE("longDescription", '')`, foldedPattern) : Prisma.sql`FALSE`,
    expansionRankSql:
      expansionShortPhrases.length > 0
        ? expansionShortPhrases
            .map((phrase) => Prisma.sql`"shortDescription" ILIKE ${`%${phrase}%`}`)
            .reduce((acc, part, index) => (index === 0 ? part : Prisma.sql`${acc} OR ${part}`))
        : Prisma.sql`FALSE`,
    terminologyExactSql: Prisma.sql`${sqlFold(localeLabel)} = ${folded}`,
    aliasMatchSql: pattern
      ? icd10ApprovedSearchAliasExistsSql(pattern, ICD10_SEARCH_INNER_CATALOG_ID, foldedPattern ?? undefined)
      : Prisma.sql`FALSE`,
    localeLabelExactSql: folded ? Prisma.sql`${sqlFold(localeLabel)} = ${folded}` : Prisma.sql`FALSE`,
    localePhraseSql: foldedPattern ? likeFolded(localeLabel, foldedPattern) : Prisma.sql`FALSE`,
    englishPhraseSql: foldedPattern
      ? Prisma.sql`(
          ${likeFolded(Prisma.sql`"shortDescription"`, foldedPattern)}
          OR ${likeFolded(Prisma.sql`COALESCE("longDescription", '')`, foldedPattern)}
        )`
      : Prisma.sql`FALSE`,
    synonymPhraseSql: synonymSql,
    allTokensLocaleSql: allTokensLocale,
    allTokensEnglishSql: allTokensEnglish,
    aliasExactSql: folded
      ? Prisma.sql`EXISTS (
          SELECT 1
          FROM "Icd10DiagnosisSearchAlias" a
          WHERE a."icd10CatalogId" = ${ICD10_SEARCH_INNER_CATALOG_ID}
            AND a."status" = 'APPROVED'
            AND ${sqlFold(Prisma.sql`a."aliasText"`)} = ${folded}
        )`
      : Prisma.sql`FALSE`,
    searchIntent,
    locale,
    foldedQuery: folded,
    significantTokens,
    synonymPhrases,
    isCodeQuery,
    retrievalCatalogPatterns: uniqueTrimmedPhrases(retrievalCatalogPatterns),
    retrievalLabelPatterns: uniqueTrimmedPhrases(retrievalLabelPatterns),
    retrievalCatalogPrefixPatterns: uniqueTrimmedPhrases(retrievalCatalogPrefixPatterns),
    retrievalTokenAndGroups,
  };
}

function localeRankPredicates(match: Icd10CatalogSearchMatch, localeLabel: Prisma.Sql) {
  const folded = match.foldedQuery;
  const foldedPattern = folded.length >= 2 ? `%${folded}%` : null;
  const exact = folded ? Prisma.sql`${sqlFold(localeLabel)} = ${folded}` : Prisma.sql`FALSE`;
  const prefix = folded.length >= 2 ? likeFolded(localeLabel, `${folded}%`) : Prisma.sql`FALSE`;
  const phrase = foldedPattern ? likeFolded(localeLabel, foldedPattern) : Prisma.sql`FALSE`;
  const allTokens =
    match.significantTokens.length > 0
      ? joinSqlAnd(match.significantTokens.map((token) => likeFolded(localeLabel, `%${token}%`)))
      : Prisma.sql`FALSE`;
  const synonym =
    match.synonymPhrases.length > 0
      ? joinSqlOr(
          match.synonymPhrases.map((phraseText) => {
            const fp = `%${phraseText}%`;
            return Prisma.sql`(
              ${likeFolded(localeLabel, fp)}
              OR ${likeFolded(Prisma.sql`"shortDescription"`, fp)}
              OR ${likeFolded(Prisma.sql`COALESCE("longDescription", '')`, fp)}
            )`;
          }),
        )
      : Prisma.sql`FALSE`;
  return { exact, prefix, phrase, allTokens, synonym };
}

/** Visible result ranking for one date-of-service release. */
export function icd10MatchQualityOrderSql(
  match: Icd10CatalogSearchMatch,
  localeLabel: Prisma.Sql = localePreferredLabelSql(match.locale),
): Prisma.Sql {
  const localePred = localeRankPredicates(match, localeLabel);
  const symptomInjuryPenalty =
    match.searchIntent === "SYMPTOM"
      ? Prisma.sql`CASE WHEN "code" LIKE 'S%' OR "code" LIKE 'T%' THEN 1 ELSE 0 END`
      : Prisma.sql`(0::integer)`;
  const traumaChapterBoost =
    match.searchIntent === "TRAUMA"
      ? Prisma.sql`CASE WHEN "code" LIKE 'S%' OR "code" LIKE 'M66%' OR "code" LIKE 'M75%' THEN 0 ELSE 1 END`
      : Prisma.sql`(1::integer)`;
  const signChapterPenalty = isIcd10SignSymptomQuery(match.foldedQuery)
    ? Prisma.sql`CASE WHEN "code" LIKE 'R%' THEN 0 ELSE 1 END`
    : Prisma.sql`(0::integer)`;
  const bleedPenalty =
    match.searchIntent === "SYMPTOM"
      ? Prisma.sql`CASE
          WHEN ${localePred.synonym} THEN 0
          WHEN ${localePred.phrase} THEN 0
          ELSE 1
        END`
      : Prisma.sql`(0::integer)`;
  const preferredPrefixes = resolveIcd10SearchPreferredCodePrefixes(match.foldedQuery);
  const familyPrefixPenalty =
    preferredPrefixes.length > 0
      ? Prisma.sql`CASE WHEN ${joinSqlOr(preferredPrefixes.map((prefix) => Prisma.sql`"code" LIKE ${`${prefix}%`}`))} THEN 0 ELSE 1 END`
      : Prisma.sql`(0::integer)`;
  const englishPhraseSql = match.foldedQuery.length > 3 ? match.englishPhraseSql : Prisma.sql`FALSE`;
  const shortContainsSql = match.foldedQuery.length > 3 ? match.shortContainsSql : Prisma.sql`FALSE`;
  const longContainsSql = match.foldedQuery.length > 3 ? match.longContainsSql : Prisma.sql`FALSE`;

  return Prisma.sql`
    CASE
      WHEN ${match.codeExactSql} THEN 1
      WHEN ${localePred.exact} THEN 2
      WHEN ${match.aliasExactSql} THEN 3
      WHEN ${match.codePrefixSql} THEN 4
      WHEN ${localePred.prefix} THEN 4
      WHEN ${localePred.phrase} THEN 5
      WHEN ${englishPhraseSql} THEN 6
      WHEN ${localePred.synonym} THEN 7
      WHEN ${match.expansionRankSql} THEN 8
      WHEN ${localePred.allTokens} THEN 9
      WHEN ${match.allTokensEnglishSql} THEN 10
      WHEN ${match.aliasMatchSql} THEN 11
      WHEN ${shortContainsSql} THEN 11
      WHEN ${longContainsSql} THEN 12
      WHEN ${match.tokenRankSql} THEN 12
      ELSE 13
    END ASC,
    ${symptomInjuryPenalty} ASC,
    ${signChapterPenalty} ASC,
    ${familyPrefixPenalty} ASC,
    ${traumaChapterBoost} ASC,
    ${bleedPenalty} ASC,
    "isBillable" DESC,
    CASE
      WHEN RIGHT(REPLACE("code", '.', ''), 1) = 'A' THEN 0
      WHEN RIGHT(REPLACE("code", '.', ''), 1) = 'D' THEN 1
      WHEN RIGHT(REPLACE("code", '.', ''), 1) = 'S' THEN 2
      ELSE 0
    END ASC,
    LENGTH(COALESCE(${localeLabel}, "shortDescription")) ASC,
    "code" ASC
  `;
}

/**
 * Search one ICD-10-CM release selected by date of service.
 * Do not DISTINCT ON code across FY2026/FY2027.
 */
export function buildIcd10CatalogSearchSelectSql(
  match: Icd10CatalogSearchMatch,
  take: number,
  options: { releaseVersion: string; locale?: ProductUiLanguage },
): Prisma.Sql {
  const releaseVersion = options.releaseVersion.trim();
  if (!releaseVersion) {
    throw new Error("ICD10_SEARCH_REQUIRES_RELEASE_VERSION");
  }
  const locale = options.locale ?? match.locale;
  const localeLabel = Prisma.sql`COALESCE(
    locale_term."preferredLabel",
    CASE WHEN ${locale} = 'en' THEN "shortDescription" ELSE NULL END
  )`;
  const qualityOrder = icd10MatchQualityOrderSql(match, localeLabel);
  const catalogSelect = Prisma.sql`
      "Icd10DiagnosisCode"."id",
      "Icd10DiagnosisCode"."code",
      "Icd10DiagnosisCode"."normalizedCode",
      "Icd10DiagnosisCode"."codeSystem",
      "Icd10DiagnosisCode"."releaseVersion",
      "Icd10DiagnosisCode"."shortDescription",
      "Icd10DiagnosisCode"."longDescription",
      "Icd10DiagnosisCode"."chapter",
      "Icd10DiagnosisCode"."category",
      "Icd10DiagnosisCode"."isBillable",
      "Icd10DiagnosisCode"."effectiveYear",
      "Icd10DiagnosisCode"."codeSetVersion"
  `;
  const localeLateral = Prisma.sql`
    LEFT JOIN LATERAL (
      SELECT t."preferredLabel"
      FROM "Icd10DiagnosisTerminology" t
      WHERE t."icd10CatalogId" = "Icd10DiagnosisCode"."id"
        AND t."status" = 'APPROVED'
        AND t."labelRegister" = 'CLINICIAN_PREFERRED'
        AND t."isEffective" = TRUE
        AND t."locale" = ${locale}
      LIMIT 1
    ) locale_term ON TRUE
  `;
  if (match.isCodeQuery) {
    return Prisma.sql`
      SELECT ${catalogSelect}
      FROM "Icd10DiagnosisCode"
      ${localeLateral}
      WHERE "Icd10DiagnosisCode"."isActive" = TRUE
        AND "Icd10DiagnosisCode"."isSelectable" = TRUE
        AND "Icd10DiagnosisCode"."releaseVersion" = ${releaseVersion}
        AND (${match.codeExactSql} OR ${match.codePrefixSql})
      ORDER BY
        ${qualityOrder}
      LIMIT ${take}
    `;
  }
  const hits = buildCandidateHitsCte(match, releaseVersion);
  return Prisma.sql`
    WITH candidate_hits AS (
      ${hits}
    )
    SELECT ${catalogSelect}
    FROM "Icd10DiagnosisCode"
    INNER JOIN candidate_hits ON candidate_hits."id" = "Icd10DiagnosisCode"."id"
    ${localeLateral}
    ORDER BY
      ${qualityOrder}
    LIMIT ${take}
  `;
}
