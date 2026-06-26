import type { AuthMeSessionResult } from "@/lib/authSessionMe";

/** Returns true when this loadSession invocation is still the latest. */
export function isLatestLoadSessionRequest(
  requestSeq: number,
  latestSeq: number
): boolean {
  return requestSeq === latestSeq;
}

export function beginLoadSessionRequest(seqRef: { current: number }): number {
  seqRef.current += 1;
  return seqRef.current;
}

export type AuthenticatedSessionSnapshot = {
  sessionPhase: string;
  user: unknown;
  facilities: unknown[];
  activeFacility: string;
};

/** Stale auth/me results must not override a newer loadSession invocation. */
export function shouldIgnoreStaleAuthMeResult(input: {
  requestSeq: number;
  latestSeq: number;
  result: Pick<AuthMeSessionResult, "ok" | "failureKind" | "superseded">;
}): boolean {
  if (input.result.superseded || input.result.failureKind === "superseded") return true;
  return !isLatestLoadSessionRequest(input.requestSeq, input.latestSeq);
}

/** @deprecated Use shouldIgnoreStaleAuthMeResult — kept for regression tests. */
export function shouldIgnoreStaleUnauthenticatedResult(input: {
  requestSeq: number;
  latestSeq: number;
  result: Pick<AuthMeSessionResult, "ok" | "failureKind">;
  current: AuthenticatedSessionSnapshot;
}): boolean {
  if (input.result.ok) return false;
  if (input.result.failureKind !== "unauthenticated") return false;
  return !isLatestLoadSessionRequest(input.requestSeq, input.latestSeq);
}

export type ClearedAuthenticatedSessionState = {
  user: null;
  facilities: [];
  activeFacility: "";
  authRecoveryMessage: null;
  sessionAccessTtlSec: null;
};

export function clearedAuthenticatedSessionState(): ClearedAuthenticatedSessionState {
  return {
    user: null,
    facilities: [],
    activeFacility: "",
    authRecoveryMessage: null,
    sessionAccessTtlSec: null,
  };
}
