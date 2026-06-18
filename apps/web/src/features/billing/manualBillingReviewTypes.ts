export type BillingReadinessStatus = "candidate_only" | "pending_license" | "missing";
export type BillingReviewCategory = "LAB" | "IMAGING" | "MEDICATION" | "CARE";
export type BillingReviewDecisionStatus = "APPROVED" | "NEEDS_INFO" | "DO_NOT_BILL";

export type BillingReviewDecision = {
  id: string;
  orderItemId: string;
  decision: BillingReviewDecisionStatus;
  notes: string | null;
  reviewerId: string;
  reviewerName: string | null;
  reviewedAt: string;
  billingEventId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type BillingReviewDecisionAuditEntry = {
  id: string;
  createdAt: string;
  action: string;
  userId: string | null;
  actorDisplayName: string | null;
  decision: BillingReviewDecisionStatus | null;
  hasNotes: boolean | null;
  billingEventId: string | null;
  source?: string | null;
  bulkReason?: string | null;
};

export type ManualReviewRow = {
  encounterId: string;
  patientId: string;
  patientName: string;
  orderItemId: string;
  medoraCode: string;
  category: BillingReviewCategory;
  displayName: string;
  billingStatus: BillingReadinessStatus;
  reason: string;
  createdAt: string;
  evidenceSource?: string | null;
  reviewAnchorType?: "ORDER_ITEM" | "PROCEDURE_DOCUMENTED";
  procedureClinicalEventId?: string | null;
  latestDecision: BillingReviewDecision | null;
  decisionAuditTrail: BillingReviewDecisionAuditEntry[];
};

export type ManualReviewCategoryFilter = "ALL" | BillingReviewCategory;

export type ManualBillingReviewBulkDecisionResponse = {
  requested: number;
  approved: number;
  skipped: number;
  failed: number;
  results: Array<{
    orderItemId: string;
    status: "approved" | "skipped" | "failed";
    error?: string;
  }>;
};
