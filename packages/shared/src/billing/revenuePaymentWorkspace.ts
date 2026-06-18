export const REVENUE_PAYMENT_QUEUE = {
  PAYMENT_PENDING: "PAYMENT_PENDING",
  PAYMENT_RECEIVED: "PAYMENT_RECEIVED",
  UNDERPAID: "UNDERPAID",
  DENIED: "DENIED",
  UNAPPLIED_PAYMENT: "UNAPPLIED_PAYMENT",
  RECONCILIATION_REQUIRED: "RECONCILIATION_REQUIRED",
} as const;

export type RevenuePaymentQueue =
  (typeof REVENUE_PAYMENT_QUEUE)[keyof typeof REVENUE_PAYMENT_QUEUE];

export type RevenuePaymentFilter = RevenuePaymentQueue | "ALL";

export type RevenuePaymentReconciliationStatus =
  | "BALANCED"
  | "VARIANCE_FOUND"
  | "NEEDS_REVIEW";

export type RevenuePaymentCounts = Record<RevenuePaymentQueue, number>;

export type RevenuePaymentRowDto = {
  encounterId: string;
  patientName: string;
  mrn: string | null;
  claimId: string;
  payer: string | null;
  expectedAmount: number | null;
  paidAmount: number | null;
  variance: number | null;
  submissionStatus: string;
  queue: RevenuePaymentQueue;
  denialCode: string | null;
  denialDescription: string | null;
  correctionRecommended: string | null;
  reconciliationStatus: RevenuePaymentReconciliationStatus;
  ledgerHref: string;
  auditHref: string;
};

export type RevenuePaymentResponse = {
  rows: RevenuePaymentRowDto[];
  total: number;
  limit: number;
  offset: number;
  counts: RevenuePaymentCounts;
};

export const REVENUE_PAYMENT_DEFAULT_LIMIT = 100;
export const REVENUE_PAYMENT_MAX_LIMIT = 200;

const PAYMENT_WORKSPACE_STATUSES = new Set([
  "SENT",
  "ACK_PENDING",
  "ACCEPTED",
  "REJECTED",
  "NEEDS_CORRECTION",
]);

const DENIAL_GUIDANCE: Record<string, string> = {
  CLAIM_REJECTED: "Review payer rejection and correct claim data before resubmitting.",
  TRANSPORT_REJECT: "Resolve clearinghouse transport errors before resubmitting.",
  SUBSCRIBER_MISMATCH: "Verify subscriber demographics and member identifier.",
  INVALID_PAYER_ID: "Correct payer identifier on patient coverage.",
  MISSING_DIAGNOSIS: "Add required diagnosis codes to the encounter.",
  NEEDS_CORRECTION: "Apply payer-requested corrections before resubmitting.",
};

export type RevenuePaymentProjectionInput = {
  encounterId: string;
  patientName: string;
  mrn: string | null;
  claimId: string;
  payer: string | null;
  submissionStatus: string;
  expectedAmount: number | null;
  paidAmountHint: number | null;
  denialCode: string | null;
  denialDescription: string | null;
};

function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

function resolvePaidAmount(input: RevenuePaymentProjectionInput): number | null {
  const status = input.submissionStatus.trim().toUpperCase();
  if (input.paidAmountHint != null) return roundCurrency(input.paidAmountHint);
  if (status === "REJECTED") return 0;
  if (status === "SENT" || status === "ACK_PENDING") return null;
  if (status === "ACCEPTED") {
    return input.expectedAmount != null ? roundCurrency(input.expectedAmount) : null;
  }
  if (status === "NEEDS_CORRECTION") return 0;
  return null;
}

function resolveVariance(expected: number | null, paid: number | null): number | null {
  if (expected == null || paid == null) return null;
  return roundCurrency(expected - paid);
}

export function resolveRevenuePaymentCorrectionGuidance(
  code: string | null | undefined
): string | null {
  if (!code?.trim()) return null;
  const normalized = code.trim();
  if (DENIAL_GUIDANCE[normalized]) return DENIAL_GUIDANCE[normalized]!;
  const upper = normalized.toUpperCase();
  for (const [key, value] of Object.entries(DENIAL_GUIDANCE)) {
    if (key.toUpperCase() === upper) return value;
  }
  if (upper.includes("DENIED") || upper.includes("REJECT")) {
    return DENIAL_GUIDANCE.CLAIM_REJECTED ?? null;
  }
  return null;
}

