/**
 * Phase 6.1 — X12 837 read-only transaction preview (no interchange envelope, no submission).
 * Structured for audit and future mapping to full 005010 implementation guides.
 */

export type X12ClaimKind = "837P" | "837I";

/** One X12 segment with raw element values (post-escape). */
export type X12Segment = {
  tag: string;
  elements: string[];
};

/** Single claim transaction preview (ST…SE region conceptually; flat segment list for readability). */
export type X12TransactionPreview = {
  kind: X12ClaimKind;
  segments: X12Segment[];
  /** Human-readable segment text (newline-separated terminators). */
  text: string;
  /** Human-readable caveats (e.g. scaffold-only, missing NPI). */
  warnings: string[];
  /** Stable machine identifiers for gaps vs production 837. */
  missingFields: string[];
};

export type EncounterX12ExportSummary = {
  /** True when at least one package produced a non-empty segment list. */
  readyForGeneration: boolean;
  warnings: string[];
  missingFields: string[];
};

export type EncounterX12ExportResult = {
  professional: X12TransactionPreview | null;
  facility: X12TransactionPreview | null;
  summary: EncounterX12ExportSummary;
};
