import { readFileSync } from "node:fs";
import {
  isSupportedTermTypeForStaging,
  normalizeRxNormDisplayTerm,
  type RxNormRowChecksumFields,
} from "@medora/shared";
import { computeFileChecksumSha256, computeRxNormRowChecksum } from "./rxnorm-row-checksum";

export type SyntheticRxNormFixtureRow = {
  rxcui?: string;
  termType?: string;
  termTypeOverride?: string;
  language?: string;
  suppressFlag?: string;
  sourceCode?: string;
  displayTerm?: string;
  ingredientIdentity?: string;
  strengthText?: string;
  doseFormText?: string;
  brandName?: string;
  relationshipMetadata?: Record<string, unknown>;
};

export type SyntheticRxNormFixture = {
  fixtureKind: string;
  notRealRxNorm: boolean;
  releaseIdentifier: string;
  sourceVocabulary: string;
  sourceFormat: string;
  releaseDate?: string;
  rows: SyntheticRxNormFixtureRow[];
};

export type ParsedRxNormStagingRow = {
  sourceRowNumber: number;
  rxcui: string;
  termType: string;
  language: string | null;
  suppressFlag: string | null;
  sourceVocabulary: string;
  sourceCode: string | null;
  displayTerm: string;
  normalizedTerm: string;
  ingredientIdentity: string | null;
  strengthText: string | null;
  doseFormText: string | null;
  brandName: string | null;
  relationshipMetadata: Record<string, unknown> | null;
  rowChecksum: string;
  parsingStatus: "PARSED" | "REJECTED";
  validationStatus: "ACCEPTED" | "REJECTED" | "WARNING";
  rejectionReason: string | null;
  dataClassification: "FIXTURE";
};

export type ParseSyntheticRxNormResult = {
  fixture: SyntheticRxNormFixture;
  sourceChecksumSha256: string;
  sourceFilename: string;
  acceptedRows: ParsedRxNormStagingRow[];
  rejectedRows: ParsedRxNormStagingRow[];
  warnings: string[];
};

function isSyntheticRxcui(value: string): boolean {
  return /^SYNTH[0-9]+$/i.test(value.trim());
}

function rejectRow(
  sourceRowNumber: number,
  partial: Partial<ParsedRxNormStagingRow>,
  reason: string
): ParsedRxNormStagingRow {
  return {
    sourceRowNumber,
    rxcui: partial.rxcui ?? "",
    termType: partial.termType ?? "",
    language: partial.language ?? null,
    suppressFlag: partial.suppressFlag ?? null,
    sourceVocabulary: partial.sourceVocabulary ?? "RXNORM",
    sourceCode: partial.sourceCode ?? null,
    displayTerm: partial.displayTerm ?? "",
    normalizedTerm: partial.normalizedTerm ?? "",
    ingredientIdentity: partial.ingredientIdentity ?? null,
    strengthText: partial.strengthText ?? null,
    doseFormText: partial.doseFormText ?? null,
    brandName: partial.brandName ?? null,
    relationshipMetadata: partial.relationshipMetadata ?? null,
    rowChecksum: partial.rowChecksum ?? computeRxNormRowChecksum({
      rxcui: partial.rxcui ?? "",
      termType: partial.termType ?? "",
      displayTerm: partial.displayTerm ?? "",
    }),
    parsingStatus: "REJECTED",
    validationStatus: "REJECTED",
    rejectionReason: reason,
    dataClassification: "FIXTURE",
  };
}

