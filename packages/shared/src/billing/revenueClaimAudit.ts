export const REVENUE_CLAIM_AUDIT_STATUS = {
  REVIEW_REQUIRED: "REVIEW_REQUIRED",
  READY_FOR_RESUBMISSION: "READY_FOR_RESUBMISSION",
  ACCEPTED: "ACCEPTED",
  PENDING_ACK: "PENDING_ACK",
  INFO_ONLY: "INFO_ONLY",
} as const;

export type RevenueClaimAuditStatus =
  (typeof REVENUE_CLAIM_AUDIT_STATUS)[keyof typeof REVENUE_CLAIM_AUDIT_STATUS];

export type RevenueClaimAuditSeverity = "critical" | "warning" | "success" | "info";

export type RevenueClaimAuditTimelinePhase =
  | "CLAIM_CREATED"
  | "GENERATED"
  | "READY_TO_SEND"
  | "SENT"
  | "ACK_PENDING"
  | "ACCEPTED"
  | "REJECTED"
  | "NEEDS_CORRECTION"
  | "TRANSPORT_ATTEMPT"
  | "ACKNOWLEDGMENT";

export type RevenueClaimAuditTimelineEntry = {
  at: string;
  phase: RevenueClaimAuditTimelinePhase;
  label: string;
  source: "submission" | "attempt" | "acknowledgment" | "operational_event";
  detail: string | null;
};

export type RevenueClaimAuditAttempt = {
  attemptId: string;
  transport: string;
  ok: boolean;
  failureCode: string | null;
  errorMessage: string | null;
  retryEligible: boolean;
  createdAt: string;
};

export type RevenueClaimAuditAcknowledgment = {
  ackId: string;
  kind: string;
  statusCode: string | null;
  message: string | null;
  warningCode: string | null;
  receivedAt: string;
  lifecycleReason: string | null;
};

export type RevenueClaimAuditRejection = {
  code: string | null;
  description: string | null;
  clearinghouseMessage: string | null;
  correctionGuidance: string | null;
  occurredAt: string;
};

export type RevenueClaimAuditSummaryCounts = {
  accepted: number;
  rejected: number;
  needsCorrection: number;
  pendingAck: number;
};

export type RevenueClaimAuditDto = {
  claim: {
    claimId: string;
    encounterId: string;
    claimType: string;
    submissionStatus: string;
    claimAmount: number | null;
    submittedAt: string | null;
    createdAt: string;
    updatedAt: string;
    externalReference: string | null;
  };
  patient: {
    patientId: string;
    patientName: string;
    mrn: string | null;
  };
  provider: {
    providerId: string | null;
    providerName: string | null;
  };
  payer: {
    payerName: string | null;
    memberId: string | null;
  };
  auditStatus: RevenueClaimAuditStatus;
  auditSeverity: RevenueClaimAuditSeverity;
  submissionHistory: RevenueClaimAuditTimelineEntry[];
  attemptHistory: RevenueClaimAuditAttempt[];
  acknowledgmentHistory: RevenueClaimAuditAcknowledgment[];
  rejectionHistory: RevenueClaimAuditRejection[];
  correctionNeeded: boolean;
  timeline: RevenueClaimAuditTimelineEntry[];
  facilitySummary: RevenueClaimAuditSummaryCounts;
  ledgerHref: string;
  submissionWorkspaceHref: string;
};

const STATUS_PHASE_MAP: Record<string, RevenueClaimAuditTimelinePhase> = {
  DRAFT: "CLAIM_CREATED",
  GENERATED: "GENERATED",
  READY_TO_SEND: "READY_TO_SEND",
  SENT: "SENT",
  ACK_PENDING: "ACK_PENDING",
  ACCEPTED: "ACCEPTED",
  REJECTED: "REJECTED",
  NEEDS_CORRECTION: "NEEDS_CORRECTION",
};

