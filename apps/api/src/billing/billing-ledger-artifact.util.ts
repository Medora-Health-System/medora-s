import type { ClaimEncounterValidation, ClaimValidationIssue } from "./claim-validation.util";
import type { EncounterClaimsResult } from "./claim-builder.service";
import type { BillingManualReviewGateDto } from "./dto/billing-readiness.dto";

export const BILLING_LEDGER_ARTIFACT_STATUS = {
  READY: "READY",
  NOT_READY: "NOT_READY",
} as const;

export type BillingLedgerArtifactStatus =
  (typeof BILLING_LEDGER_ARTIFACT_STATUS)[keyof typeof BILLING_LEDGER_ARTIFACT_STATUS];

export type BillingLedgerArtifactNotReadyPayload = {
  status: typeof BILLING_LEDGER_ARTIFACT_STATUS.NOT_READY;
  blockers: string[];
  warnings: string[];
  summary: Record<string, unknown> | null;
  message?: string;
};

export function manualBillingReviewUnresolvedIssue(
  unresolvedCount: number
): ClaimValidationIssue {
  return {
    code: "MANUAL_BILLING_REVIEW_UNRESOLVED",
    severity: "blocker",
    meta: { unresolvedCount },
  };
}

function appendIssue(
  validation: ClaimEncounterValidation,
  issue: ClaimValidationIssue
): ClaimEncounterValidation {
  const add = (pkg: { ready: boolean; blockers: ClaimValidationIssue[]; warnings: ClaimValidationIssue[] }) => ({
    ready: false,
    blockers: [...pkg.blockers, issue],
    warnings: pkg.warnings,
  });

  return {
    ...validation,
    summary: add(validation.summary),
    professional: add(validation.professional),
    facility: add(validation.facility),
  };
}

export function applyManualReviewGateToEncounterClaims(
  result: EncounterClaimsResult,
  gate: BillingManualReviewGateDto
): EncounterClaimsResult {
  if (gate.unresolvedCount <= 0) return result;

  const issue = manualBillingReviewUnresolvedIssue(gate.unresolvedCount);
  const validation = appendIssue(result.validation, issue);

  return {
    ...result,
    professional: { ...result.professional, ready: false },
    facility: { ...result.facility, ready: false },
    summary: {
      ...result.summary,
      ready: false,
    },
    validation,
  };
}

export function buildBillingLedgerArtifactNotReadyPayload(input: {
  blockers?: string[];
  warnings?: string[];
  summary?: Record<string, unknown> | null;
  message?: string;
}): BillingLedgerArtifactNotReadyPayload {
  return {
    status: BILLING_LEDGER_ARTIFACT_STATUS.NOT_READY,
    blockers: input.blockers ?? [],
    warnings: input.warnings ?? [],
    summary: input.summary ?? null,
    message: input.message,
  };
}
