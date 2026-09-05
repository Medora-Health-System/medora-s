import { parseProductUiLanguage } from "../i18n/productUiLocale.js";
import { normalizeIcd10CodeForLookup } from "../icd10Normalize.js";
import { formatIcd10CmDisplayCode } from "./formatIcd10CmDisplayCode.js";
import {
  ICD10_CLINICIAN_PROVENANCE_PRECEDENCE,
  ICD10_SOURCE_PRIORITY,
  type Icd10CatalogDisplaySource,
  type Icd10DiagnosisDisplayResult,
  type Icd10TerminologyDisplayRow,
  type Icd10TerminologyProvenance,
} from "./icd10TerminologyTypes.js";

function sameCanonicalIdentity(
  row: Pick<Icd10TerminologyDisplayRow, "codeSystem" | "releaseVersion" | "code">,
  codeSystem: string,
  releaseVersion: string,
  code: string,
): boolean {
  return (
    row.codeSystem === codeSystem &&
    row.releaseVersion === releaseVersion &&
    normalizeIcd10CodeForLookup(row.code) === normalizeIcd10CodeForLookup(code)
  );
}

function isExactClinicianLabel(row: Icd10TerminologyDisplayRow): boolean {
  return (
    row.status === "APPROVED" &&
    row.labelRegister === "CLINICIAN_PREFERRED" &&
    (row.exactness === "EXACT_SOURCE" || row.exactness === "EXACT_GOVERNED")
  );
}

function provenanceRank(provenance: Icd10TerminologyProvenance): number {
  const idx = ICD10_CLINICIAN_PROVENANCE_PRECEDENCE.indexOf(provenance);
  return idx === -1 ? 99 : idx;
}

function sourcePriorityOf(row: Icd10TerminologyDisplayRow): number {
  return row.sourcePriority ?? ICD10_SOURCE_PRIORITY.DEFAULT;
}

/**
 * Deterministic ranking for eligible clinician preferred rows.
 *
 * Policy (governed, not lexical):
 *   1. provenance class: MEDORA_GOVERNED > LICENSED_VENDOR > OFFICIAL_SOURCE
 *   2. explicit sourcePriority (lower number wins)
 *   3. sourceId (stable identity, not recency)
 *
 * terminologyVersion is part of source-row identity, not a sort key.
 * Version strings are not calendars. A newer artifact must be imported with a
 * better (lower) sourcePriority than prior versions of the same sourceId.
 * Never createdAt / insertion order.
 */
export function compareEligibleClinicianPreferredRows(
  a: Icd10TerminologyDisplayRow,
  b: Icd10TerminologyDisplayRow,
): number {
  const byProvenance = provenanceRank(a.provenance) - provenanceRank(b.provenance);
  if (byProvenance !== 0) return byProvenance;
  const byPriority = sourcePriorityOf(a) - sourcePriorityOf(b);
  if (byPriority !== 0) return byPriority;
  const bySourceId = a.sourceId.localeCompare(b.sourceId);
  if (bySourceId !== 0) return bySourceId;
  return a.preferredLabel.localeCompare(b.preferredLabel);
}

export function pickRankedEligibleClinicianLabel(
  rows: readonly Icd10TerminologyDisplayRow[],
): Icd10TerminologyDisplayRow | null {
  const eligible = rows.filter(isExactClinicianLabel);
  if (eligible.length === 0) return null;
  return [...eligible].sort(compareEligibleClinicianPreferredRows)[0]!;
}

/** Stored isEffective wins when unique; otherwise deterministic ranking. */
export function pickClinicianPreferredLabel(
  rows: readonly Icd10TerminologyDisplayRow[],
): Icd10TerminologyDisplayRow | null {
  const eligible = rows.filter(isExactClinicianLabel);
  if (eligible.length === 0) return null;
  const effective = eligible.filter((row) => row.isEffective === true);
  if (effective.length === 1) return effective[0]!;
  if (effective.length > 1) return [...effective].sort(compareEligibleClinicianPreferredRows)[0]!;
  return [...eligible].sort(compareEligibleClinicianPreferredRows)[0]!;
}

