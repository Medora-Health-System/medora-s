import { ClaimSubmissionStatus } from "@prisma/client";

/** Terminal submission statuses — must not be overwritten by duplicate ACK replay. */
export const TERMINAL_SUBMISSION_STATUSES: readonly ClaimSubmissionStatus[] = [
  ClaimSubmissionStatus.ACCEPTED,
  ClaimSubmissionStatus.REJECTED,
  ClaimSubmissionStatus.NEEDS_CORRECTION,
] as const;

export function isTerminalSubmissionStatus(s: ClaimSubmissionStatus): boolean {
  return TERMINAL_SUBMISSION_STATUSES.includes(s);
}

/**
 * Strict directed edges for ClaimSubmission.status.
 * Successful transport sets READY_TO_SEND → SENT only; SENT → ACK_PENDING is driven by a 999 transport-accept (or dev simulate).
 */
const ALLOWED_EDGES: Record<ClaimSubmissionStatus, readonly ClaimSubmissionStatus[]> = {
  [ClaimSubmissionStatus.DRAFT]: [ClaimSubmissionStatus.GENERATED],
  [ClaimSubmissionStatus.GENERATED]: [ClaimSubmissionStatus.READY_TO_SEND],
  [ClaimSubmissionStatus.READY_TO_SEND]: [ClaimSubmissionStatus.SENT],
  [ClaimSubmissionStatus.SENT]: [ClaimSubmissionStatus.ACK_PENDING],
  [ClaimSubmissionStatus.ACK_PENDING]: [
    ClaimSubmissionStatus.ACCEPTED,
    ClaimSubmissionStatus.REJECTED,
    ClaimSubmissionStatus.NEEDS_CORRECTION,
  ],
  [ClaimSubmissionStatus.ACCEPTED]: [],
  [ClaimSubmissionStatus.REJECTED]: [],
  [ClaimSubmissionStatus.NEEDS_CORRECTION]: [],
  [ClaimSubmissionStatus.CANCELLED]: [],
} as Record<ClaimSubmissionStatus, readonly ClaimSubmissionStatus[]>;

export function canTransitionSubmissionStatus(from: ClaimSubmissionStatus, to: ClaimSubmissionStatus): boolean {
  const list = ALLOWED_EDGES[from];
  return list ? list.includes(to) : false;
}

export type SubmissionTransitionReasonCode =
  | "OK"
  | "INVALID_TRANSITION"
  | "SEND_NOT_ALLOWED"
  | "TERMINAL_STATE_ALREADY_REACHED"
  | "ACK_OUT_OF_SEQUENCE"
  | "DUPLICATE_ACK_REPLAY_IGNORED"
  | "TRANSPORT_999_NOT_APPLICABLE"
  | "TRANSPORT_999_REJECT_NO_TRANSITION"
  | "ACK_PARSE_INCONCLUSIVE"
  | "DUPLICATE_SEND_BLOCKED"
  | "ACK_UNMATCHED";

export function assertValidSubmissionTransition(
  from: ClaimSubmissionStatus,
  to: ClaimSubmissionStatus
): { ok: true } | { ok: false; reason: SubmissionTransitionReasonCode } {
  if (from === to) {
    return { ok: false, reason: "INVALID_TRANSITION" };
  }
  if (canTransitionSubmissionStatus(from, to)) {
    return { ok: true };
  }
  return { ok: false, reason: "INVALID_TRANSITION" };
}

/** After successful clearinghouse send: READY_TO_SEND → SENT (syntax/999 moves SENT → ACK_PENDING). */
export function nextStatusAfterSuccessfulSend(
  from: ClaimSubmissionStatus
): { next: ClaimSubmissionStatus | null; reason: SubmissionTransitionReasonCode } {
  if (isTerminalSubmissionStatus(from)) {
    return { next: null, reason: "TERMINAL_STATE_ALREADY_REACHED" };
  }
  if (from !== ClaimSubmissionStatus.READY_TO_SEND) {
    return { next: null, reason: "SEND_NOT_ALLOWED" };
  }
  if (!canTransitionSubmissionStatus(from, ClaimSubmissionStatus.SENT)) {
    return { next: null, reason: "INVALID_TRANSITION" };
  }
  return { next: ClaimSubmissionStatus.SENT, reason: "OK" };
}

