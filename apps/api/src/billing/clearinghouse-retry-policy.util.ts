/**
 * Deterministic outbound send retry policy (Phase 6.6).
 * Does not auto-execute retries in-process — only classifies and schedules `nextRetryAt` on attempts.
 */

/** Max retry *windows* after a failed attempt (1m, 5m, 15m). Fourth consecutive failure is not given a new slot. */
export const MAX_OUTBOUND_SEND_FAILURE_WINDOWS = 3;

/** Backoff after failure ordinal 1, 2, 3 (exponential-ish). */
export const OUTBOUND_RETRY_BACKOFF_MS = [60_000, 300_000, 900_000] as const;

export type OutboundAttemptFailureClass = "success" | "skipped" | "retryable" | "non_retryable";

/** Known non-retryable error tokens / messages (explicit transport or state). */
const NON_RETRY_EXACT = new Set([
  "EXTERNAL_SEND_BLOCKED_IN_PRODUCTION",
  "CLEARINGHOUSE_NOT_CONFIGURED",
  "CLEARINGHOUSE_DISABLED",
  "TRANSPORT_NOT_CONFIGURED",
  "DUPLICATE_SEND_BLOCKED",
  "TERMINAL_STATE_ALREADY_REACHED",
  "SEND_NOT_ALLOWED",
  "SEND_BLOCKED_CLAIM_NOT_READY",
  "RETRY_SKIPPED_CLAIM_NOT_READY",
  "SEND_BLOCKED_ALREADY_SENT",
  "SEND_BLOCKED_RECENT_SUCCESS",
  "SEND_BLOCKED_IN_FLIGHT",
  "LIVE_SEND_CIRCUIT_OPEN",
  "LIVE_SEND_RATE_LIMITED",
  "LIVE_SEND_THROTTLED",
  "LIVE_SEND_CONCURRENT_LIMIT",
]);

function normalizeErr(s: string | null | undefined): string {
  return (s ?? "").trim();
}

/**
 * Classify a failed outbound attempt. Skipped attempts (invalid state) are never retryable.
 */
export function classifyOutboundAttemptFailure(input: {
  ok: boolean;
  skipped?: boolean;
  skipReason?: string | null;
  errorMessage?: string | null;
}): { failureClass: OutboundAttemptFailureClass; failureCode: string | null; retryEligible: boolean } {
  if (input.ok) {
    return { failureClass: "success", failureCode: null, retryEligible: false };
  }
  if (input.skipped) {
    const code = normalizeErr(input.skipReason) || "SKIPPED";
    return { failureClass: "skipped", failureCode: code, retryEligible: false };
  }
  const err = normalizeErr(input.errorMessage) || "UNKNOWN_TRANSPORT_FAILURE";
  if (NON_RETRY_EXACT.has(err)) {
    return { failureClass: "non_retryable", failureCode: err, retryEligible: false };
  }
  if (err.startsWith("SANDBOX_HTTP_4") && err !== "SANDBOX_HTTP_429") {
    return { failureClass: "non_retryable", failureCode: err, retryEligible: false };
  }
  return { failureClass: "retryable", failureCode: err, retryEligible: true };
}

/**
 * After a failed retryable attempt, schedule next retry time from failure ordinal (1 = first failure in chain).
 * Returns null when no further retry should be scheduled.
 */
export function nextRetryAtForOutboundFailureOrdinal(failureOrdinal: number, from: Date = new Date()): Date | null {
  if (failureOrdinal < 1 || failureOrdinal > MAX_OUTBOUND_SEND_FAILURE_WINDOWS) {
    return null;
  }
  const idx = Math.min(failureOrdinal - 1, OUTBOUND_RETRY_BACKOFF_MS.length - 1);
  return new Date(from.getTime() + OUTBOUND_RETRY_BACKOFF_MS[idx]);
}

export function shouldRetryOutboundAttempt(retryEligible: boolean, nextRetryAt: Date | null, now: Date = new Date()): boolean {
  if (!retryEligible) return false;
  if (!nextRetryAt) return false;
  return now.getTime() >= nextRetryAt.getTime();
}

/** True when the latest failed attempt is retry-eligible and the scheduled time has passed (worker / ops). */
export function isLatestAttemptDueForWorkerRetry(input: {
  latestAttempt: { ok: boolean; retryEligible: boolean; nextRetryAt: Date | null } | null | undefined;
  now?: Date;
}): boolean {
  const a = input.latestAttempt;
  const now = input.now ?? new Date();
  if (!a || a.ok) return false;
  return shouldRetryOutboundAttempt(a.retryEligible, a.nextRetryAt, now);
}
