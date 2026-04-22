import type { EncounterClaimExportSummary } from "@medora/shared";

export type SubmissionGateReasonCode =
  | "OK"
  | "CLAIM_NOT_READY_FOR_SUBMISSION"
  | "CLAIM_BLOCKERS_PRESENT"
  | "LEGACY_EXPORT_NOT_READY";

export type SubmissionGateResult = {
  allowed: boolean;
  reasonCode: SubmissionGateReasonCode;
  blockers: string[];
  claimReady: boolean | null;
  blockedByCompleteness: boolean;
};

/**
 * Authoritative submission gate (Phase 7.2).
 * Prefers `claimReady` / `claimBlockers` when present; falls back to legacy `readyForExport`/`blockers`.
 */
export function evaluateSubmissionGate(summary: EncounterClaimExportSummary): SubmissionGateResult {
  const hasClaimReady = typeof summary.claimReady === "boolean";
  const claimBlockers = summary.claimBlockers ?? [];
  if (hasClaimReady) {
    if (summary.claimReady === false) {
      return {
        allowed: false,
        reasonCode: "CLAIM_NOT_READY_FOR_SUBMISSION",
        blockers: [...claimBlockers],
        claimReady: false,
        blockedByCompleteness: true,
      };
    }
    if (claimBlockers.length > 0) {
      return {
        allowed: false,
        reasonCode: "CLAIM_BLOCKERS_PRESENT",
        blockers: [...claimBlockers],
        claimReady: true,
        blockedByCompleteness: true,
      };
    }
    return {
      allowed: true,
      reasonCode: "OK",
      blockers: [],
      claimReady: true,
      blockedByCompleteness: false,
    };
  }

  const legacyBlockers = summary.blockers ?? [];
  if (!summary.readyForExport || legacyBlockers.length > 0) {
    return {
      allowed: false,
      reasonCode: "LEGACY_EXPORT_NOT_READY",
      blockers: [...legacyBlockers],
      claimReady: null,
      blockedByCompleteness: false,
    };
  }
  return {
    allowed: true,
    reasonCode: "OK",
    blockers: [],
    claimReady: null,
    blockedByCompleteness: false,
  };
}

