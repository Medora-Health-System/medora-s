/**
 * Phase 8.2 — append-only clearinghouse / claim operational audit events (durable).
 * Stored as plain strings in DB; keep in sync with writers and observability queries.
 */
export const CLAIM_OPERATIONAL_EVENT_TYPES = [
  "SUBMISSION_CREATED",
  "SEND_ATTEMPT_STARTED",
  "SEND_ATTEMPT_SUCCEEDED",
  "SEND_ATTEMPT_FAILED",
  "SEND_BLOCKED_DUPLICATE",
  "SEND_BLOCKED_RATE_LIMIT",
  "SEND_BLOCKED_CIRCUIT_OPEN",
  "RETRY_SCHEDULED",
  "RETRY_TRIGGERED",
  "RETRY_SKIPPED",
  "ACK_RECEIVED",
  "ACK_DUPLICATE_IGNORED",
  "ACK_MATCHED",
  "ACK_MATCH_WEAK",
  "ACK_REJECTED",
  "DEAD_LETTER_CREATED",
  "DEAD_LETTER_REPLAYED",
  /** Facility breaker tripped (no specific submission). */
  "LIVE_CIRCUIT_OPENED",
] as const;

export type ClaimOperationalEventType = (typeof CLAIM_OPERATIONAL_EVENT_TYPES)[number];

export function isClaimOperationalEventType(s: string): s is ClaimOperationalEventType {
  return (CLAIM_OPERATIONAL_EVENT_TYPES as readonly string[]).includes(s);
}

/** Map outbound stabilization / idempotency skip codes to persisted event type. */
export function operationalEventTypeForOutboundBlockCode(code: string): ClaimOperationalEventType {
  if (code === "LIVE_SEND_CIRCUIT_OPEN") return "SEND_BLOCKED_CIRCUIT_OPEN";
  if (code === "LIVE_SEND_RATE_LIMITED" || code === "LIVE_SEND_THROTTLED") return "SEND_BLOCKED_RATE_LIMIT";
  return "SEND_BLOCKED_DUPLICATE";
}