export function parseSyntheticRxNormFixture(input: {
  filePath: string;
  expectedReleaseIdentifier?: string;
}): ParseSyntheticRxNormResult {
  const raw = readFileSync(input.filePath, "utf8");
  const sourceChecksumSha256 = computeFileChecksumSha256(raw);
  const parsed = JSON.parse(raw) as SyntheticRxNormFixture;

  if (parsed.fixtureKind !== "SYNTHETIC_CERTIFICATION" || parsed.notRealRxNorm !== true) {
    throw new Error("Fixture must declare fixtureKind=SYNTHETIC_CERTIFICATION and notRealRxNorm=true");
  }
  if (parsed.sourceFormat !== "SYNTHETIC_JSON") {
    throw new Error(`Unsupported sourceFormat ${parsed.sourceFormat}`);
  }
  if (
    input.expectedReleaseIdentifier &&
    parsed.releaseIdentifier !== input.expectedReleaseIdentifier
  ) {
    throw new Error(
      `Release identifier mismatch: expected ${input.expectedReleaseIdentifier}, got ${parsed.releaseIdentifier}`
    );
  }

  const acceptedRows: ParsedRxNormStagingRow[] = [];
  const rejectedRows: ParsedRxNormStagingRow[] = [];
  const warnings: string[] = [];

  parsed.rows.forEach((row, index) => {
    const sourceRowNumber = index + 1;
    const rxcui = row.rxcui?.trim() ?? "";
    const termType = (row.termTypeOverride ?? row.termType ?? "").trim().toUpperCase();
    const displayTerm = row.displayTerm?.trim() ?? "";

    if (!rxcui || !isSyntheticRxcui(rxcui)) {
      rejectedRows.push(rejectRow(sourceRowNumber, { rxcui, termType, displayTerm }, "invalid_synthetic_rxcui"));
      return;
    }
    if (!termType) {
      rejectedRows.push(rejectRow(sourceRowNumber, { rxcui, termType, displayTerm }, "missing_term_type"));
      return;
    }
    if (!displayTerm) {
      rejectedRows.push(rejectRow(sourceRowNumber, { rxcui, termType, displayTerm }, "missing_display_term"));
      return;
    }
    if (!isSupportedTermTypeForStaging(termType)) {
      rejectedRows.push(
        rejectRow(sourceRowNumber, { rxcui, termType, displayTerm }, `unsupported_term_type:${termType}`)
      );
      return;
    }

    const checksumFields: RxNormRowChecksumFields = {
      rxcui,
      termType,
      displayTerm,
      language: row.language ?? null,
      suppressFlag: row.suppressFlag ?? null,
      sourceCode: row.sourceCode ?? null,
      ingredientIdentity: row.ingredientIdentity ?? null,
      strengthText: row.strengthText ?? null,
      doseFormText: row.doseFormText ?? null,
      brandName: row.brandName ?? null,
    };

    const normalizedTerm = normalizeRxNormDisplayTerm(displayTerm);
    const validationStatus: ParsedRxNormStagingRow["validationStatus"] =
      row.suppressFlag?.trim().toUpperCase() === "Y" ? "WARNING" : "ACCEPTED";

    if (row.suppressFlag?.trim().toUpperCase() === "Y") {
      warnings.push(`Row ${sourceRowNumber} (${rxcui}) is suppressed (Y)`);
    }

    acceptedRows.push({
      sourceRowNumber,
      rxcui,
      termType,
      language: row.language?.trim() || null,
      suppressFlag: row.suppressFlag?.trim() || null,
      sourceVocabulary: parsed.sourceVocabulary ?? "RXNORM",
      sourceCode: row.sourceCode?.trim() || null,
      displayTerm,
      normalizedTerm,
      ingredientIdentity: row.ingredientIdentity?.trim() || null,
      strengthText: row.strengthText?.trim() || null,
      doseFormText: row.doseFormText?.trim() || null,
      brandName: row.brandName?.trim() || null,
      relationshipMetadata: row.relationshipMetadata ?? null,
      rowChecksum: computeRxNormRowChecksum(checksumFields),
      parsingStatus: "PARSED",
      validationStatus,
      rejectionReason: null,
      dataClassification: "FIXTURE",
    });
  });

  return {
    fixture: parsed,
    sourceChecksumSha256,
    sourceFilename: input.filePath,
    acceptedRows,
    rejectedRows,
    warnings,
  };
}

export function detectDuplicateNormalizedNames(rows: ParsedRxNormStagingRow[]): string[] {
  const byName = new Map<string, string[]>();
  for (const row of rows) {
    if (row.validationStatus === "REJECTED") continue;
    const list = byName.get(row.normalizedTerm) ?? [];
    list.push(row.rxcui);
    byName.set(row.normalizedTerm, list);
  }
  const duplicates: string[] = [];
  for (const [name, rxcuis] of byName.entries()) {
    if (rxcuis.length > 1) duplicates.push(`${name} -> ${rxcuis.join(",")}`);
  }
  return duplicates;
}

export function detectDuplicateRxcui(rows: ParsedRxNormStagingRow[]): string[] {
  const byRxcui = new Map<string, number>();
  for (const row of rows) {
    if (row.validationStatus === "REJECTED") continue;
    byRxcui.set(row.rxcui, (byRxcui.get(row.rxcui) ?? 0) + 1);
  }
  return [...byRxcui.entries()].filter(([, count]) => count > 1).map(([rxcui]) => rxcui);
}