function unlocalized(code: string): Icd10DiagnosisDisplayResult {
  const display = formatIcd10CmDisplayCode(code) || code.trim();
  return {
    code: display,
    displayName: display,
    exactness: "UNLOCALIZED_CODE",
    provenance: null,
    localized: false,
  };
}

function officialEnglish(catalog: Icd10CatalogDisplaySource): Icd10DiagnosisDisplayResult | null {
  const text = catalog.shortDescription?.trim() || catalog.longDescription?.trim() || "";
  if (!text) return null;
  return {
    code: catalog.code,
    displayName: text,
    exactness: "EXACT_SOURCE",
    provenance: "OFFICIAL_SOURCE",
    localized: true,
  };
}

/**
 * Exact clinician display resolver.
 *
 * EN: official catalog English only.
 * FR/ES: approved exact clinician preferred label for this code/release/locale only.
 * Never another language, consumer register, search alias, or category/prefix inheritance.
 */
export function resolveIcd10DiagnosisDisplay(input: {
  codeSystem: string;
  releaseVersion: string;
  code: string;
  locale: string;
  catalog: Icd10CatalogDisplaySource | null;
  terminologyRows: readonly Icd10TerminologyDisplayRow[];
}): Icd10DiagnosisDisplayResult {
  const code = input.code.trim();
  if (!code) return unlocalized("");

  const language = parseProductUiLanguage(input.locale);
  const identityRows = input.terminologyRows.filter((row) =>
    sameCanonicalIdentity(row, input.codeSystem, input.releaseVersion, code),
  );

  if (language === "en") {
    if (input.catalog && sameCanonicalIdentity(input.catalog, input.codeSystem, input.releaseVersion, code)) {
      return officialEnglish(input.catalog) ?? unlocalized(input.catalog.code);
    }
    return unlocalized(code);
  }

  if (language !== "fr" && language !== "es") {
    return unlocalized(code);
  }

  const localeRows = identityRows.filter((row) => parseProductUiLanguage(row.locale) === language);
  const chosen = pickClinicianPreferredLabel(localeRows);
  if (!chosen) return unlocalized(code);

  return {
    code: formatIcd10CmDisplayCode(chosen.code) || chosen.code,
    displayName: chosen.preferredLabel,
    exactness: chosen.exactness,
    provenance: chosen.provenance,
    localized: true,
  };
}

/** Render-time contract for print / chart export / ROI. Does not rewrite stored Diagnosis.description. */
export function resolveIcd10DiagnosisDisplayForDocument(input: {
  codeSystem: string;
  releaseVersion: string;
  code: string;
  documentLocale: string;
  catalog: Icd10CatalogDisplaySource | null;
  terminologyRows: readonly Icd10TerminologyDisplayRow[];
}): Icd10DiagnosisDisplayResult {
  return resolveIcd10DiagnosisDisplay({
    codeSystem: input.codeSystem,
    releaseVersion: input.releaseVersion,
    code: input.code,
    locale: input.documentLocale,
    catalog: input.catalog,
    terminologyRows: input.terminologyRows,
  });
}

/**
 * SEARCH_MATCH_TEXT != DISPLAY_TEXT.
 * Search DTO English shortDescription may explain why a row matched.
 * It must never become FR/ES displayName.
 */
export function resolveIcd10SearchHitDisplay(input: {
  locale: string;
  searchHit: { code: string; shortDescription?: string | null };
  catalog: Icd10CatalogDisplaySource | null;
  terminologyRows: readonly Icd10TerminologyDisplayRow[];
  matchedAliasText?: string | null;
}): {
  searchMatchText: string | null;
  display: Icd10DiagnosisDisplayResult;
} {
  const display = resolveIcd10DiagnosisDisplay({
    codeSystem: input.catalog?.codeSystem ?? "",
    releaseVersion: input.catalog?.releaseVersion ?? "",
    code: input.searchHit.code,
    locale: input.locale,
    catalog: input.catalog,
    terminologyRows: input.terminologyRows,
  });
  const searchMatchText = input.matchedAliasText?.trim() || input.searchHit.shortDescription?.trim() || null;
  return { searchMatchText, display };
}
