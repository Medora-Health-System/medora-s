import { createReadStream } from "node:fs";
import { createInterface } from "node:readline";
import {
  isSupportedTermTypeForStaging,
  normalizeRxNormDisplayTerm,
  RXNORM_PARSING_VERSION,
  type RxNormRowChecksumFields,
} from "@medora/shared";
import { computeRxNormRowChecksum } from "./rxnorm-row-checksum";

/** Standard RXNCONSO.RRF column order (18 fields). */
export const RXNCONSO_FIELD_COUNT = 18;

export const RXNCONSO_COLUMN_INDEX = {
  RXCUI: 0,
  LAT: 1,
  TS: 2,
  LUI: 3,
  STT: 4,
  SUI: 5,
  ISPREF: 6,
  RXAUI: 7,
  SAUI: 8,
  SCUI: 9,
  SDUI: 10,
  SAB: 11,
  TTY: 12,
  CODE: 13,
  STR: 14,
  SRL: 15,
  SUPPRESS: 16,
  CVF: 17,
} as const;

export type ParsedRxnconsoRow = {
  sourceLineNumber: number;
  rxcui: string;
  language: string;
  sourceVocabulary: string;
  termType: string;
  sourceCode: string | null;
  displayTerm: string;
  normalizedTerm: string;
  suppressFlag: string | null;
  rowChecksum: string;
  parsingStatus: "PARSED" | "MALFORMED" | "SKIPPED";
  skipReason: string | null;
};

export type ParseRxnconsoRrfOptions = {
  filePath: string;
  termTypes?: string[];
  rxcuiAllowlist?: string[];
  maxRows?: number;
  dryRun?: boolean;
  requireSab?: string;
  requireLanguage?: string;
  includeSuppressed?: boolean;
};

export type ParseRxnconsoRrfResult = {
  parsingVersion: typeof RXNORM_PARSING_VERSION;
  dryRun: boolean;
  rowsRead: number;
  rowsAccepted: number;
  rowsSkipped: number;
  malformedRows: number;
  suppressedRows: number;
  acceptedRows: ParsedRxnconsoRow[];
  warnings: string[];
};

function normalizeAllowlist(values: string[] | undefined): Set<string> | null {
  if (!values || values.length === 0) return null;
  return new Set(values.map((value) => value.trim()));
}

function normalizeTermTypeFilter(values: string[] | undefined): Set<string> | null {
  if (!values || values.length === 0) return null;
  return new Set(values.map((value) => value.trim().toUpperCase()));
}

function buildChecksumFields(row: {
  rxcui: string;
  termType: string;
  displayTerm: string;
  language: string;
  suppressFlag: string | null;
  sourceCode: string | null;
}): RxNormRowChecksumFields {
  return {
    rxcui: row.rxcui,
    termType: row.termType,
    displayTerm: row.displayTerm,
    language: row.language,
    suppressFlag: row.suppressFlag,
    sourceCode: row.sourceCode,
  };
}

function parseLineFields(line: string): string[] {
  return line.split("|");
}

export async function parseRxnconsoRrf(
  options: ParseRxnconsoRrfOptions
): Promise<ParseRxnconsoRrfResult> {
  const requireSab = (options.requireSab ?? "RXNORM").trim().toUpperCase();
  const requireLanguage = (options.requireLanguage ?? "ENG").trim().toUpperCase();
  const includeSuppressed = options.includeSuppressed ?? false;
  const termTypeFilter = normalizeTermTypeFilter(options.termTypes);
  const rxcuiAllowlist = normalizeAllowlist(options.rxcuiAllowlist);
  const maxRows = options.maxRows ?? Number.POSITIVE_INFINITY;

  const acceptedRows: ParsedRxnconsoRow[] = [];
  const warnings: string[] = [];
  let rowsRead = 0;
  let rowsSkipped = 0;
  let malformedRows = 0;
  let suppressedRows = 0;

  const stream = createReadStream(options.filePath, { encoding: "utf8" });
  const rl = createInterface({ input: stream, crlfDelay: Infinity });

  for await (const rawLine of rl) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    rowsRead += 1;
    const fields = parseLineFields(line);

    if (fields.length !== RXNCONSO_FIELD_COUNT) {
      malformedRows += 1;
      continue;
    }

    const rxcui = fields[RXNCONSO_COLUMN_INDEX.RXCUI].trim();
    const language = fields[RXNCONSO_COLUMN_INDEX.LAT].trim().toUpperCase();
    const sourceVocabulary = fields[RXNCONSO_COLUMN_INDEX.SAB].trim().toUpperCase();
    const termType = fields[RXNCONSO_COLUMN_INDEX.TTY].trim().toUpperCase();
    const sourceCode = fields[RXNCONSO_COLUMN_INDEX.CODE].trim() || null;
    const displayTerm = fields[RXNCONSO_COLUMN_INDEX.STR].trim();
    const suppressFlag = fields[RXNCONSO_COLUMN_INDEX.SUPPRESS].trim().toUpperCase() || null;

    if (language !== requireLanguage) {
      rowsSkipped += 1;
      continue;
    }

    if (sourceVocabulary !== requireSab) {
      rowsSkipped += 1;
      continue;
    }

    if (!includeSuppressed && suppressFlag === "Y") {
      suppressedRows += 1;
      rowsSkipped += 1;
      continue;
    }

    if (termTypeFilter && !termTypeFilter.has(termType)) {
      rowsSkipped += 1;
      continue;
    }

    if (rxcuiAllowlist && !rxcuiAllowlist.has(rxcui)) {
      rowsSkipped += 1;
      continue;
    }

    if (!isSupportedTermTypeForStaging(termType)) {
      rowsSkipped += 1;
      continue;
    }

    if (!rxcui || !displayTerm) {
      malformedRows += 1;
      continue;
    }

    const checksumFields = buildChecksumFields({
      rxcui,
      termType,
      displayTerm,
      language,
      suppressFlag,
      sourceCode,
    });

    acceptedRows.push({
      sourceLineNumber: rowsRead,
      rxcui,
      language,
      sourceVocabulary,
      termType,
      sourceCode,
      displayTerm,
      normalizedTerm: normalizeRxNormDisplayTerm(displayTerm),
      suppressFlag,
      rowChecksum: computeRxNormRowChecksum(checksumFields),
      parsingStatus: "PARSED",
      skipReason: null,
    });

    if (acceptedRows.length >= maxRows) {
      warnings.push(`maxRows=${maxRows} reached; remaining lines ignored.`);
      break;
    }
  }

  if (options.dryRun) {
    return {
      parsingVersion: RXNORM_PARSING_VERSION,
      dryRun: true,
      rowsRead,
      rowsAccepted: acceptedRows.length,
      rowsSkipped,
      malformedRows,
      suppressedRows,
      acceptedRows: [],
      warnings,
    };
  }

  return {
    parsingVersion: RXNORM_PARSING_VERSION,
    dryRun: false,
    rowsRead,
    rowsAccepted: acceptedRows.length,
    rowsSkipped,
    malformedRows,
    suppressedRows,
    acceptedRows,
    warnings,
  };
}
