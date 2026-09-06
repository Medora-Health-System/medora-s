/**
 * P3-F.3 national source validation — exact-code intersection only.
 * Does not ingest, translate, inherit category labels, or assign production provenance.
 */

import { normalizeIcd10CodeForLookup } from "../icd10Normalize.js";

export const NATIONAL_SOURCE_CLASSIFICATIONS = [
  "EXACT_CODE_CANDIDATE",
  "SEMANTIC_REVIEW_REQUIRED",
  "CATEGORY_ONLY",
  "SOURCE_ONLY_EXTENSION",
  "US_ONLY",
  "INVALID_SOURCE_CODE",
] as const;
export type NationalSourceClassification = (typeof NATIONAL_SOURCE_CLASSIFICATIONS)[number];

export type UsCatalogRow = {
  code: string;
  normalizedCode: string;
  label: string;
  selectable: boolean;
};

export type NationalSourceRow = {
  code: string;
  normalizedCode: string;
  label: string;
  terminal: boolean;
  kind?: string;
};

export type NationalIntersectionStats = {
  usSelectableTotal: number;
  usCategoryTotal: number;
  sourceRowTotal: number;
  sourceUniqueNormalized: number;
  exactCodeIntersection: number;
  usOnly: number;
  sourceOnly: number;
  categoryCollisions: number;
  invalidUnrecognized: number;
  duplicateNormalized: number;
  blankLabels: number;
  exactCodeCoveragePercent: number;
};

export type AdversarialCodeInspection = {
  query: string;
  normalized: string;
  usExists: boolean;
  usSelectable: boolean;
  usEnglish: string | null;
  sourceExists: boolean;
  sourceTerminal: boolean | null;
  sourceLabel: string | null;
  classification: NationalSourceClassification;
  notes: string[];
};

export function nationalNormalizedCode(raw: string): string {
  return normalizeIcd10CodeForLookup(raw);
}

export function intersectNationalSource(input: {
  usRows: readonly UsCatalogRow[];
  sourceRows: readonly NationalSourceRow[];
  terminalOnly?: boolean;
}): NationalIntersectionStats & {
  intersectionCodes: string[];
  usOnlyCodes: string[];
  sourceOnlyCodes: string[];
  categoryCollisionCodes: string[];
} {
  const usSelectable = new Map<string, UsCatalogRow>();
  const usCategory = new Map<string, UsCatalogRow>();
  for (const row of input.usRows) {
    if (row.selectable) usSelectable.set(row.normalizedCode, row);
    else usCategory.set(row.normalizedCode, row);
  }
  const sourceByNorm = new Map<string, NationalSourceRow>();
  let blankLabels = 0;
  let duplicateNormalized = 0;
  let invalidUnrecognized = 0;
  for (const row of input.sourceRows) {
    if (!row.label.trim()) blankLabels += 1;
    if (input.terminalOnly === true && row.terminal !== true) continue;
    if (!/^[A-Z][A-Z0-9]{2,}$/.test(row.normalizedCode)) {
      invalidUnrecognized += 1;
      continue;
    }
    if (sourceByNorm.has(row.normalizedCode)) duplicateNormalized += 1;
    sourceByNorm.set(row.normalizedCode, row);
  }
  const sourceSet = new Set(sourceByNorm.keys());
  const usSelSet = new Set(usSelectable.keys());
  const usCatSet = new Set(usCategory.keys());
  const usAll = new Set([...usSelSet, ...usCatSet]);
  const intersectionCodes = [...sourceSet].filter((code) => usSelSet.has(code)).sort();
  const usOnlyCodes = [...usSelSet].filter((code) => !sourceSet.has(code)).sort();
  const sourceOnlyCodes = [...sourceSet].filter((code) => !usAll.has(code)).sort();
  const categoryCollisionCodes = [...sourceSet].filter((code) => usCatSet.has(code)).sort();
  return {
    usSelectableTotal: usSelSet.size,
    usCategoryTotal: usCatSet.size,
    sourceRowTotal: input.sourceRows.length,
    sourceUniqueNormalized: sourceSet.size,
    exactCodeIntersection: intersectionCodes.length,
    usOnly: usOnlyCodes.length,
    sourceOnly: sourceOnlyCodes.length,
    categoryCollisions: categoryCollisionCodes.length,
    invalidUnrecognized,
    duplicateNormalized,
    blankLabels,
    exactCodeCoveragePercent:
      usSelSet.size === 0 ? 0 : Math.round((10000 * intersectionCodes.length) / usSelSet.size) / 100,
    intersectionCodes,
    usOnlyCodes,
    sourceOnlyCodes,
    categoryCollisionCodes,
  };
}

export function classifyNationalCode(input: {
  us?: UsCatalogRow;
  source?: NationalSourceRow;
}): NationalSourceClassification {
  if (!input.us && !input.source) return "INVALID_SOURCE_CODE";
  if (!input.us && input.source) return "SOURCE_ONLY_EXTENSION";
  if (input.us && !input.us.selectable) return "CATEGORY_ONLY";
  if (input.us?.selectable && input.source) return "EXACT_CODE_CANDIDATE";
  if (input.us?.selectable && !input.source) return "US_ONLY";
  return "SEMANTIC_REVIEW_REQUIRED";
}

export function inspectAdversarialCodes(input: {
  queries: readonly string[];
  usByNormalized: ReadonlyMap<string, UsCatalogRow>;
  sourceByNormalized: ReadonlyMap<string, NationalSourceRow>;
}): AdversarialCodeInspection[] {
  return input.queries.map((query) => {
    const normalized = nationalNormalizedCode(query);
    const us = input.usByNormalized.get(normalized);
    const source = input.sourceByNormalized.get(normalized);
    const classification = classifyNationalCode({ us, source });
    const notes: string[] = [];
    if (us && !us.selectable) notes.push("US category/header — must not supply child clinician labels");
    if (us?.selectable && !source) notes.push("missing from national source at this exact code");
    if (source && !us) notes.push("national code is not in the US catalog");
    if (source?.terminal && us && !us.selectable) {
      notes.push("source terminal/final collides with US nonselectable parent");
    }
    return {
      query,
      normalized,
      usExists: Boolean(us),
      usSelectable: us?.selectable === true,
      usEnglish: us?.label ?? null,
      sourceExists: Boolean(source),
      sourceTerminal: source ? source.terminal : null,
      sourceLabel: source?.label ?? null,
      classification,
      notes,
    };
  });
}

export const ICD10_P3F3_ADVERSARIAL_CODES = [
  "A42.1",
  "R14.0",
  "G43.D0",
  "G43.D1",
  "R11",
  "R11.0",
  "R11.1",
  "R11.2",
  "R11.10",
  "R11.11",
  "R11.12",
  "L03",
  "L03.90",
  "R10.84",
  "R10.85",
  "R10.9",
  "R10.10",
  "S030XXA",
  "T141",
] as const;

export function sampleCodes(codes: readonly string[], limit = 20): string[] {
  return [...codes].slice(0, limit);
}
