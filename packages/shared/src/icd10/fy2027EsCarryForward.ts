/**
 * MEDUI.TRILANG.DX.P3-F.8-ES — FY2027 Spanish carry-forward eligibility.
 *
 * A FY2026 Spanish label may become FY2027 terminology only when the canonical
 * ICD-10-CM concept is unchanged. Code equality is not sufficient.
 * Never mutates FY2026 rows.
 */
import { normalizeIcd10CodeForLookup } from "../icd10Normalize.js";
import { ICD10_FY2027_ES_CARRY_FORWARD_TERMINOLOGY_VERSION } from "./icd10TerminologyTypes.js";

export const FY2027_ES_CARRY_FORWARD_BUCKETS = [
  "CARRY_FORWARD_ELIGIBLE",
  "DESCRIPTION_CHANGED",
  "NEW_FY2027_CODE",
  "MISSING_FY2026_SPANISH",
  "NONSELECTABLE",
] as const;
export type Fy2027EsCarryForwardBucket = (typeof FY2027_ES_CARRY_FORWARD_BUCKETS)[number];

export type Fy2027EsCatalogConcept = {
  code: string;
  shortDescription: string;
  longDescription?: string | null;
  isSelectable: boolean;
  isBillable?: boolean;
};

export type Fy2027EsExistingLabel = {
  preferredLabel: string;
  provenance: string;
  exactness: string;
  sourceId: string;
  terminologyVersion: string;
  sourcePriority?: number;
};

export type Fy2027EsCarryForwardDecision = {
  code: string;
  normalizedCode: string;
  bucket: Fy2027EsCarryForwardBucket;
  eligible: boolean;
  fy2026Short: string | null;
  fy2027Short: string;
  label: string | null;
  provenance: string | null;
  exactness: string | null;
  sourceId: string | null;
  sourcePriority: number | null;
  originalTerminologyVersion: string | null;
  fy2027TerminologyVersion: string | null;
};

function selectable(row: Fy2027EsCatalogConcept): boolean {
  return row.isSelectable === true && row.isBillable !== false;
}

function normText(value: string | null | undefined): string {
  return (value ?? "").trim();
}

export function fy2027EsConceptUnchanged(
  fy2026: Fy2027EsCatalogConcept,
  fy2027: Fy2027EsCatalogConcept,
): boolean {
  return (
    normalizeIcd10CodeForLookup(fy2026.code) === normalizeIcd10CodeForLookup(fy2027.code) &&
    selectable(fy2026) &&
    selectable(fy2027) &&
    normText(fy2026.shortDescription) === normText(fy2027.shortDescription) &&
    normText(fy2026.longDescription) === normText(fy2027.longDescription)
  );
}

export function decideFy2027EsCarryForward(input: {
  fy2027: Fy2027EsCatalogConcept;
  fy2026?: Fy2027EsCatalogConcept | null;
  fy2026Es?: Fy2027EsExistingLabel | null;
}): Fy2027EsCarryForwardDecision {
  const normalizedCode = normalizeIcd10CodeForLookup(input.fy2027.code);
  const base = {
    code: input.fy2027.code,
    normalizedCode,
    fy2026Short: input.fy2026 ? normText(input.fy2026.shortDescription) : null,
    fy2027Short: normText(input.fy2027.shortDescription),
    label: null as string | null,
    provenance: null as string | null,
    exactness: null as string | null,
    sourceId: null as string | null,
    sourcePriority: null as number | null,
    originalTerminologyVersion: null as string | null,
    fy2027TerminologyVersion: null as string | null,
  };
  if (!selectable(input.fy2027)) {
    return { ...base, bucket: "NONSELECTABLE", eligible: false };
  }
  if (!input.fy2026 || !selectable(input.fy2026)) {
    return { ...base, bucket: "NEW_FY2027_CODE", eligible: false };
  }
  if (!fy2027EsConceptUnchanged(input.fy2026, input.fy2027)) {
    return { ...base, bucket: "DESCRIPTION_CHANGED", eligible: false };
  }
  const es = input.fy2026Es;
  if (!es?.preferredLabel.trim()) {
    return { ...base, bucket: "MISSING_FY2026_SPANISH", eligible: false };
  }
  return {
    ...base,
    bucket: "CARRY_FORWARD_ELIGIBLE",
    eligible: true,
    label: es.preferredLabel.trim(),
    provenance: es.provenance,
    exactness: es.exactness,
    sourceId: es.sourceId,
    sourcePriority: es.sourcePriority ?? null,
    originalTerminologyVersion: es.terminologyVersion,
    fy2027TerminologyVersion: ICD10_FY2027_ES_CARRY_FORWARD_TERMINOLOGY_VERSION,
  };
}

export type Fy2027EsCarryForwardSummary = {
  TOTAL_FY2027_SELECTABLE: number;
  CARRY_FORWARD_ELIGIBLE: number;
  DESCRIPTION_CHANGED: number;
  NEW_FY2027_CODE: number;
  MISSING_FY2026_SPANISH: number;
  NONSELECTABLE: number;
};

export function summarizeFy2027EsCarryForward(
  rows: readonly Fy2027EsCarryForwardDecision[],
): Fy2027EsCarryForwardSummary {
  const summary: Fy2027EsCarryForwardSummary = {
    TOTAL_FY2027_SELECTABLE: rows.length,
    CARRY_FORWARD_ELIGIBLE: 0,
    DESCRIPTION_CHANGED: 0,
    NEW_FY2027_CODE: 0,
    MISSING_FY2026_SPANISH: 0,
    NONSELECTABLE: 0,
  };
  for (const row of rows) summary[row.bucket] += 1;
  return summary;
}
