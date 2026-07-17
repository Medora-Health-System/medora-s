import type { RxNormCandidateStatus } from "./medicationRxNormImportModes.js";

export const RXNORM_REJECTION_REASON_VALUES = [
  "WRONG_INGREDIENT",
  "WRONG_STRENGTH",
  "WRONG_DOSE_FORM",
  "WRONG_BRAND",
  "WRONG_SEMANTIC_LEVEL",
  "DUPLICATE_TARGET",
  "AMBIGUOUS_SOURCE",
  "SUPPRESSED_SOURCE",
  "RETIRED_SOURCE",
  "SYNTHETIC_ONLY",
  "INSUFFICIENT_EVIDENCE",
  "TERM_TYPE_MISMATCH",
  "SYNTHETIC_REAL_VIOLATION",
  "OTHER",
] as const;

export type RxNormRejectionReasonCategory = (typeof RXNORM_REJECTION_REASON_VALUES)[number];

export const RXNORM_CONFLICT_OVERRIDE_REASON_VALUES = [
  "AMBIGUOUS_SOURCE",
  "MULTIPLE_CANDIDATES",
  "STRENGTH_MISMATCH",
  "DOSE_FORM_MISMATCH",
  "MANUAL_ADJUDICATION",
] as const;

export type RxNormConflictOverrideReason = (typeof RXNORM_CONFLICT_OVERRIDE_REASON_VALUES)[number];

export const RXNORM_MAPPING_DECISION_VALUES = [
  "CANDIDATE",
  "NEEDS_REVIEW",
  "AMBIGUOUS",
  "CONFLICT",
  "VERIFIED",
  "REJECTED",
  "RETIRED",
] as const;

export type RxNormMappingDecision = (typeof RXNORM_MAPPING_DECISION_VALUES)[number];

export const RXNORM_VERIFIABLE_CANDIDATE_STATUS_VALUES = [
  "CANDIDATE",
  "NEEDS_REVIEW",
  "AMBIGUOUS",
  "CONFLICT",
] as const;

export type RxNormVerifiableCandidateStatus = (typeof RXNORM_VERIFIABLE_CANDIDATE_STATUS_VALUES)[number];

export type RxNormVerifyTargetKind = "MEDICATION_CONCEPT" | "MEDICATION_PRODUCT";

/** Legal candidate-status transitions for Phase 4 manual review. */
export const RXNORM_MAPPING_STATUS_TRANSITIONS: Record<
  RxNormCandidateStatus,
  readonly RxNormMappingDecision[]
> = {
  CANDIDATE: ["VERIFIED", "REJECTED"],
  NEEDS_REVIEW: ["VERIFIED", "REJECTED"],
  AMBIGUOUS: ["VERIFIED", "REJECTED"],
  CONFLICT: ["VERIFIED", "REJECTED"],
  VERIFIED: ["RETIRED"],
  REJECTED: [],
  RETIRED: [],
};

export function assertLegalMappingTransition(from: RxNormCandidateStatus, to: RxNormMappingDecision): void {
  const allowed = RXNORM_MAPPING_STATUS_TRANSITIONS[from] ?? [];
  if (!(allowed as readonly string[]).includes(to)) {
    throw new Error(`Illegal RxNorm mapping transition: ${from} -> ${to}`);
  }
}

export function isSyntheticRxCui(rxcui: string): boolean {
  return rxcui.trim().toUpperCase().startsWith("SYNTH");
}

export function isSyntheticTargetCode(code: string | null | undefined): boolean {
  const normalized = (code ?? "").trim().toUpperCase();
  return normalized.startsWith("SYNTH_MC_") || normalized.startsWith("SYNTH_MP_");
}

export function assertSyntheticToRealMappingBlocked(input: {
  rxcui: string;
  targetDataClassification: string | null | undefined;
  targetCode: string | null | undefined;
}): void {
  if (!isSyntheticRxCui(input.rxcui)) return;

  const classification = (input.targetDataClassification ?? "UNKNOWN").trim().toUpperCase();
  const syntheticTarget = isSyntheticTargetCode(input.targetCode);

  if (classification !== "FIXTURE" || !syntheticTarget) {
    throw new Error(
      "SyntheticToRealMappingBlocked: SYNTH* RxCUI must map only to FIXTURE targets with SYNTH_MC_* or SYNTH_MP_* codes."
    );
  }
}

const CONCEPT_TERM_TYPES = new Set(["IN", "PIN", "MIN", "BN"]);
const PRODUCT_TERM_TYPES = new Set(["SCD", "SBD", "SCDF", "SBDF"]);

export function assertTargetKindCompatibleWithTermType(
  termType: string,
  targetKind: RxNormVerifyTargetKind
): void {
  const normalizedTermType = termType.trim().toUpperCase();
  const normalizedTargetKind = targetKind.trim().toUpperCase() as RxNormVerifyTargetKind;

  if (normalizedTermType === "DF" || normalizedTermType === "DFG") {
    throw new Error(`Term type ${normalizedTermType} cannot be verified to a canonical target in Phase 4.`);
  }

  if (normalizedTermType === "BN" && normalizedTargetKind === "MEDICATION_PRODUCT") {
    throw new Error("Term type BN may map to MedicationConcept aliases only, not MedicationProduct.");
  }

  // Pack term types require package architecture — deferred beyond Phase 4.
  if (normalizedTermType === "GPCK" || normalizedTermType === "BPCK") {
    throw new Error(`Term type ${normalizedTermType} cannot be verified until package mapping is certified.`);
  }

  if (CONCEPT_TERM_TYPES.has(normalizedTermType)) {
    if (normalizedTargetKind !== "MEDICATION_CONCEPT") {
      throw new Error(`Term type ${normalizedTermType} requires MEDICATION_CONCEPT target.`);
    }
    return;
  }

  if (PRODUCT_TERM_TYPES.has(normalizedTermType)) {
    if (normalizedTargetKind !== "MEDICATION_PRODUCT") {
      throw new Error(`Term type ${normalizedTermType} requires MEDICATION_PRODUCT target.`);
    }
    return;
  }

  throw new Error(`Unsupported term type for Phase 4 verification: ${normalizedTermType}`);
}

export function requiresConflictAdjudication(status: string): boolean {
  const normalized = status.trim().toUpperCase();
  return normalized === "AMBIGUOUS" || normalized === "CONFLICT";
}

export function assertConflictAdjudication(input: {
  status: string;
  acknowledged: boolean;
  overrideReasons: readonly string[] | null | undefined;
  notes: string | null | undefined;
}): void {
  if (!requiresConflictAdjudication(input.status)) return;

  if (!input.acknowledged) {
    throw new Error("Conflict adjudication requires conflictOverrideAcknowledged=true.");
  }

  const reasons = (input.overrideReasons ?? [])
    .map((value) => value.trim().toUpperCase())
    .filter(Boolean);
  if (reasons.length === 0) {
    throw new Error("Conflict adjudication requires at least one override reason.");
  }

  for (const reason of reasons) {
    if (!(RXNORM_CONFLICT_OVERRIDE_REASON_VALUES as readonly string[]).includes(reason)) {
      throw new Error(`Unknown conflict override reason: ${reason}`);
    }
  }

  if (!(input.notes ?? "").trim()) {
    throw new Error("Conflict adjudication requires reviewer rationale notes.");
  }
}
