/**
 * FY2026 Spanish clinician-display allow set.
 * Exact canonical ICD-10-CM code identity only. No parent/sibling inheritance.
 */

import { formatIcd10CmDisplayCode } from "./formatIcd10CmDisplayCode.js";
import {
  ICD10_CIE10ES_ARTIFACT_SHA256,
  ICD10_CIE10ES_SOURCE_ID,
  ICD10_CIE10ES_TERMINOLOGY_VERSION,
} from "./icd10TerminologyTypes.js";
import {
  intersectNationalSource,
  type NationalSourceRow,
  type UsCatalogRow,
} from "./nationalIcd10SourceValidation.js";
import type { Icd10LicensedArtifactRecord } from "./licensedIcd10TerminologyArtifact.js";

export const ICD10_CIE10ES_EXPECTED_HEADER_EXCLUSIONS = [
  "B88.0",
  "D71",
  "E72.53",
  "E78.01",
  "E88.1",
  "G35",
  "H01.8",
  "Q89.8",
  "Q99.8",
  "R10.2",
  "R76.8",
  "Z40.8",
  "Z59.86",
  "Z84.1",
  "Z91.011",
  "Z91.012",
] as const;

export type Cie10esMissingReason = "FY2026_SELECTABLE_ABSENT_FROM_CIE10ES_2026_FINALES";

export type Cie10esMissingCodeRow = {
  code: string;
  normalizedCode: string;
  family: string;
  reason: Cie10esMissingReason;
};

export type Cie10esAdmissionGate = {
  SOURCE_SHA256_MATCH: "YES" | "NO";
  RELEASE: string;
  US_SELECTABLE_COUNT: number;
  ES_ALLOWED_COUNT: number;
  ES_HEADER_EXCLUSIONS: number;
  ES_SOURCE_ONLY_EXCLUSIONS: number;
  DUPLICATES: number;
  BLANK_LABELS: number;
  INVALID_CODES: number;
  CROSS_LANGUAGE_FALLBACK: number;
  CATEGORY_INHERITANCE: number;
  PASS: boolean;
};

export type Cie10esFy2026AllowSet = {
  allowed: Array<{ code: string; normalizedCode: string; label: string }>;
  headerExcluded: string[];
  sourceOnlyExcluded: string[];
  missingUsSelectable: Cie10esMissingCodeRow[];
  duplicates: number;
  blankLabels: number;
  invalidCodes: number;
  gate: Cie10esAdmissionGate;
};

export function classifyFy2026EsMissingFamily(normalizedCode: string): string {
  return normalizedCode.slice(0, 3);
}

export function buildCie10esFy2026AllowSet(input: {
  usRows: readonly UsCatalogRow[];
  esFinales: readonly NationalSourceRow[];
  sourceSha256: string;
  expectedSha256?: string;
  expectedRelease?: string;
  expectedUsSelectable?: number;
}): Cie10esFy2026AllowSet {
  const expectedSha = (input.expectedSha256 ?? ICD10_CIE10ES_ARTIFACT_SHA256).toLowerCase();
  const expectedRelease = input.expectedRelease ?? "FY2026";
  const expectedUsSelectable = input.expectedUsSelectable ?? 74719;
  const stats = intersectNationalSource({
    usRows: input.usRows,
    sourceRows: input.esFinales,
    terminalOnly: true,
  });
  const usByNorm = new Map(input.usRows.filter((row) => row.selectable).map((row) => [row.normalizedCode, row]));
  const esByNorm = new Map(
    input.esFinales
      .filter((row) => row.terminal && row.label.trim())
      .map((row) => [row.normalizedCode, row] as const),
  );
  const allowed = stats.intersectionCodes.flatMap((normalized) => {
    const us = usByNorm.get(normalized);
    const es = esByNorm.get(normalized);
    if (!us || !es) return [];
    if (us.normalizedCode !== es.normalizedCode) return [];
    return [
      {
        code: us.code,
        normalizedCode: normalized,
        label: es.label.trim(),
      },
    ];
  });
  const missingUsSelectable: Cie10esMissingCodeRow[] = stats.usOnlyCodes.map((normalized) => {
    const us = usByNorm.get(normalized);
    const code = us?.code || formatIcd10CmDisplayCode(normalized);
    return {
      code,
      normalizedCode: normalized,
      family: classifyFy2026EsMissingFamily(normalized),
      reason: "FY2026_SELECTABLE_ABSENT_FROM_CIE10ES_2026_FINALES",
    };
  });
  const shaMatch = input.sourceSha256.toLowerCase() === expectedSha;
  const gate: Cie10esAdmissionGate = {
    SOURCE_SHA256_MATCH: shaMatch ? "YES" : "NO",
    RELEASE: expectedRelease,
    US_SELECTABLE_COUNT: stats.usSelectableTotal,
    ES_ALLOWED_COUNT: allowed.length,
    ES_HEADER_EXCLUSIONS: stats.categoryCollisions,
    ES_SOURCE_ONLY_EXCLUSIONS: stats.sourceOnly,
    DUPLICATES: stats.duplicateNormalized,
    BLANK_LABELS: stats.blankLabels,
    INVALID_CODES: stats.invalidUnrecognized,
    CROSS_LANGUAGE_FALLBACK: 0,
    CATEGORY_INHERITANCE: 0,
    PASS: false,
  };
  gate.PASS =
    gate.SOURCE_SHA256_MATCH === "YES" &&
    gate.RELEASE === "FY2026" &&
    gate.US_SELECTABLE_COUNT === expectedUsSelectable &&
    gate.DUPLICATES === 0 &&
    gate.BLANK_LABELS === 0 &&
    gate.INVALID_CODES === 0 &&
    gate.CROSS_LANGUAGE_FALLBACK === 0 &&
    gate.CATEGORY_INHERITANCE === 0 &&
    gate.ES_ALLOWED_COUNT === allowed.length &&
    allowed.length > 0;
  return {
    allowed,
    headerExcluded: stats.categoryCollisionCodes,
    sourceOnlyExcluded: stats.sourceOnlyCodes,
    missingUsSelectable,
    duplicates: stats.duplicateNormalized,
    blankLabels: stats.blankLabels,
    invalidCodes: stats.invalidUnrecognized,
    gate,
  };
}

export function buildCie10esLicensedArtifactRecords(
  allowed: readonly { code: string; label: string }[],
  releaseVersion = "FY2026",
): Icd10LicensedArtifactRecord[] {
  return allowed.map((row) => ({
    code: row.code,
    locale: "es",
    label: row.label,
    sourceId: ICD10_CIE10ES_SOURCE_ID,
    terminologyVersion: ICD10_CIE10ES_TERMINOLOGY_VERSION,
    provenance: "OFFICIAL_SOURCE",
    status: "APPROVED",
    labelRegister: "CLINICIAN_PREFERRED",
    exactness: "EXACT_SOURCE",
    codeSystem: "ICD-10-CM",
    releaseVersion,
  }));
}
