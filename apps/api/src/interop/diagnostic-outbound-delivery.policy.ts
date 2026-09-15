import {
  DIAGNOSTIC_OUTBOUND_RETRY_POLICY,
  type DiagnosticOutboundDeliveryState,
} from "./diagnostic-outbound-order.contracts";

export type DiagnosticDeliveryDecision = {
  state: DiagnosticOutboundDeliveryState;
  retryAfterSeconds?: number;
};

export function classifyDiagnosticDeliveryResponse(input: {
  attemptNumber: number;
  statusCode?: number;
  networkFailure?: boolean;
}): DiagnosticDeliveryDecision {
  if (input.attemptNumber < 1) throw new Error("attemptNumber must be >= 1");

  const retryable = Boolean(input.networkFailure) ||
    (typeof input.statusCode === "number" &&
      (DIAGNOSTIC_OUTBOUND_RETRY_POLICY.retryableHttpStatuses as readonly number[]).includes(input.statusCode));

  if (retryable) {
    if (input.attemptNumber >= DIAGNOSTIC_OUTBOUND_RETRY_POLICY.maxAttempts) {
      return { state: "dead_lettered" };
    }
    const exponential = DIAGNOSTIC_OUTBOUND_RETRY_POLICY.initialBackoffSeconds * 2 ** (input.attemptNumber - 1);
    return {
      state: "retryable_failure",
      retryAfterSeconds: Math.min(exponential, DIAGNOSTIC_OUTBOUND_RETRY_POLICY.maxBackoffSeconds),
    };
  }

  if (typeof input.statusCode === "number" && input.statusCode >= 200 && input.statusCode < 300) {
    return { state: "acknowledged" };
  }

  return { state: "permanent_failure" };
}