const CORRECTION_GUIDANCE: Record<string, string> = {
  MISSING_PRIMARY_COVERAGE: "Verify subscriber and primary payer coverage on the patient chart.",
  MULTIPLE_PRIMARY_COVERAGE: "Resolve duplicate primary coverage before resubmitting.",
  MISSING_DIAGNOSIS: "Add an active diagnosis code to the encounter before resubmitting.",
  no_diagnosis_documented: "Document at least one active diagnosis on the encounter.",
  INVALID_PAYER_ID: "Correct the payer identifier on patient insurance coverage.",
  SUBSCRIBER_MISMATCH: "Verify subscriber name, member ID, and relation to subscriber.",
  CLAIM_REJECTED: "Review clearinghouse rejection details and correct claim data before resubmitting.",
  NEEDS_CORRECTION: "Apply payer-requested corrections before resubmitting.",
  TRANSPORT_REJECT: "Fix transport or envelope errors reported in the 999 acknowledgment.",
  ACK_PARSE_INCONCLUSIVE: "Have billing staff review the raw acknowledgment with clearinghouse support.",
};

export function resolveRevenueClaimAuditStatus(
  submissionStatus: string
): RevenueClaimAuditStatus {
  const status = submissionStatus.trim().toUpperCase();
  if (status === "ACCEPTED") return REVENUE_CLAIM_AUDIT_STATUS.ACCEPTED;
  if (status === "SENT" || status === "ACK_PENDING") {
    return REVENUE_CLAIM_AUDIT_STATUS.PENDING_ACK;
  }
  if (status === "NEEDS_CORRECTION") {
    return REVENUE_CLAIM_AUDIT_STATUS.READY_FOR_RESUBMISSION;
  }
  if (status === "REJECTED") return REVENUE_CLAIM_AUDIT_STATUS.REVIEW_REQUIRED;
  return REVENUE_CLAIM_AUDIT_STATUS.INFO_ONLY;
}

export function resolveRevenueClaimAuditSeverity(
  auditStatus: RevenueClaimAuditStatus
): RevenueClaimAuditSeverity {
  if (auditStatus === REVENUE_CLAIM_AUDIT_STATUS.ACCEPTED) return "success";
  if (
    auditStatus === REVENUE_CLAIM_AUDIT_STATUS.REVIEW_REQUIRED ||
    auditStatus === REVENUE_CLAIM_AUDIT_STATUS.READY_FOR_RESUBMISSION
  ) {
    return "critical";
  }
  if (auditStatus === REVENUE_CLAIM_AUDIT_STATUS.PENDING_ACK) return "warning";
  return "info";
}

export function resolveRevenueClaimCorrectionGuidance(code: string | null | undefined): string | null {
  if (!code?.trim()) return null;
  const normalized = code.trim();
  if (CORRECTION_GUIDANCE[normalized]) return CORRECTION_GUIDANCE[normalized]!;
  const upper = normalized.toUpperCase();
  for (const [key, value] of Object.entries(CORRECTION_GUIDANCE)) {
    if (key.toUpperCase() === upper) return value;
  }
  if (upper.includes("DIAGNOSIS")) {
    return CORRECTION_GUIDANCE.MISSING_DIAGNOSIS ?? null;
  }
  if (upper.includes("SUBSCRIBER")) {
    return CORRECTION_GUIDANCE.SUBSCRIBER_MISMATCH ?? null;
  }
  if (upper.includes("PAYER")) {
    return CORRECTION_GUIDANCE.INVALID_PAYER_ID ?? null;
  }
  return null;
}

export function sortRevenueClaimAuditTimelineNewestFirst(
  entries: readonly RevenueClaimAuditTimelineEntry[]
): RevenueClaimAuditTimelineEntry[] {
  return [...entries].sort((a, b) => b.at.localeCompare(a.at));
}