export function resolveRevenuePaymentReconciliationStatus(input: {
  submissionStatus: string;
  expectedAmount: number | null;
  variance: number | null;
}): RevenuePaymentReconciliationStatus {
  const status = input.submissionStatus.trim().toUpperCase();
  if (status === "NEEDS_CORRECTION" || status === "REJECTED") return "NEEDS_REVIEW";
  if (input.variance != null && Math.abs(input.variance) > 0.009) return "VARIANCE_FOUND";
  if (status === "ACCEPTED") return "BALANCED";
  if (status === "SENT" || status === "ACK_PENDING") return "NEEDS_REVIEW";
  return "NEEDS_REVIEW";
}

/**
 * Classifies a claim into a payment workspace queue using submission status and amounts.
 * Pre-payment submission states are excluded (null).
 */
export function resolveRevenuePaymentQueue(input: {
  submissionStatus: string;
  expectedAmount: number | null;
  paidAmount: number | null;
}): RevenuePaymentQueue | null {
  const status = input.submissionStatus.trim().toUpperCase();
  if (!PAYMENT_WORKSPACE_STATUSES.has(status)) return null;

  if (status === "REJECTED") return REVENUE_PAYMENT_QUEUE.DENIED;
  if (status === "NEEDS_CORRECTION") return REVENUE_PAYMENT_QUEUE.RECONCILIATION_REQUIRED;
  if (status === "SENT" || status === "ACK_PENDING") return REVENUE_PAYMENT_QUEUE.PAYMENT_PENDING;

  if (status === "ACCEPTED") {
    if (input.paidAmount != null && input.paidAmount > 0) {
      if ((input.expectedAmount ?? 0) <= 0) {
        return REVENUE_PAYMENT_QUEUE.UNAPPLIED_PAYMENT;
      }
      if (input.expectedAmount != null && input.paidAmount + 0.009 < input.expectedAmount) {
        return REVENUE_PAYMENT_QUEUE.UNDERPAID;
      }
    }
    return REVENUE_PAYMENT_QUEUE.PAYMENT_RECEIVED;
  }

  return null;
}

export function buildRevenuePaymentProjection(
  input: RevenuePaymentProjectionInput
): RevenuePaymentRowDto | null {
  const queue = resolveRevenuePaymentQueue({
    submissionStatus: input.submissionStatus,
    expectedAmount: input.expectedAmount,
    paidAmount: resolvePaidAmount(input),
  });
  if (!queue) return null;

  const paidAmount = resolvePaidAmount(input);
  const variance = resolveVariance(input.expectedAmount, paidAmount);
  const correctionRecommended =
    resolveRevenuePaymentCorrectionGuidance(input.denialCode) ??
    (input.submissionStatus === "NEEDS_CORRECTION"
      ? DENIAL_GUIDANCE.NEEDS_CORRECTION ?? null
      : null);

  const encodedEncounter = encodeURIComponent(input.encounterId);
  const encodedClaim = encodeURIComponent(input.claimId);

  return {
    encounterId: input.encounterId,
    patientName: input.patientName,
    mrn: input.mrn,
    claimId: input.claimId,
    payer: input.payer,
    expectedAmount: input.expectedAmount,
    paidAmount,
    variance,
    submissionStatus: input.submissionStatus,
    queue,
    denialCode: input.denialCode,
    denialDescription: input.denialDescription,
    correctionRecommended,
    reconciliationStatus: resolveRevenuePaymentReconciliationStatus({
      submissionStatus: input.submissionStatus,
      expectedAmount: input.expectedAmount,
      variance,
    }),
    ledgerHref: `/app/billing/encounters/${encodedEncounter}`,
    auditHref: `/app/admin/revenue-cycle/claims/${encodedClaim}`,
  };
}

export function computeRevenuePaymentCounts(
  rows: readonly Pick<RevenuePaymentRowDto, "queue">[]
): RevenuePaymentCounts {
  const counts: RevenuePaymentCounts = {
    PAYMENT_PENDING: 0,
    PAYMENT_RECEIVED: 0,
    UNDERPAID: 0,
    DENIED: 0,
    UNAPPLIED_PAYMENT: 0,
    RECONCILIATION_REQUIRED: 0,
  };
  for (const row of rows) {
    counts[row.queue] += 1;
  }
  return counts;
}

export function filterRevenuePaymentRows(
  rows: readonly RevenuePaymentRowDto[],
  queue: RevenuePaymentFilter
): RevenuePaymentRowDto[] {
  if (queue === "ALL") return [...rows];
  return rows.filter((row) => row.queue === queue);
}

export function searchRevenuePaymentRows(
  rows: readonly RevenuePaymentRowDto[],
  search: string
): RevenuePaymentRowDto[] {
  const needle = search.trim().toLowerCase();
  if (!needle) return [...rows];
  return rows.filter((row) => {
    const haystack = [
      row.patientName,
      row.mrn ?? "",
      row.claimId,
      row.payer ?? "",
      row.denialCode ?? "",
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(needle);
  });
}
