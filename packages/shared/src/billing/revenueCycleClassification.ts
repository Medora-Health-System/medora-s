export const REVENUE_CYCLE_QUEUE = {
  READY_FOR_BILLING: "READY_FOR_BILLING",
  BILLING_DEFICIENCY: "BILLING_DEFICIENCY",
  CODING_REVIEW: "CODING_REVIEW",
  CLAIM_SUBMITTED: "CLAIM_SUBMITTED",
  CLAIM_PAID: "CLAIM_PAID",
} as const;

export type RevenueCycleQueueView =
  (typeof REVENUE_CYCLE_QUEUE)[keyof typeof REVENUE_CYCLE_QUEUE];

export type RevenueCycleClaimStatus = "NOT_SUBMITTED" | "SUBMITTED" | "PAID" | "UNKNOWN";

export type RevenueCyclePaymentStatus = "NOT_POSTED" | "POSTED" | "UNKNOWN";

export type RevenueCycleClassificationInput = {
  billingReady: boolean;
  codingReady: boolean;
  claimStatus?: RevenueCycleClaimStatus | null;
  paymentStatus?: RevenueCyclePaymentStatus | null;
};

function isClaimSubmitted(claimStatus: RevenueCycleClaimStatus | null | undefined): boolean {
  return claimStatus === "SUBMITTED" || claimStatus === "PAID";
}

function isPaymentPosted(paymentStatus: RevenueCyclePaymentStatus | null | undefined): boolean {
  return paymentStatus === "POSTED";
}

/**
 * Deterministic revenue-cycle queue classification.
 * Priority: paid → submitted → billing deficiency → coding review → ready for billing.
 */
export function resolveRevenueCycleQueue(
  input: RevenueCycleClassificationInput
): RevenueCycleQueueView {
  if (isPaymentPosted(input.paymentStatus) || input.claimStatus === "PAID") {
    return REVENUE_CYCLE_QUEUE.CLAIM_PAID;
  }
  if (isClaimSubmitted(input.claimStatus)) {
    return REVENUE_CYCLE_QUEUE.CLAIM_SUBMITTED;
  }
  if (!input.billingReady) {
    return REVENUE_CYCLE_QUEUE.BILLING_DEFICIENCY;
  }
  if (!input.codingReady) {
    return REVENUE_CYCLE_QUEUE.CODING_REVIEW;
  }
  return REVENUE_CYCLE_QUEUE.READY_FOR_BILLING;
}
