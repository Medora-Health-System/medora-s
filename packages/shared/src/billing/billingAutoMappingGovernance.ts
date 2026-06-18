export type BillingAutoMappingCandidateType =
  | "LAB"
  | "IMAGING"
  | "MEDICATION_DRUG"
  | "MEDICATION_ADMINISTRATION"
  | "PROCEDURE"
  | "EMERGENCY_E_M"
  | "FACILITY_FEE"
  | "UNKNOWN";

export type BillingAutoMappingConfidence = "HIGH" | "MEDIUM" | "LOW";

export type BillingAutoMappingDecision = "APPLY" | "REVIEW" | "SKIP";

export type BillingAutoMappingCandidate = {
  ledgerLineId: string;
  candidateType: BillingAutoMappingCandidateType;
  sourceLabel: string;
  normalizedKey: string;
  currentCode: string | null;
  proposedCode: string;
  proposedCodeType: "CPT" | "HCPCS";
  proposedBillingSide: "UNKNOWN" | "PROFESSIONAL" | "FACILITY" | "BOTH";
  proposedProcedureCode?: string | null;
  proposedHcpcsCode?: string | null;
  confidence: BillingAutoMappingConfidence;
  decision: BillingAutoMappingDecision;
  reason: string;
  warnings: string[];
  candidateSignature: string;
};

export type BillingAutoMappingGovernanceInput = {
  confidence: BillingAutoMappingConfidence;
  candidateType: BillingAutoMappingCandidateType;
  isUnmapped: boolean;
  isManuallyEdited: boolean;
  isDoNotBill: boolean;
  isVoidedOrSkipped: boolean;
  isFinalizedEncounter: boolean;
  medicationAdministrationRouteMissing?: boolean;
  ambiguousCatalogMatch?: boolean;
  hasCatalogMatch: boolean;
};

const UNMAPPED_RE = /^UNMAPPED$/i;

export function normalizeBillingMappingKey(value: string | null | undefined): string {
  return (value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\u0300-\u036f/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function isUnmappedBillingCode(value: string | null | undefined): boolean {
  const t = value?.trim();
  return !t || UNMAPPED_RE.test(t);
}

export function ledgerLineLooksUnmapped(codes: {
  code?: string | null;
  procedureCode?: string | null;
  hcpcsCode?: string | null;
}): boolean {
  return (
    isUnmappedBillingCode(codes.code) &&
    isUnmappedBillingCode(codes.procedureCode) &&
    isUnmappedBillingCode(codes.hcpcsCode)
  );
}

export function buildBillingAutoMappingCandidateSignature(input: {
  ledgerLineId: string;
  currentCode: string | null;
  proposedCode: string;
  normalizedKey: string;
  proposedCodeType: "CPT" | "HCPCS";
}): string {
  return [
    input.ledgerLineId,
    input.currentCode ?? "",
    input.proposedCode,
    input.proposedCodeType,
    input.normalizedKey,
  ].join("|");
}

export function resolveBillingAutoMappingDecision(input: BillingAutoMappingGovernanceInput): BillingAutoMappingDecision {
  if (input.isFinalizedEncounter) return "SKIP";
  if (input.isVoidedOrSkipped) return "SKIP";
  if (input.isDoNotBill) return "SKIP";
  if (input.isManuallyEdited) return "SKIP";
  if (!input.isUnmapped) return "SKIP";
  if (!input.hasCatalogMatch) return "SKIP";
  if (input.confidence === "LOW") return "SKIP";
  if (input.ambiguousCatalogMatch) return "REVIEW";
  if (input.confidence === "MEDIUM") return "REVIEW";
  if (
    (input.candidateType === "MEDICATION_ADMINISTRATION" ||
      input.candidateType === "MEDICATION_DRUG") &&
    input.medicationAdministrationRouteMissing
  ) {
    return "REVIEW";
  }
  if (input.confidence === "HIGH") return "APPLY";
  return "SKIP";
}

export function shouldAutoApplyBillingMapping(decision: BillingAutoMappingDecision): boolean {
  return decision === "APPLY";
}

export function billingEventHasManualLedgerEdit(metadata: unknown): boolean {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return false;
  return Boolean((metadata as Record<string, unknown>).manualLedgerEdit);
}

export type BillingAutoMappingCandidateGroups = {
  apply: BillingAutoMappingCandidate[];
  review: BillingAutoMappingCandidate[];
  skip: BillingAutoMappingCandidate[];
};

export function groupBillingAutoMappingCandidates(
  candidates: readonly BillingAutoMappingCandidate[]
): BillingAutoMappingCandidateGroups {
  const apply: BillingAutoMappingCandidate[] = [];
  const review: BillingAutoMappingCandidate[] = [];
  const skip: BillingAutoMappingCandidate[] = [];
  for (const candidate of candidates) {
    if (candidate.decision === "APPLY") apply.push(candidate);
    else if (candidate.decision === "REVIEW") review.push(candidate);
    else skip.push(candidate);
  }
  return { apply, review, skip };
}
