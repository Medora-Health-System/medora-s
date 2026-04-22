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
 * Phase 7.5 — Optional scope: evaluate gate for one submission package side without changing encounter-level defaults.
 * - `encounter` (default): uses `claimReady` / `claimBlockers` (both sides must be ready when both packages exist).
 * - `professional` / `facility`: uses `professionalClaimReady` / `facilityClaimReady` when present on the summary.
 */
export type SubmissionGateScope = "encounter" | "professional" | "facility";

function gateFromReadyAndBlockers(claimReady: boolean, blockers: readonly string[]): SubmissionGateResult {
  if (!claimReady) {
    return {
      allowed: false,
      reasonCode: "CLAIM_NOT_READY_FOR_SUBMISSION",
      blockers: [...blockers],
      claimReady: false,
      blockedByCompleteness: true,
    };
  }
  if (blockers.length > 0) {
    return {
      allowed: false,
      reasonCode: "CLAIM_BLOCKERS_PRESENT",
      blockers: [...blockers],
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

/**
 * Authoritative submission gate (Phase 7.2 + 7.5 scope).
 * Prefers `claimReady` / `claimBlockers` when present; falls back to legacy `readyForExport`/`blockers`.
 */
export function evaluateSubmissionGate(
  summary: EncounterClaimExportSummary,
  scope: SubmissionGateScope = "encounter"
): SubmissionGateResult {
  if (scope === "professional" && typeof summary.professionalClaimReady === "boolean") {
    return gateFromReadyAndBlockers(
      summary.professionalClaimReady,
      summary.professionalClaimBlockers ?? []
    );
  }
  if (scope === "facility" && typeof summary.facilityClaimReady === "boolean") {
    return gateFromReadyAndBlockers(summary.facilityClaimReady, summary.facilityClaimBlockers ?? []);
  }

  const hasClaimReady = typeof summary.claimReady === "boolean";
  const claimBlockers = summary.claimBlockers ?? [];
  if (hasClaimReady) {
    return gateFromReadyAndBlockers(summary.claimReady, claimBlockers);
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
