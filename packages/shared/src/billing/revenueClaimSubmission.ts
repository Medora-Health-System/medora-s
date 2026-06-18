export const CLAIM_SUBMISSION_WORKSPACE_QUEUE = {
  READY_TO_SEND: "READY_TO_SEND",
  SENT: "SENT",
  ACK_PENDING: "ACK_PENDING",
  ACCEPTED: "ACCEPTED",
  REJECTED: "REJECTED",
  NEEDS_CORRECTION: "NEEDS_CORRECTION",
} as const;

export type ClaimSubmissionWorkspaceQueue =
  (typeof CLAIM_SUBMISSION_WORKSPACE_QUEUE)[keyof typeof CLAIM_SUBMISSION_WORKSPACE_QUEUE];

export type RevenueClaimSubmissionFilter = ClaimSubmissionWorkspaceQueue | "ALL";

export type RevenueClaimSubmissionCounts = Record<ClaimSubmissionWorkspaceQueue, number>;

export type RevenueClaimSubmissionRowDto = {
  encounterId: string;
  patientName: string;
  mrn: string | null;
  dateOfService: string | null;
  provider: string | null;
  claimId: string;
  payer: string | null;
  submissionStatus: string;
  submittedAt: string | null;
  ackStatus: string | null;
  lastUpdatedAt: string;
  queue: ClaimSubmissionWorkspaceQueue;
  ledgerHref: string;
  claimHref: string;
};

export type RevenueClaimSubmissionResponse = {
  rows: RevenueClaimSubmissionRowDto[];
  total: number;
  limit: number;
  offset: number;
  counts: RevenueClaimSubmissionCounts;
};

export const REVENUE_CLAIM_SUBMISSION_DEFAULT_LIMIT = 100;
export const REVENUE_CLAIM_SUBMISSION_MAX_LIMIT = 200;

const WORKSPACE_STATUS_SET = new Set<string>(Object.values(CLAIM_SUBMISSION_WORKSPACE_QUEUE));

const EXCLUDED_PRE_WORKSPACE_STATUSES = new Set(["DRAFT", "GENERATED", "CANCELLED"]);

/**
 * Maps a persisted ClaimSubmission.status into the operational submission workspace queue.
 * Pre-submission and cancelled rows are excluded (null).
 */
export function resolveClaimSubmissionWorkspaceQueue(
  submissionStatus: string
): ClaimSubmissionWorkspaceQueue | null {
  const normalized = submissionStatus.trim().toUpperCase();
  if (EXCLUDED_PRE_WORKSPACE_STATUSES.has(normalized)) return null;
  if (WORKSPACE_STATUS_SET.has(normalized)) {
    return normalized as ClaimSubmissionWorkspaceQueue;
  }
  return null;
}

export function buildRevenueClaimSubmissionRowDto(input: {
  encounterId: string;
  patientName: string;
  mrn: string | null;
  dateOfService: string | null;
  provider: string | null;
  claimId: string;
  payer: string | null;
  submissionStatus: string;
  submittedAt: string | null;
  ackStatus: string | null;
  lastUpdatedAt: string;
}): RevenueClaimSubmissionRowDto | null {
  const queue = resolveClaimSubmissionWorkspaceQueue(input.submissionStatus);
  if (!queue) return null;
  const encodedEncounter = encodeURIComponent(input.encounterId);
  const encodedClaim = encodeURIComponent(input.claimId);
  return {
    ...input,
    queue,
    ledgerHref: `/app/billing/encounters/${encodedEncounter}`,
    claimHref: `/app/billing/encounters/${encodedEncounter}?claimSubmission=${encodedClaim}`,
  };
}

export function computeRevenueClaimSubmissionCounts(
  rows: readonly Pick<RevenueClaimSubmissionRowDto, "queue">[]
): RevenueClaimSubmissionCounts {
  const counts: RevenueClaimSubmissionCounts = {
    READY_TO_SEND: 0,
    SENT: 0,
    ACK_PENDING: 0,
    ACCEPTED: 0,
    REJECTED: 0,
    NEEDS_CORRECTION: 0,
  };
  for (const row of rows) {
    counts[row.queue] += 1;
  }
  return counts;
}

export function filterRevenueClaimSubmissionRows(
  rows: readonly RevenueClaimSubmissionRowDto[],
  queue: RevenueClaimSubmissionFilter
): RevenueClaimSubmissionRowDto[] {
  if (queue === "ALL") return [...rows];
  return rows.filter((row) => row.queue === queue);
}

export function searchRevenueClaimSubmissionRows(
  rows: readonly RevenueClaimSubmissionRowDto[],
  search: string
): RevenueClaimSubmissionRowDto[] {
  const needle = search.trim().toLowerCase();
  if (!needle) return [...rows];
  return rows.filter((row) => {
    const haystack = [row.patientName, row.mrn ?? "", row.claimId, row.payer ?? ""]
      .join(" ")
      .toLowerCase();
    return haystack.includes(needle);
  });
}