/** Alias for API naming consistency (Phase 6.3.2). */
export const nextStatusFromSend = nextStatusAfterSuccessfulSend;

/** Claim-level outcome from 277CA only (not from 999 transport ack). */
export type ClaimAckOutcome = "ACCEPTED" | "REJECTED" | "NEEDS_CORRECTION";

export function nextStatusFrom277CA(
  from: ClaimSubmissionStatus,
  outcome: ClaimAckOutcome
): { next: ClaimSubmissionStatus | null; reason: SubmissionTransitionReasonCode } {
  if (isTerminalSubmissionStatus(from)) {
    return { next: null, reason: "DUPLICATE_ACK_REPLAY_IGNORED" };
  }
  if (from !== ClaimSubmissionStatus.ACK_PENDING) {
    return { next: null, reason: "ACK_OUT_OF_SEQUENCE" };
  }
  const target =
    outcome === "ACCEPTED"
      ? ClaimSubmissionStatus.ACCEPTED
      : outcome === "REJECTED"
        ? ClaimSubmissionStatus.REJECTED
        : ClaimSubmissionStatus.NEEDS_CORRECTION;
  if (!canTransitionSubmissionStatus(from, target)) {
    return { next: null, reason: "INVALID_TRANSITION" };
  }
  return { next: target, reason: "OK" };
}

/** 999 = transport/syntax — never maps to claim ACCEPTED/REJECTED as adjudication. */
export function nextStatusFrom999Transport(
  from: ClaimSubmissionStatus,
  transportAccept: boolean
): { next: ClaimSubmissionStatus | null; reason: SubmissionTransitionReasonCode } {
  if (isTerminalSubmissionStatus(from)) {
    return { next: null, reason: "DUPLICATE_ACK_REPLAY_IGNORED" };
  }
  if (from === ClaimSubmissionStatus.ACK_PENDING) {
    return { next: null, reason: "DUPLICATE_ACK_REPLAY_IGNORED" };
  }
  if (transportAccept) {
    if (from === ClaimSubmissionStatus.SENT && canTransitionSubmissionStatus(from, ClaimSubmissionStatus.ACK_PENDING)) {
      return { next: ClaimSubmissionStatus.ACK_PENDING, reason: "OK" };
    }
    if (
      from === ClaimSubmissionStatus.READY_TO_SEND ||
      from === ClaimSubmissionStatus.GENERATED ||
      from === ClaimSubmissionStatus.DRAFT
    ) {
      return { next: null, reason: "ACK_OUT_OF_SEQUENCE" };
    }
    return { next: null, reason: "TRANSPORT_999_NOT_APPLICABLE" };
  }
  if (from === ClaimSubmissionStatus.SENT) {
    return { next: null, reason: "TRANSPORT_999_REJECT_NO_TRANSITION" };
  }
  if (
    from === ClaimSubmissionStatus.READY_TO_SEND ||
    from === ClaimSubmissionStatus.GENERATED ||
    from === ClaimSubmissionStatus.DRAFT
  ) {
    return { next: null, reason: "ACK_OUT_OF_SEQUENCE" };
  }
  return { next: null, reason: "TRANSPORT_999_NOT_APPLICABLE" };
}

/** Dispatches by acknowledgment kind (999 = transport; 277CA = claim adjudication). */
export function nextStatusFromAcknowledgment(
  kind: "999" | "277CA",
  from: ClaimSubmissionStatus,
  payload: { transportAccept?: boolean; claimOutcome?: ClaimAckOutcome }
): { next: ClaimSubmissionStatus | null; reason: SubmissionTransitionReasonCode } {
  if (kind === "999") {
    if (payload.transportAccept === undefined) {
      return { next: null, reason: "TRANSPORT_999_NOT_APPLICABLE" };
    }
    return nextStatusFrom999Transport(from, payload.transportAccept);
  }
  if (!payload.claimOutcome) {
    return { next: null, reason: "ACK_PARSE_INCONCLUSIVE" };
  }
  return nextStatusFrom277CA(from, payload.claimOutcome);
}
