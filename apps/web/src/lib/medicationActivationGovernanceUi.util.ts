/**
 * Phase 19G.2B — Activation queue UX (read-only gates; does not bypass server validation).
 */

import type { ActivationCandidateRow } from "./medicationActivationGovernanceApi";

export type ActivationBlockerCode = string;

export type ParsedActivationApiError = {
  httpStatus: number;
  message: string;
  blockers: ActivationBlockerCode[];
};

export type ActivationCandidateUiState = {
  governanceReviewRequired: boolean;
  governanceActivationApproved: boolean;
  forwardStepsDisabled: boolean;
  canDisableRuntime: boolean;
  blockerMessages: string[];
};

const FORWARD_STEP_BLOCKERS = new Set([
  "GOVERNANCE_REVIEW_REQUIRED",
  "GOVERNANCE_BLOCKED",
  "GOVERNANCE_RETIRED",
  "DUPLICATE_GOVERNANCE_UNRESOLVED",
  "DUPLICATE_GOVERNANCE_BLOCKED",
  "CONFIRM_EXACT_SOURCE_REQUIRED",
  "CONFIRM_DUPLICATE_RESOLVED_REQUIRED",
  "NOTE_REQUIRED",
  "FORMULARY_NOT_APPROVED",
  "ORDER_SEARCH_NOT_ENABLED",
  "FACILITY_FORMULARY_MISSING",
  "MISSING_EXACT_NAME_DOSE_FORM",
  "NDC_REVIEW_REQUIRED",
]);

/** Parse Nest 400 body: `{ message, blockers: string[] }`. */
export function parseActivationApiError(
  responseText: string,
  httpStatus: number
): ParsedActivationApiError {
  const trimmed = responseText.trim();
  let message = trimmed;
  let blockers: ActivationBlockerCode[] = [];

  if (trimmed.startsWith("{")) {
    try {
      const body = JSON.parse(trimmed) as {
        message?: unknown;
        blockers?: unknown;
      };
      if (typeof body.message === "string" && body.message.trim()) {
        message = body.message.trim();
      }
      if (Array.isArray(body.blockers)) {
        blockers = body.blockers.filter((b): b is string => typeof b === "string");
      }
    } catch {
      /* use raw text */
    }
  }

  return { httpStatus, message, blockers };
}

export function formatActivationBlockerMessage(
  code: ActivationBlockerCode,
  t: (key: string) => string
): string {
  const key = `medicationGovernanceActivation.blocker.${code}`;
  const translated = t(key);
  if (translated !== key) return translated;
  return code;
}

export function formatActivationApiErrorMessage(
  parsed: ParsedActivationApiError,
  t: (key: string) => string
): string {
  if (parsed.blockers.length > 0) {
    const lines = parsed.blockers.map((c) => formatActivationBlockerMessage(c, t));
    return lines.join(" ");
  }
  if (parsed.message && !parsed.message.startsWith("{")) {
    return parsed.message;
  }
  return t("medicationGovernanceActivation.errorAction");
}

export function isGovernanceActivationApproved(governanceStatus: string): boolean {
  return governanceStatus.trim() === "ACTIVATION_APPROVED";
}

export function getActivationCandidateUiState(
  row: ActivationCandidateRow,
  t: (key: string) => string
): ActivationCandidateUiState {
  const governanceReviewRequired = row.governanceStatus === "REVIEW_REQUIRED";
  const governanceActivationApproved = isGovernanceActivationApproved(row.governanceStatus);
  const duplicateBlocks =
    !row.duplicateGovernanceResolved ||
    row.duplicateGovernanceStatus === "BLOCKED_DUPLICATE";

  const blockerMessages = [
    ...new Set(
      row.blockerReasons.map((c) => formatActivationBlockerMessage(c, t))
    ),
  ];

  const forwardStepsDisabled =
    !governanceActivationApproved ||
    duplicateBlocks ||
    row.blockerReasons.some((c) => FORWARD_STEP_BLOCKERS.has(c));

  const canDisableRuntime =
    row.runtime.orderSearchEnabled ||
    row.runtime.marEnabled ||
    row.runtime.billingEnabled ||
    row.runtime.billingReviewRequired;

  return {
    governanceReviewRequired,
    governanceActivationApproved,
    forwardStepsDisabled,
    canDisableRuntime,
    blockerMessages,
  };
}