export function buildRevenueClaimAudit(input: {
  claimId: string;
  encounterId: string;
  claimType: string;
  submissionStatus: string;
  claimAmount: number | null;
  submittedAt: string | null;
  createdAt: string;
  updatedAt: string;
  externalReference: string | null;
  patientId: string;
  patientName: string;
  mrn: string | null;
  providerId: string | null;
  providerName: string | null;
  payerName: string | null;
  memberId: string | null;
  statusTransitions: readonly {
    at: string;
    statusAfter: string;
    message?: string | null;
  }[];
  attempts: readonly RevenueClaimAuditAttempt[];
  acknowledgments: readonly RevenueClaimAuditAcknowledgment[];
  rejections: readonly RevenueClaimAuditRejection[];
  facilitySummary: RevenueClaimAuditSummaryCounts;
}): RevenueClaimAuditDto {
  const auditStatus = resolveRevenueClaimAuditStatus(input.submissionStatus);
  const auditSeverity = resolveRevenueClaimAuditSeverity(auditStatus);
  const encodedEncounter = encodeURIComponent(input.encounterId);
  const encodedClaim = encodeURIComponent(input.claimId);

  const submissionHistory: RevenueClaimAuditTimelineEntry[] = [
    {
      at: input.createdAt,
      phase: "CLAIM_CREATED",
      label: "Claim Created",
      source: "submission",
      detail: null,
    },
    ...input.statusTransitions.map((transition) => ({
      at: transition.at,
      phase: STATUS_PHASE_MAP[transition.statusAfter] ?? "ACKNOWLEDGMENT",
      label: transition.statusAfter.replaceAll("_", " "),
      source: "operational_event" as const,
      detail: transition.message ?? null,
    })),
  ];

  const attemptHistory = [...input.attempts].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const acknowledgmentHistory = [...input.acknowledgments].sort((a, b) =>
    b.receivedAt.localeCompare(a.receivedAt)
  );

  const attemptTimeline: RevenueClaimAuditTimelineEntry[] = attemptHistory.map((attempt) => ({
    at: attempt.createdAt,
    phase: "TRANSPORT_ATTEMPT",
    label: attempt.ok ? `Sent (${attempt.transport})` : `Send failed (${attempt.transport})`,
    source: "attempt",
    detail: attempt.errorMessage ?? attempt.failureCode,
  }));

  const ackTimeline: RevenueClaimAuditTimelineEntry[] = acknowledgmentHistory.map((ack) => ({
    at: ack.receivedAt,
    phase: "ACKNOWLEDGMENT",
    label: `${ack.kind} · ${ack.statusCode ?? "—"}`,
    source: "acknowledgment",
    detail: ack.message ?? ack.lifecycleReason,
  }));

  const timeline = sortRevenueClaimAuditTimelineNewestFirst([
    ...submissionHistory,
    ...attemptTimeline,
    ...ackTimeline,
  ]);

  const rejectionHistory = [...input.rejections].sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
  const correctionNeeded =
    input.submissionStatus === "NEEDS_CORRECTION" || input.submissionStatus === "REJECTED";

  return {
    claim: {
      claimId: input.claimId,
      encounterId: input.encounterId,
      claimType: input.claimType,
      submissionStatus: input.submissionStatus,
      claimAmount: input.claimAmount,
      submittedAt: input.submittedAt,
      createdAt: input.createdAt,
      updatedAt: input.updatedAt,
      externalReference: input.externalReference,
    },
    patient: {
      patientId: input.patientId,
      patientName: input.patientName,
      mrn: input.mrn,
    },
    provider: {
      providerId: input.providerId,
      providerName: input.providerName,
    },
    payer: {
      payerName: input.payerName,
      memberId: input.memberId,
    },
    auditStatus,
    auditSeverity,
    submissionHistory: sortRevenueClaimAuditTimelineNewestFirst(submissionHistory),
    attemptHistory,
    acknowledgmentHistory,
    rejectionHistory,
    correctionNeeded,
    timeline,
    facilitySummary: input.facilitySummary,
    ledgerHref: `/app/billing/encounters/${encodedEncounter}`,
    submissionWorkspaceHref: "/app/admin/revenue-cycle/claims",
  };
}
